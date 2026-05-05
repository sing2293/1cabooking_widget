import { User, ClipboardList, Info, CheckCircle2 } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import type { Step1Selection } from '../step1/Step1';
import type { Step3Data } from '../step3/Step3';
import type { Step4Data } from '../step4/Step4';
import { EXTRAS } from '../../data/extras';
import { PROVINCE_TAXES, UNIT_LOCATIONS } from '../../data/step3Options';

interface Props {
  step1: Step1Selection;
  step3: Step3Data;
  step4: Step4Data;
  selectedExtras: Record<string, number>;
  carpetTiers: Record<string, 'clean' | 'protect'>;
  dryerVentLocations: Record<string, number>;
  couponDiscount: number;
  bookError?: string | null;
}

const fmt = (n: number) =>
  '$' + n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function formatBookingDate(dateStr: string, lang: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const result = date.toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  return result.charAt(0).toUpperCase() + result.slice(1);
}

function formatSlotTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-CA', {
    timeZone: 'America/Montreal',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).toUpperCase();
}

export default function Step5({ step1, step3, step4, selectedExtras, carpetTiers, dryerVentLocations, couponDiscount, bookError }: Props) {
  const { lang, t } = useLang();

  /* ── Price calculation (mirrors App.tsx) ── */
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

  const subtotal = step1.subtotal + extrasTotal + step3.unitLocationFee + step3.parkingFee + step3.aboveThirdFloorFee + step3.parkingFarFee + step3.carpetFloorFee - couponDiscount;
  const taxInfo = PROVINCE_TAXES[step3.province] ?? PROVINCE_TAXES['Québec'];
  const taxLines = taxInfo.lines.map((l) => ({ label: l.label, amount: subtotal * l.rate }));
  const total = subtotal + taxLines.reduce((s, l) => s + l.amount, 0);

  const slot = step4.selectedSlot!;
  const bookingDate  = formatBookingDate(step4.selectedDate!, lang);
  const arrivalStart = formatSlotTime(slot.start);
  const arrivalEnd   = formatSlotTime(slot.end);

  const selectedExtraEntries = Object.entries(selectedExtras).filter(([, qty]) => qty > 0);

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 text-center">
        {lang === 'en' ? 'Review & Confirm' : 'Réviser et confirmer'}
      </h2>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">

        {/* ── Blue appointment header ── */}
        <div className="bg-blue-700 text-white px-6 py-5 flex flex-col sm:flex-row justify-between gap-4 sm:gap-0">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-75 mb-1">
              {lang === 'en' ? 'Appointment Date' : 'Date du rendez-vous'}
            </p>
            <p className="text-lg sm:text-xl font-bold">{bookingDate}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-75 mb-1">
              {lang === 'en' ? 'Arrival Window' : "Fenêtre d'arrivée"}
            </p>
            <p className="text-lg sm:text-xl font-bold">{arrivalStart} – {arrivalEnd}</p>
          </div>
        </div>

        {/* ── Customer Details ── */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-blue-700">
              {lang === 'en' ? 'Customer Details' : 'Coordonnées'}
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-0.5">
                {lang === 'en' ? 'Full Name' : 'Nom complet'}
              </p>
              <p className="text-sm font-semibold text-gray-800">{step3.firstName} {step3.lastName}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-0.5">
                {lang === 'en' ? 'Contact' : 'Contact'}
              </p>
              <p className="text-sm text-gray-700">{step3.email}</p>
              <p className="text-sm text-gray-700">{step3.phone}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-0.5">
                {lang === 'en' ? 'Service Location' : 'Adresse du service'}
              </p>
              <p className="text-sm font-semibold text-gray-800">{step3.streetAddress}</p>
            </div>
          </div>
        </div>

        {/* ── Service Summary ── */}
        <div className="px-6 py-5">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-blue-700">
              {lang === 'en' ? 'Service Summary' : 'Résumé du service'}
            </h3>
          </div>

          <div className="space-y-2">
            {/* Standalone dryer vent summary */}
            {step1.categoryId === 'dryer-vent' && step1.summaryLines.length > 0 && (
              <>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                    {lang === 'en' ? 'Dryer Vent Cleaning' : 'Nettoyage sécheuse'}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">{fmt(step1.subtotal)}</span>
                </div>
                {step1.summaryLines.map((line, i) => (
                  <div key={i} className="flex justify-between text-xs text-gray-500 pl-2">
                    <span>{line.label}</span>
                    <span>{fmt(line.amount)}</span>
                  </div>
                ))}
              </>
            )}

            {/* Base package (hidden for carpet & standalone dryer vent) */}
            {step1.categoryId !== 'carpet' && step1.categoryId !== 'dryer-vent' && step1.packageName && (
              <>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                    {lang === 'en' ? 'Base Package' : 'Forfait de base'}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">{fmt(step1.basePrice)}</span>
                </div>
                {step1.includes.length > 0 && (
                  <div className="space-y-0.5 mt-1">
                    {step1.includes.map((item, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0 mt-0.5" />
                        <span className="text-[11px] text-gray-500 leading-snug">{t(item)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Vents (only for central-air & air-exchanger) */}
            {(step1.categoryId === 'central-air' || step1.categoryId === 'air-exchanger') && (
              <div className="flex justify-between items-baseline pl-2">
                <span className="text-xs text-gray-500">• {lang === 'en' ? 'Vents' : 'Bouches'}</span>
                {step1.ventMode === 'arrival' ? (
                  <span className="text-xs text-blue-600 font-semibold">
                    {lang === 'en' ? 'Plus Vents (TBD)' : 'Plus bouches (À déterminer)'}
                  </span>
                ) : step1.ventCount <= 10 ? (
                  <span className="text-xs text-green-600 font-semibold">
                    {step1.ventCount} {lang === 'en' ? 'Included' : 'Incluses'}
                  </span>
                ) : (
                  <span className="text-xs text-gray-600">
                    {step1.ventCount} ({lang === 'en' ? `${step1.ventCount - 10} extra` : `${step1.ventCount - 10} suppl.`} × $15.00)
                  </span>
                )}
              </div>
            )}

            {/* Extras */}
            {selectedExtraEntries.map(([id, qty]) => {
              const extra = EXTRAS.find((e) => e.id === id);
              if (!extra) return null;
              const tier = carpetTiers[id];
              const isProtect = tier === 'protect' && extra.protectPrice != null;
              const price = isProtect ? extra.protectPrice! : extra.bundlePrice;
              const tierLabel = isProtect
                ? (lang === 'en' ? ' (Protect)' : ' (Protéger)')
                : (extra.protectPrice != null ? (lang === 'en' ? ' (Clean)' : ' (Nettoyer)') : '');
              return (
                <div key={id} className="flex justify-between items-baseline">
                  <span className="text-xs font-semibold text-amber-600">
                    {t(extra.name)}{tierLabel}{qty > 1 ? ` × ${qty}` : ''}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">{fmt(price * qty)}</span>
                </div>
              );
            })}

            {/* Dryer vent locations */}
            {dryerVentTotal > 0 && (
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-semibold text-amber-600">
                  {lang === 'en' ? 'Dryer Vent Cleaning' : 'Nettoyage sécheuse'}
                </span>
                <span className="text-sm font-semibold text-gray-900">{fmt(dryerVentTotal)}</span>
              </div>
            )}
            {dryerVentExtra?.dryerLocations?.map((loc) => {
              const qty = dryerVentLocations[loc.id] ?? 0;
              if (qty === 0) return null;
              return (
                <div key={loc.id} className="flex justify-between items-baseline pl-2">
                  <span className="text-xs text-gray-500">• {t(loc.label)} × {qty}</span>
                  <span className="text-xs text-gray-600">{fmt(loc.price * qty)}</span>
                </div>
              );
            })}

            {/* Unit location fee */}
            {step3.unitLocationFee > 0 && (
              <div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-semibold text-amber-600">
                    {lang === 'en' ? 'Unit Location Fee' : "Frais d'emplacement"}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">{fmt(step3.unitLocationFee)}</span>
                </div>
                {step3.unitLocation !== 'standard' && (
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    • {UNIT_LOCATIONS.find(o => o.value === step3.unitLocation)?.label[lang === 'fr' ? 'fr' : 'en'] ?? step3.unitLocation}
                  </p>
                )}
              </div>
            )}

            {/* Portable unit fee */}
            {step3.parkingFee > 0 && (
              <div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-semibold text-amber-600">
                    {lang === 'en' ? 'Portable Unit Fee' : 'Frais unité portable'}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">{fmt(step3.parkingFee)}</span>
                </div>
                <div className="mt-0.5">
                  {step3.hasParking === 'no' && (
                    <p className="text-[10px] text-gray-400">{lang === 'en' ? '• No guaranteed parking' : '• Pas de stationnement garanti'}</p>
                  )}
                  {step3.parkingFar === 'yes' && (
                    <p className="text-[10px] text-gray-400">{lang === 'en' ? '• Parking over 100ft from entrance' : '• Stationnement à +100 pi'}</p>
                  )}
                  {step3.aboveThirdFloor === 'yes' && (
                    <p className="text-[10px] text-gray-400">{lang === 'en' ? '• Above 3rd floor' : '• Au-dessus du 3e étage'}</p>
                  )}
                  {step3.carpetFloor === 'yes' && (
                    <p className="text-[10px] text-gray-400">{lang === 'en' ? '• 3rd floor or higher (TBD)' : '• 3e étage ou plus (à confirmer)'}</p>
                  )}
                </div>
              </div>
            )}

            {/* Subtotal + taxes */}
            <div className="border-t border-gray-200 pt-3 mt-2 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{lang === 'en' ? 'Subtotal' : 'Sous-total'}</span>
                <span className="font-medium text-gray-700">{fmt(subtotal)}</span>
              </div>
              {taxLines.map((tl) => (
                <div key={tl.label} className="flex justify-between text-sm text-gray-500">
                  <span>{tl.label}</span>
                  <span>{fmt(tl.amount)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Total bar */}
          <div className="mt-4 bg-gray-900 text-white rounded-lg px-4 py-3 flex justify-between items-center">
            <span className="text-sm font-bold uppercase tracking-wider">Total</span>
            <span className="text-xl font-bold">{fmt(total)}</span>
          </div>
        </div>
      </div>

      {/* ── Confirmation notice ── */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex gap-3">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-[11px] font-bold text-blue-700 uppercase tracking-widest mb-1">
            {lang === 'en' ? 'Confirmation Required' : 'Confirmation requise'}
          </p>
          <p className="text-xs text-gray-600 leading-relaxed">
            {lang === 'en'
              ? 'Please review all details above carefully before confirming. A confirmation email will be sent immediately after you complete your booking. Final Price Verification: The total shown is an estimate based on the information you provided. The exact price will be verified on-site, and we can confirm it with you before any work begins if you prefer.'
              : "Veuillez vérifier tous les détails ci-dessus avant de confirmer. Un e-mail de confirmation vous sera envoyé immédiatement. Le total affiché est une estimation; le prix exact sera vérifié sur place avant le début des travaux."}
          </p>
        </div>
      </div>

      {/* ── Booking error ── */}
      {bookError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-600 font-medium">
          {bookError}
        </div>
      )}
    </div>
  );
}
