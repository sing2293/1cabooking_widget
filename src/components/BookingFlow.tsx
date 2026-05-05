import { useState, useEffect, useRef } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import StepIndicator from './StepIndicator';
import ServiceSummary from './ServiceSummary';
import Step1, { type Step1Selection } from './step1/Step1';
import Step2 from './step2/Step2';
import Step3, { type Step3Data, EMPTY_STEP3 } from './step3/Step3';
import Step4, { type Step4Data, EMPTY_STEP4, type DayAvailability, type RawDay, mergeSlots, toISODate } from './step4/Step4';
import Step5 from './step5/Step5';
import { EXTRAS } from '../data/extras';
import { PROVINCE_TAXES, UNIT_LOCATIONS, LAST_CLEANING, RENOVATIONS, SPECIAL_REQUESTS, HOW_DID_YOU_HEAR } from '../data/step3Options';
import { captureTrackingData, generateEventId } from '../utils/tracking';
import { track } from '@vercel/analytics/react';
import { brand } from '../brand';
import type { CapturedLead } from './LeadForm';

const BACKEND_URL = '';
const API_SECRET = (import.meta.env.VITE_API_SECRET as string | undefined) ?? '';
const N8N_WEBHOOK = (import.meta.env.VITE_N8N_WEBHOOK as string | undefined) ?? '';

const EMPTY_STEP1: Step1Selection = {
  isValid: false,
  packageName: null,
  packageId: null,
  categoryId: null,
  basePrice: 0,
  includes: [],
  ventMode: 'arrival',
  ventCount: 0,
  subtotal: 0,
  summaryLines: [],
};

interface Props {
  lead: CapturedLead;
}

