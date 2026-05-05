import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { brand } from '../brand';
import type { Region } from '../brand';
import { useLang } from '../context/LanguageContext';
import { captureTrackingData, generateEventId } from '../utils/tracking';

const LEAD_WEBHOOK = import.meta.env.VITE_N8N_LEAD_WEBHOOK as string | undefined;

type AnyWindow = Window & typeof globalThis & Record<string, unknown>;

const COMBINING_MARKS = new RegExp('[\\u0300-\\u036f]', 'g');
function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(COMBINING_MARKS, '').trim();
}

function cityToRegion(city: string): Region | null {
  const c = normalize(city);
  if (brand.cities.bkc.some(n => c.includes(n))) return 'bkc';
  if (brand.cities.ottawa.some(n => c.includes(n)) || brand.cities.gatineau.some(n => c.includes(n))) return 'ottawa';
  if (brand.cities.montreal.some(n => c.includes(n))) return 'montreal';
  return null;
}

const GATINEAU_QC = ['gatineau', 'hull', 'aylmer', 'buckingham', 'chelsea', 'wakefield', 'cantley', 'pontiac', 'la peche'];

/** Match Step 3's formatter exactly so the phone prefills cleanly. */
function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length >= 7) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length >= 4) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  if (digits.length > 0) return `(${digits}`;
  return '';
}

/** Service catalog. `bookingCategoryId !== null` ⇒ eligible to enter the 5-step flow. */
const SERVICES = [
  { id: 'duct-cleaning',     label: { en: 'Duct Cleaning',                                  fr: 'Nettoyage de conduits' },                                       bookingCategoryId: 'central-air' as string | null },
  { id: 'air-exchanger',     label: { en: 'Air Exchanger Cleaning (HRV/ERV)',               fr: 'Nettoyage d’échangeur d’air (VRC/VRE)' },                       bookingCategoryId: 'air-exchanger' },
  { id: 'dryer-vent',        label: { en: 'Dryer Vent Cleaning or Repair',                  fr: 'Nettoyage / réparation de sécheuse' },                          bookingCategoryId: 'dryer-vent' },
  { id: 'wall-unit',         label: { en: 'Wall-Mounted AC Cleaning (Mini-Split)',          fr: 'Nettoyage de climatiseur mural (mini-split)' },                 bookingCategoryId: 'wall-unit' },
  { id: 'carpet-cleaning',   label: { en: 'Carpet & Rug Cleaning',                          fr: 'Nettoyage de tapis et moquettes' },                             bookingCategoryId: 'carpet' },
  { id: 'uv-c',              label: { en: 'UV-C Air Purification System',                   fr: 'Système de purification d’air UV-C' },                          bookingCategoryId: 'specialty' },
  { id: 'furnace-blower',    label: { en: 'Furnace / Air Handler Cleaning (Blower & Motor)', fr: 'Nettoyage de fournaise / unité de traitement d’air' },         bookingCategoryId: 'specialty' },
  { id: 'indoor-coil',       label: { en: 'Indoor Coil Cleaning (Evaporator Coil)',         fr: 'Nettoyage de la serpentine intérieure (évaporateur)' },         bookingCategoryId: 'specialty' },
  { id: 'outdoor-unit',      label: { en: 'Outdoor Unit Cleaning (Heat Pump / Condenser)',  fr: 'Nettoyage de l’unité extérieure (thermopompe / condenseur)' }, bookingCategoryId: 'specialty' },
  { id: 'high-dusting',      label: { en: 'High Dusting',                                   fr: 'Dépoussiérage en hauteur' },                                    bookingCategoryId: null },
  { id: 'insulation',        label: { en: 'Insulation Services',                            fr: 'Isolation' },                                                   bookingCategoryId: null },
  { id: 'duct-sealing',      label: { en: 'Duct Sealing Powered by Aeroseal',               fr: 'Étanchéité de conduits Aeroseal' },                             bookingCategoryId: null },
  { id: 'other',             label: { en: 'Other services',                                 fr: 'Autres services' },                                             bookingCategoryId: null },
];