export default function BookingFlow({ lead }: Props) {
  const { lang } = useLang();
  const [currentStep, setCurrentStep] = useState(1);

  const [step1Data, setStep1DataRaw] = useState<Step1Selection>(EMPTY_STEP1);
  const [selectedExtras, setSelectedExtras] = useState<Record<string, number>>({});
  const [carpetTiers, setCarpetTiers] = useState<Record<string, 'clean' | 'protect'>>({});
  const [dryerVentLocations, setDryerVentLocations] = useState<Record<string, number>>({});

  const setStep1Data = (data: Step1Selection) => {
    if (data.categoryId !== step1Data.categoryId) {
      setSelectedExtras({});
      setCarpetTiers({});
      setDryerVentLocations({});
    }
    setStep1DataRaw(data);
  };

  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount] = useState(0);

  /* Step 3 prefilled with what the lead form already collected */
  const [step3Data, setStep3Data] = useState<Step3Data>(() => ({
    ...EMPTY_STEP3,
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    phone: lead.phone,
    streetAddress: lead.formattedAddress,
    city: lead.city,
    stateCode: lead.stateCode,
    zip: lead.zip,
    province: lead.province,
    specialNotes: lead.message ?? '',
    agreementChecked: true, // already agreed in the lead form
  }));
  const [step4Data, setStep4Data] = useState<Step4Data>(EMPTY_STEP4);

  const region: 'ottawa' | 'montreal' | 'bkc' = lead.region;
  const effectiveRegion = step1Data.categoryId === 'carpet' ? 'carpet' : region;

  const [tracking] = useState(() => captureTrackingData());

  /* ── Availability prefetch ── */
  const [availDays, setAvailDays] = useState<DayAvailability[]>([]);
  const [availLoading, setAvailLoading] = useState(false);
  const [availError, setAvailError] = useState<string | null>(null);
  const [availFetched, setAvailFetched] = useState(false);

  useEffect(() => {
    setAvailFetched(false);
    setAvailDays([]);
    setAvailError(null);
  }, [step1Data.categoryId]);

  useEffect(() => {
    if (currentStep < 2 || availFetched) return;

    const blocksNeeded = (step1Data.categoryId === 'dryer-vent' || step1Data.categoryId === 'carpet') ? 1 : 2;

    setAvailFetched(true);
    setAvailLoading(true);

    const start = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + 2);

    fetch(`${BACKEND_URL}/api/availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-SECRET': API_SECRET },
      body: JSON.stringify({
        start: toISODate(start),
        end: toISODate(end),
        workStart: '08:00',
        workEnd: '16:00',
        slotStepMinutes: 60,
        region: effectiveRegion,
      }),
    })
      .then(async (r) => {
        const json = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(json?.error || json?.message || `Error ${r.status}`);
        return json;
      })
      .then((json) => {
        const rawDays: RawDay[] = json.days || [];
        const mapped: DayAvailability[] = rawDays
          .map((d) => ({ date: d.date, slots: mergeSlots(d.slots || [], blocksNeeded) }))
          .filter((d) => d.slots.length > 0)
          .filter((d) => {
            const [y, m, day] = d.date.split('-').map(Number);
            const dow = new Date(y, m - 1, day).getDay();
            return dow !== 0 && dow !== 6;
          });
        setAvailDays(mapped);
      })
      .catch((e: Error) => setAvailError(e.message))
      .finally(() => setAvailLoading(false));
  }, [currentStep, availFetched, effectiveRegion, step1Data.categoryId]);

  const [bookState, setBookState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [bookError, setBookError] = useState('');

  /* Scroll the iframe into view from the top on every step change (Next/Back). */
  const stepFirstRender = useRef(true);
  useEffect(() => {
    if (stepFirstRender.current) { stepFirstRender.current = false; return; }
    if (window.parent !== window) {
      window.parent.postMessage({ type: '1ca-widget-scroll-to-top' }, '*');
    }
  }, [currentStep]);

  const handleDryerVentLocationChange = (id: string, qty: number) => {
    setDryerVentLocations((prev) => {
      const next = { ...prev };
      if (qty === 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  };

  /* ── Totals ── */
  const dryerVentExtra = EXTRAS.find((e) => e.id === 'extra-dryer-vent');
  const dryerVentTotal = dryerVentExtra?.dryerLocations
    ? dryerVentExtra.dryerLocations.reduce((sum, loc) => sum + loc.price * (dryerVentLocations[loc.id] ?? 0), 0)
    : 0;

  const extrasTotal = Object.entries(selectedExtras).reduce((sum, [id, qty]) => {
    const extra = EXTRAS.find((e) => e.id === id);
    if (!extra) return sum;
    const tier = carpetTiers[id];
    const price = (tier === 'protect' && extra.protectPrice != null) ? extra.protectPrice : extra.bundlePrice;
    return sum + price * qty;
  }, 0) + dryerVentTotal;

  const province = step3Data.province;
  const unitLocationFee = currentStep >= 3 ? step3Data.unitLocationFee : 0;
  const parkingFee = currentStep >= 3 ? step3Data.parkingFee : 0;
  const floorFee = currentStep >= 3 ? step3Data.aboveThirdFloorFee : 0;
  const parkingFarFee = currentStep >= 3 ? step3Data.parkingFarFee : 0;
  const carpetFloorFee = currentStep >= 3 ? step3Data.carpetFloorFee : 0;
  const subtotal = step1Data.subtotal + extrasTotal + unitLocationFee + parkingFee + floorFee + parkingFarFee + carpetFloorFee - couponDiscount;
  const taxInfo = PROVINCE_TAXES[province] ?? PROVINCE_TAXES['Québec'];
  const totalTax = taxInfo.lines.reduce((s, l) => s + subtotal * l.rate, 0);

  const displayTotal = currentStep === 1 ? step1Data.subtotal : subtotal + totalTax;

  const fmt = (n: number) =>
    '$' + n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /* ── Validation ── */
  const step3Valid =
    step3Data.firstName.trim() !== '' &&
    step3Data.lastName.trim() !== '' &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(step3Data.email.trim()) &&
    step3Data.phone.replace(/\D/g, '').length === 10 &&
    step3Data.streetAddress.trim() !== '' &&
    step3Data.province !== '' &&
    step3Data.agreementChecked;

  const step4Valid = step4Data.selectedDate !== null && step4Data.selectedSlot !== null;

  const step2Valid =
    step1Data.categoryId === 'carpet'
      ? Object.values(selectedExtras).some((qty) => qty > 0)
      : true;

  const canProceed =
    currentStep === 1 ? step1Data.isValid :
    currentStep === 2 ? step2Valid :
    currentStep === 3 ? step3Valid :
    currentStep === 4 ? step4Valid :
    true;

  /* ── Notes for the calendar event ── */
  const optLabel = (opts: { value: string; label: { en: string } }[], val: string) =>
    opts.find((o) => o.value === val)?.label.en ?? val;

  const buildNotes = () => {
    const pkgName = step1Data.packageName ? (step1Data.packageName as { en: string; fr: string }).en : 'Duct Cleaning';
    const lines: string[] = [];
    lines.push(`SERVICE: ${pkgName}`);
    lines.push('');

    if (step1Data.includes.length > 0) {
      lines.push('PACKAGE INCLUDES:');
      step1Data.includes.forEach((item) => {
        const label = typeof item === 'string' ? item : (item as { en: string; fr: string }).en;
        lines.push(`  ✓ ${label}`);
      });
      lines.push('');
    }

    if (step1Data.categoryId === 'central-air' || step1Data.categoryId === 'air-exchanger') {
      if (step1Data.ventMode === 'arrival') lines.push('Vents: Count on Arrival (TBD)');
      else lines.push(`Vents: ${step1Data.ventCount}${step1Data.ventCount > 10 ? ` (${step1Data.ventCount - 10} extra × $15)` : ' (included)'}`);
      lines.push('');
    }

    step1Data.summaryLines.forEach((l) => lines.push(`  • ${l.label}: ${fmt(l.amount)}`));

    Object.entries(selectedExtras).forEach(([id, qty]) => {
      if (qty === 0) return;
      const extra = EXTRAS.find((e) => e.id === id);
      if (extra) {
        const tier = carpetTiers[id];
        const price = (tier === 'protect' && extra.protectPrice != null) ? extra.protectPrice : extra.bundlePrice;
        const tierLabel = (tier === 'protect' && extra.protectPrice != null) ? ' (Protect)' : '';
        lines.push(`  • ${extra.name.en}${tierLabel}${qty > 1 ? ` ×${qty}` : ''}: ${fmt(price * qty)}`);
      }
    });

    if (dryerVentTotal > 0) {
      dryerVentExtra?.dryerLocations?.forEach((loc) => {
        const qty = dryerVentLocations[loc.id] ?? 0;
        if (qty > 0) lines.push(`  • ${loc.label.en} ×${qty}: ${fmt(loc.price * qty)}`);
      });
    }

    if (unitLocationFee > 0) {
      const locLabel = optLabel(UNIT_LOCATIONS, step3Data.unitLocation);
      lines.push(`  • Unit Location Fee: ${fmt(unitLocationFee)} — ${locLabel}`);
    }
    if (parkingFee > 0) {
      const reasons: string[] = [];
      if (step3Data.hasParking === 'no') reasons.push('No guaranteed parking');
      if (step3Data.parkingFar === 'yes') reasons.push('Parking over 100ft from entrance');
      if (step3Data.aboveThirdFloor === 'yes') reasons.push('Above 3rd floor');
      if (step3Data.carpetFloor === 'yes') reasons.push('3rd floor or higher (TBD)');
      lines.push(`  • Portable Unit Fee: ${fmt(parkingFee)}${reasons.length ? ' — ' + reasons.join(', ') : ''}`);
    }

    lines.push('');
    lines.push(`Subtotal: ${fmt(subtotal)}`);
    taxInfo.lines.forEach((l) => lines.push(`${l.label}: ${fmt(subtotal * l.rate)}`));
    lines.push(`TOTAL: ${fmt(displayTotal)}`);

    lines.push('');
    lines.push(`Province: ${step3Data.province}`);
    if (step3Data.yearBuilt) lines.push(`Year Built: ${step3Data.yearBuilt}`);

    const isHvac = step1Data.categoryId === 'central-air' || step1Data.categoryId === 'air-exchanger';
    if (isHvac) {
      lines.push(`Unit Location: ${optLabel(UNIT_LOCATIONS, step3Data.unitLocation)}`);
      lines.push(`Parking: ${step3Data.hasParking === 'yes' ? 'Yes' : 'No'}`);
      if (step3Data.hasParking === 'yes') lines.push(`Parking Under 100ft: ${step3Data.parkingFar === 'yes' ? 'No' : 'Yes'}`);
      lines.push(`Above 3rd Floor: ${step3Data.aboveThirdFloor === 'yes' ? 'Yes' : 'No'}`);
    }

    if (step1Data.categoryId === 'carpet') {
      lines.push(`Parking: ${step3Data.hasParking === 'yes' ? 'Yes' : 'No'}`);
      if (step3Data.hasParking === 'yes') lines.push(`Parking Under 100ft: ${step3Data.parkingFar === 'yes' ? 'No (over 100ft)' : 'Yes'}`);
      lines.push(`3rd Floor or Higher: ${step3Data.carpetFloor === 'yes' ? 'Yes' : 'No'}`);
    }

    lines.push(`Special Request: ${optLabel(SPECIAL_REQUESTS, step3Data.specialRequest)}`);
    if (step3Data.howDidYouHear) lines.push(`How Did You Hear: ${optLabel(HOW_DID_YOU_HEAR, step3Data.howDidYouHear)}`);
    if (step3Data.specialNotes) lines.push(`Customer Notes: ${step3Data.specialNotes}`);

    return lines.join('\n');
  };

  /* ── Booking submit ── */
  const handleConfirmBooking = async () => {
    if (bookState === 'loading') return;
    setBookState('loading');
    setBookError('');

    try {
      const slot = step4Data.selectedSlot!;
      const cat = step1Data.categoryId;
      const hasDryerExtra = dryerVentTotal > 0 || (selectedExtras['extra-dryer-vent'] ?? 0) > 0;
      let jobType = 'Work';
      if (cat === 'central-air') jobType = hasDryerExtra ? 'Duct & Dryer' : 'Air Duct';
      else if (cat === 'air-exchanger') jobType = 'Air Exchanger';
      else if (cat === 'dryer-vent') jobType = 'Dryer Vent';
      else if (cat === 'wall-unit') jobType = 'Wall Mount A/C';
      else if (cat === 'carpet') jobType = 'Carpet';
      else if (cat === 'specialty') jobType = 'Work';

      const bookBody = {
        region: region || effectiveRegion,
        start: slot.start,
        end: slot.end,
        firstName: step3Data.firstName,
        lastName: step3Data.lastName,
        phone: step3Data.phone.replace(/\D/g, ''),
        email: step3Data.email,
        address1: step3Data.streetAddress.split(',')[0].trim(),
        city: step3Data.city || '',
        state: step3Data.stateCode || '',
        zip: step3Data.zip || '',
        jobType,
        notes: buildNotes(),
      };
      const res = await fetch(`${BACKEND_URL}/api/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-SECRET': API_SECRET },
        body: JSON.stringify(bookBody),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 409 && data?.error === 'slot_taken') {
        throw new Error(
          lang === 'en'
            ? 'That slot was just taken. Please go back and choose another time.'
            : 'Ce créneau vient d\'être pris. Veuillez revenir et choisir un autre.'
        );
      }
      if (!res.ok) throw new Error(data?.error || data?.message || `Booking failed (${res.status})`);

      setBookState('done');

      const pkgEn = step1Data.packageName ? (step1Data.packageName as { en: string; fr: string }).en : 'Unknown';
      track('widget_booking_confirmed', {
        category: step1Data.categoryId || 'unknown',
        package: pkgEn,
        region: region || effectiveRegion,
        province: step3Data.province,
        total: subtotal + totalTax,
        date: step4Data.selectedDate || 'none',
        time: step4Data.selectedSlot?.label || 'none',
      });

      const leadEventId = generateEventId();

      if (N8N_WEBHOOK) {
        fetch(N8N_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: step3Data.firstName,
            lastName: step3Data.lastName,
            name: `${step3Data.firstName} ${step3Data.lastName}`,
            email: step3Data.email,
            phone: step3Data.phone,
            address: step3Data.streetAddress,
            city: step3Data.city,
            state: step3Data.stateCode,
            zip: step3Data.zip,
            province: step3Data.province,
            language: step3Data.languagePreference,
            date: step4Data.selectedDate,
            time_start: slot.start,
            time_end: slot.end,
            time_label: slot.label,
            service_category: step1Data.categoryId,
            service_package: (step1Data.packageName as Record<string, string> | null)?.en ?? '',
            vent_count: step1Data.ventCount,
            vent_mode: step1Data.ventMode,
            extras: Object.fromEntries(Object.entries(selectedExtras).filter(([, qty]) => qty > 0)),
            dryer_vent_locations: Object.fromEntries(Object.entries(dryerVentLocations).filter(([, qty]) => qty > 0)),
            year_built: step3Data.yearBuilt,
            unit_location: optLabel(UNIT_LOCATIONS, step3Data.unitLocation),
            last_cleaning: optLabel(LAST_CLEANING, step3Data.lastCleaning),
            renovations: optLabel(RENOVATIONS, step3Data.renovationsSince),
            special_request: optLabel(SPECIAL_REQUESTS, step3Data.specialRequest),
            how_did_you_hear: optLabel(HOW_DID_YOU_HEAR, step3Data.howDidYouHear),
            special_notes: step3Data.specialNotes,
            subtotal,
            tax: totalTax,
            total: subtotal + totalTax,
            coupon_discount: couponDiscount,
            notes: buildNotes(),
            region: effectiveRegion,
            source: 'widget_booking',
            booked_at: new Date().toISOString(),
            event_id: leadEventId,
            event_source_url: tracking.event_source_url,
            fbp: tracking.fbp,
            fbc: tracking.fbc,
            utm_source: tracking.utm_source,
            utm_campaign: tracking.utm_campaign,
            utm_medium: tracking.utm_medium,
            utm_content: tracking.utm_content,
            utm_term: tracking.utm_term,
            utm_id: tracking.utm_id,
          }),
        }).catch(() => {});
      }
    } catch (e: unknown) {
      setBookError((e as Error).message);
      setBookState('error');
      track('widget_booking_error', { error: (e as Error).message });
    }
  };

  const handleNext = () => {
    if (currentStep === 5) { handleConfirmBooking(); return; }
    if (canProceed) setCurrentStep((s) => s + 1);
  };

  const handleBack = () => {
    if (bookState === 'error') { setBookState('idle'); setBookError(''); }
    const prev = currentStep;
    setCurrentStep((s) => Math.max(1, s - 1));
    if (prev === 2) {
      setSelectedExtras({});
      setCarpetTiers({});
      setDryerVentLocations({});
    }
  };

  /* ── Confirmed screen ── */
  if (bookState === 'done') {
    return (
      <div className="px-4 py-12 sm:py-16">
        <div className="bg-white rounded-2xl border border-gray-100 p-8 max-w-md mx-auto text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto ring-4 ring-emerald-100">
            <Check className="w-10 h-10 text-emerald-500" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {lang === 'en' ? 'Booking Confirmed!' : 'Réservation confirmée!'}
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              {lang === 'en'
                ? 'An associate will be in touch with you regarding this booking.'
                : 'Un associé vous contactera concernant cette réservation.'}
            </p>
          </div>
          <div className="bg-slate-50 rounded-xl px-6 py-4">
            <p className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">
              {lang === 'en' ? 'Urgent question? Call us' : 'Question urgente? Appelez-nous'}
            </p>
            <a href={`tel:${brand.phoneDigits}`} className="text-xl font-bold text-blue-600 hover:text-blue-700">
              {brand.phoneDisplay}
            </a>
          </div>
        </div>
      </div>
    );
  }

  const isConfirmStep = currentStep === 5;

  return (
    <div className="px-4 sm:px-6 pt-2 pb-8">
      <div className="max-w-2xl mx-auto">
        <StepIndicator currentStep={currentStep} />

        {!isConfirmStep && currentStep > 1 && (
          <SummaryAccordion
            step={currentStep}
            step1={step1Data}
            selectedExtras={selectedExtras}
            carpetTiers={carpetTiers}
            dryerVentLocations={dryerVentLocations}
            province={province}
            unitLocationFee={unitLocationFee}
            parkingFee={parkingFee}
            floorFee={floorFee}
            parkingFarFee={parkingFarFee}
            carpetFloorFee={carpetFloorFee}
            unitLocationLabel={step3Data.unitLocation !== 'standard' ? UNIT_LOCATIONS.find(o => o.value === step3Data.unitLocation)?.label.en : undefined}
            noParking={step3Data.hasParking === 'no'}
            parkingFar={step3Data.parkingFar === 'yes'}
            aboveFloor={step3Data.aboveThirdFloor === 'yes'}
            carpetFloor={step3Data.carpetFloor === 'yes'}
            couponCode={couponCode}
            couponDiscount={couponDiscount}
            onCouponCodeChange={setCouponCode}
          />
        )}

        <div className="mt-4">
          {isConfirmStep ? (
            <Step5
              step1={step1Data}
              step3={step3Data}
              step4={step4Data}
              selectedExtras={selectedExtras}
              carpetTiers={carpetTiers}
              dryerVentLocations={dryerVentLocations}
              couponDiscount={couponDiscount}
              bookError={bookState === 'error' ? bookError : null}
            />
          ) : (
            <>
              {currentStep === 1 && <Step1 onSelectionChange={setStep1Data} region={region} />}
              {currentStep === 2 && (
                <Step2
                  selectedExtras={selectedExtras}
                  onExtrasChange={setSelectedExtras}
                  carpetTiers={carpetTiers}
                  onCarpetTierChange={(id, tier) => setCarpetTiers((prev) => ({ ...prev, [id]: tier }))}
                  dryerVentLocations={dryerVentLocations}
                  onDryerVentLocationChange={handleDryerVentLocationChange}
                  categoryId={step1Data.categoryId}
                  packageId={step1Data.packageId}
                />
              )}
              {currentStep === 3 && (
                <Step3 data={step3Data} onChange={setStep3Data} categoryId={step1Data.categoryId} />
              )}
              {currentStep === 4 && (
                <Step4 data={step4Data} onChange={setStep4Data} days={availDays} loading={availLoading} error={availError} />
              )}
            </>
          )}
        </div>

        {/* ── Inline action row (replaces sticky bottom bar) ── */}
        <div className="mt-6 flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {lang === 'en' ? 'Total' : 'Total'}
            </p>
            <p className="text-xl font-bold text-gray-900">{fmt(displayTotal)}</p>
          </div>
          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <button
                onClick={handleBack}
                className="px-4 py-2.5 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {lang === 'en' ? 'Back' : 'Retour'}
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!canProceed || bookState === 'loading'}
              className={`px-5 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-1.5 transition-colors ${
                !canProceed || bookState === 'loading'
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : isConfirmStep
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  : 'bg-blue-700 hover:bg-blue-800 text-white'
              }`}
            >
              {isConfirmStep
                ? (bookState === 'loading'
                    ? (lang === 'en' ? 'Booking…' : 'Réservation…')
                    : (lang === 'en' ? 'Confirm Booking' : 'Confirmer'))
                : (
                    <>
                      <span>{lang === 'en' ? 'Next' : 'Suivant'}</span>
                      <span>→</span>
                    </>
                  )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Collapsible "Order Summary" — replaces the sticky sidebar ── */
function SummaryAccordion(props: {
  step: number;
  step1: Step1Selection;
  selectedExtras: Record<string, number>;
  carpetTiers: Record<string, 'clean' | 'protect'>;
  dryerVentLocations: Record<string, number>;
  province: string;
  unitLocationFee: number;
  parkingFee: number;
  floorFee: number;
  parkingFarFee: number;
  carpetFloorFee: number;
  unitLocationLabel?: string;
  noParking: boolean;
  parkingFar: boolean;
  aboveFloor: boolean;
  carpetFloor: boolean;
  couponCode: string;
  couponDiscount: number;
  onCouponCodeChange: (v: string) => void;
}) {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 border border-gray-200 rounded-lg bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
      >
        <span className="text-sm font-bold text-gray-800">
          {lang === 'en' ? 'Order Summary' : 'Résumé de la commande'}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-gray-100 p-3">
          <ServiceSummary
            step={props.step}
            step1={props.step1}
            selectedExtras={props.selectedExtras}
            carpetTiers={props.carpetTiers}
            dryerVentLocations={props.dryerVentLocations}
            province={props.province}
            unitLocationFee={props.unitLocationFee}
            parkingFee={props.parkingFee}
            floorFee={props.floorFee}
            parkingFarFee={props.parkingFarFee}
            carpetFloorFee={props.carpetFloorFee}
            feeReasons={{
              unitLocation: props.unitLocationLabel,
              noParking: props.noParking,
              parkingFar: props.parkingFar,
              aboveFloor: props.aboveFloor,
              carpetFloor: props.carpetFloor,
            }}
            couponCode={props.couponCode}
            couponDiscount={props.couponDiscount}
            onCouponCodeChange={props.onCouponCodeChange}
            onCouponApply={() => {}}
          />
        </div>
      )}
    </div>
  );
}