const SECTORS = [
  { id: 'Residential', label: { en: 'Residential', fr: 'Résidentiel' } },
  { id: 'Commercial',  label: { en: 'Commercial',  fr: 'Commercial' } },
  { id: 'Industrial',  label: { en: 'Industrial',  fr: 'Industriel' } },
];

interface AddressParts {
  address1: string;
  city: string;
  stateCode: string;
  zip: string;
  formatted: string;
}
const EMPTY_ADDRESS: AddressParts = { address1: '', city: '', stateCode: '', zip: '', formatted: '' };

export interface CapturedLead {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  region: Region;
  province: string;
  address1: string;
  formattedAddress: string;
  city: string;
  stateCode: string;
  zip: string;
  message?: string;
  preselectedServices?: string[];
}

interface Props {
  onInArea: (lead: CapturedLead) => void;
  onOutOfArea: (firstName: string) => void;
}

export default function LeadForm({ onInArea, onOutOfArea }: Props) {
  const { lang } = useLang();
  const t = (en: string, fr: string) => (lang === 'en' ? en : fr);

  const inputRef = useRef<HTMLInputElement>(null);
  const autoRef = useRef<google.maps.places.Autocomplete | null>(null);
  const servicesRef = useRef<HTMLDivElement>(null);

  const [mapsReady, setMapsReady] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [parts, setParts] = useState<AddressParts>(EMPTY_ADDRESS);
  const [sector, setSector] = useState('');
  const [services, setServices] = useState<string[]>([]);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  /* ── Wait for Google Maps ── */
  useEffect(() => {
    if ((window as AnyWindow).google && (window as unknown as { google: { maps: { places: unknown } } }).google.maps?.places) {
      setMapsReady(true);
      return;
    }
    const handler = () => setMapsReady(true);
    window.addEventListener('googleMapsLoaded', handler, { once: true });
    return () => window.removeEventListener('googleMapsLoaded', handler);
  }, []);

  /* ── Attach Places Autocomplete (Canada-only) ── */
  useEffect(() => {
    if (!mapsReady || !inputRef.current || autoRef.current) return;

    autoRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'ca' },
      fields: ['address_components', 'formatted_address'],
      types: ['address'],
    });

    autoRef.current.addListener('place_changed', () => {
      const place = autoRef.current!.getPlace();
      if (!place.address_components) return;

      const formatted = place.formatted_address ?? inputRef.current?.value ?? '';
      const get = (type: string) =>
        place.address_components!.find(c => c.types.includes(type))?.long_name ?? '';
      const getShort = (type: string) =>
        place.address_components!.find(c => c.types.includes(type))?.short_name ?? '';

      let city =
        get('locality') ||
        get('administrative_area_level_3') ||
        get('administrative_area_level_2') ||
        '';
      let stateCode = getShort('administrative_area_level_1');
      let zip = getShort('postal_code');
      const streetNumber = get('street_number');
      const route = get('route');
      const address1 = [streetNumber, route].filter(Boolean).join(' ') || formatted.split(',')[0].trim();

      if (!city || !stateCode || !zip) {
        const segs = formatted.split(',').map(s => s.trim());
        if (!city && segs.length >= 3) city = segs[1] || '';
        if ((!stateCode || !zip) && segs.length >= 3) {
          const m = (segs[2] || '').match(/^([A-Z]{2})\s+(.+)$/);
          if (m) {
            if (!stateCode) stateCode = m[1];
            if (!zip) zip = m[2];
          }
        }
      }

      setParts({ address1, city, stateCode, zip, formatted });
      setAddressInput(formatted);
    });
  }, [mapsReady]);

  /* ── Close services dropdown on outside click / escape ── */
  useEffect(() => {
    if (!servicesOpen) return;
    const onClick = (e: MouseEvent) => {
      if (servicesRef.current && !servicesRef.current.contains(e.target as Node)) setServicesOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setServicesOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [servicesOpen]);

  const toggleService = (id: string) => {
    setServices(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const splitName = (full: string): { first: string; last: string } => {
    const parts = full.trim().split(/\s+/);
    return { first: parts[0] ?? '', last: parts.slice(1).join(' ') };
  };

  const validate = (): string => {
    const { first, last } = splitName(customerName);
    if (!first || !last) return t('Please enter your full name (first and last).', 'Veuillez entrer votre nom complet (prénom et nom).');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return t('Please enter a valid email.', 'Veuillez entrer un courriel valide.');
    if (phone.replace(/\D/g, '').length < 10) return t('Please enter a valid phone number.', 'Veuillez entrer un numéro de téléphone valide.');
    if (!parts.formatted || !parts.city) return t('Please select your address from the suggestions.', 'Veuillez sélectionner votre adresse dans les suggestions.');
    if (!sector) return t('Please choose a sector.', 'Veuillez choisir un secteur.');
    if (services.length === 0) return t('Please choose at least one service.', 'Veuillez choisir au moins un service.');
    if (!agreed) return t('Please agree to the privacy policy.', 'Veuillez accepter la politique de confidentialité.');
    if (!smsOptIn) return t('Please confirm you consent to receive text messages.', 'Veuillez confirmer votre consentement à recevoir des messages texte.');
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setErrorMsg(err); return; }
    setErrorMsg('');
    setSubmitting(true);

    const { first, last } = splitName(customerName);
    const region = cityToRegion(parts.city);
    const tracking = captureTrackingData();
    const eventId = generateEventId();

    const allServicesEligible = services.length > 0 && services.every(id =>
      SERVICES.find(s => s.id === id)?.bookingCategoryId != null
    );
    const isResidential = sector === 'Residential';
    const inServiceArea = region !== null;
    const proceedToBooking = isResidential && allServicesEligible && inServiceArea;

    const reasons: string[] = [];
    if (!isResidential)       reasons.push('non_residential');
    if (!allServicesEligible) reasons.push('ineligible_service');
    if (!inServiceArea)       reasons.push('out_of_area');

    const payload = {
      event_id: eventId,
      lead_type: 'widget_quote',
      brand: brand.id,
      source: 'widget',
      // Contact
      customer_name: customerName.trim(),
      first_name: first,
      last_name: last,
      email: email.trim(),
      phone: phone.trim(),
      // Address
      address: parts.address1,
      formatted_address: parts.formatted,
      city: parts.city,
      state: parts.stateCode,
      zip: parts.zip,
      region: region ?? '',
      // Form-specific
      sector,
      services: services.map(id => SERVICES.find(s => s.id === id)?.label.en ?? id),
      service_ids: services,
      message: message.trim(),
      sms_opt_in: smsOptIn,
      agreed_to_policy: agreed,
      // Eligibility
      proceed_to_booking: proceedToBooking,
      ineligibility_reasons: reasons,
      // Tracking
      ...tracking,
      submitted_at: new Date().toISOString(),
    };

    if (LEAD_WEBHOOK) {
      try {
        await fetch(LEAD_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        });
      } catch {
        // Non-fatal — continue the flow regardless
      }
    }

    if (proceedToBooking) {
      const isGatineau = GATINEAU_QC.some(c => normalize(parts.city).includes(c));
      const province = (region === 'montreal' || isGatineau) ? 'Québec' : 'Ontario';
      onInArea({
        firstName: first,
        lastName: last,
        email: payload.email,
        phone: payload.phone,
        region: region!,
        province,
        address1: parts.address1,
        formattedAddress: parts.formatted,
        city: parts.city,
        stateCode: parts.stateCode,
        zip: parts.zip,
        message: payload.message,
        preselectedServices: services,
      });
      return;
    }

    onOutOfArea(first);
    setSubmitting(false);
  };

  const servicesLabel = services.length === 0
    ? t('Choose a service', 'Choisir un service')
    : services.length === 1
      ? (SERVICES.find(s => s.id === services[0])?.label[lang] ?? '')
      : t(`${services.length} services selected`, `${services.length} services sélectionnés`);

  return (
    <div className="bg-blue-900 px-5 sm:px-8 py-7 sm:py-9">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-white text-xl sm:text-2xl font-bold mb-5">
          {t('Get a quote & book online', 'Obtenez une soumission et réservez en ligne')}
        </h1>

        <form onSubmit={handleSubmit} noValidate className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Sector */}
            <div className="relative">
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className={`${pill} appearance-none pr-10 ${sector ? 'text-gray-900' : 'text-gray-400'}`}
              >
                <option value="" disabled>{t('Choose a sector', 'Choisir un secteur')}</option>
                {SECTORS.map(s => (
                  <option key={s.id} value={s.id}>{s.label[lang]}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>

            {/* Services (multi-select) */}
            <div className="relative" ref={servicesRef}>
              <button
                type="button"
                onClick={() => setServicesOpen(o => !o)}
                className={`${pill} flex items-center justify-between text-left ${services.length === 0 ? 'text-gray-400' : 'text-gray-900'}`}
              >
                <span className="truncate pr-2">{servicesLabel}</span>
                <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${servicesOpen ? 'rotate-180' : ''}`} />
              </button>
              {servicesOpen && (
                <div className="absolute z-20 mt-1 left-0 right-0 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                  {SERVICES.map(s => {
                    const checked = services.includes(s.id);
                    return (
                      <label key={s.id} className="flex items-center gap-3 px-5 py-2.5 cursor-pointer hover:bg-gray-50 text-sm text-gray-800">
                        <span className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${checked ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}>
                          {checked && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                        </span>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={checked}
                          onChange={() => toggleService(s.id)}
                        />
                        {s.label[lang]}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              autoComplete="name"
              placeholder={t('Customer Name*', 'Nom du client*')}
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className={pill}
            />
            <input
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder={t('Email*', 'Courriel*')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={pill}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder={t('Phone*', 'Téléphone*')}
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              className={pill}
            />
            <input
              ref={inputRef}
              type="text"
              autoComplete="off"
              placeholder={t('Address (street, city)*', 'Adresse (rue, ville)*')}
              value={addressInput}
              onChange={(e) => {
                setAddressInput(e.target.value);
                if (parts.formatted) setParts(EMPTY_ADDRESS);
              }}
              className={pill}
            />
          </div>

          <textarea
            placeholder={t('Message (optional)', 'Message (facultatif)')}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            className="w-full bg-white rounded-3xl px-5 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          />

          <label className="flex items-start gap-2.5 text-[12px] text-white leading-snug cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-blue-500 flex-shrink-0"
            />
            <span>
              {t('I agree and understand that my information will be used in accordance with the company’s', 'J’accepte que mes informations soient utilisées conformément à la')}{' '}
              <a href={brand.privacyUrl} target="_blank" rel="noopener noreferrer" className="underline text-white hover:text-blue-200">
                {t('privacy policy', 'politique de confidentialité')}
              </a>.
            </span>
          </label>

          <label className="flex items-start gap-2.5 text-[11px] text-white leading-snug cursor-pointer">
            <input
              type="checkbox"
              checked={smsOptIn}
              onChange={(e) => setSmsOptIn(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-blue-500 flex-shrink-0"
            />
            <span>
              <strong>{t('Yes, please text me!', 'Oui, envoyez-moi un texto!')}</strong>
              {' '}
              {t(
                `By checking this box, I consent to receive Conversational text messages from ${brand.name}. Reply STOP to opt-out at any time. Reply Help for customer care at ${brand.phoneDisplay}. Messages and data rates may apply. Frequency will vary.`,
                `En cochant cette case, je consens à recevoir des messages texte conversationnels de ${brand.name}. Répondez STOP pour vous désabonner. Répondez Help pour le service client au ${brand.phoneDisplay}. Des frais de message et de données peuvent s'appliquer.`,
              )}
            </span>
          </label>

          {errorMsg && <p className="text-sm text-red-300 font-medium">{errorMsg}</p>}

          <div className="pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="px-7 py-3 rounded-full bg-blue-500 hover:bg-blue-400 disabled:bg-blue-500/60 text-white font-semibold text-sm transition-colors"
            >
              {submitting ? t('Sending…', 'Envoi…') : t('Send & Schedule Now', 'Envoyer et planifier')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const pill =
  'w-full bg-white rounded-full px-5 py-3 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 border-0';
