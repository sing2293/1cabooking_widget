import { useEffect, useRef, useState } from 'react';
import {
  Check, Home, Building2, Factory,
  Wind, Shirt, Snowflake, Sofa, Flame,
  Sparkles, Layers, Shield, HelpCircle,
  Wrench, ThermometerSun, Smartphone, Replace,
  type LucideIcon,
} from 'lucide-react';
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

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length >= 7) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length >= 4) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  if (digits.length > 0) return `(${digits}`;
  return '';
}

interface SectorOption {
  id: string;
  label: { en: string; fr: string };
  Icon: LucideIcon;
}
const SECTORS: SectorOption[] = [
  { id: 'Residential', label: { en: 'Residential', fr: 'Résidentiel' }, Icon: Home },
  { id: 'Commercial',  label: { en: 'Commercial',  fr: 'Commercial' },  Icon: Building2 },
  { id: 'Industrial',  label: { en: 'Industrial',  fr: 'Industriel' },  Icon: Factory },
];

interface ServiceOption {
  id: string;
  label: { en: string; fr: string };  // full label used for n8n payload
  short: { en: string; fr: string };  // short label used on the tab card
  Icon: LucideIcon;
  bookingCategoryId: string | null;
}

const SERVICES_CLEANING: ServiceOption[] = [
  { id: 'duct-cleaning',   label: { en: 'Air Duct Cleaning',                     fr: 'Nettoyage de conduits d’air' },                 short: { en: 'Air Duct Cleaning',             fr: 'Nettoyage de conduits d’air' }, Icon: Wind,      bookingCategoryId: 'central-air' },
  { id: 'dryer-vent',      label: { en: 'Dryer Vent Cleaning or Repair',         fr: 'Nettoyage / réparation de sécheuse' },          short: { en: 'Dryer Vent Cleaning',           fr: 'Nettoyage de sécheuse' },       Icon: Shirt,     bookingCategoryId: 'dryer-vent' },
  { id: 'wall-unit',       label: { en: 'Wall-Mounted AC Cleaning (Mini-Split)', fr: 'Nettoyage de climatiseur mural (mini-split)' }, short: { en: 'Wall AC / Mini-Split Cleaning', fr: 'Nettoyage de mini-split' },     Icon: Snowflake, bookingCategoryId: 'wall-unit' },
  { id: 'carpet-cleaning', label: { en: 'Carpet, Rug & Upholstery Cleaning',     fr: 'Nettoyage de tapis, moquettes et rembourrage' }, short: { en: 'Carpet, Rug & Upholstery',      fr: 'Tapis & rembourrage' },         Icon: Sofa,      bookingCategoryId: 'carpet' },
  { id: 'high-dusting',    label: { en: 'High Dusting',                          fr: 'Dépoussiérage en hauteur' },                    short: { en: 'High Dusting',                  fr: 'Dépoussiérage' },               Icon: Sparkles,  bookingCategoryId: null },
  { id: 'insulation',      label: { en: 'Insulation Services',                   fr: 'Isolation' },                                   short: { en: 'Insulation',                    fr: 'Isolation' },                   Icon: Layers,    bookingCategoryId: null },
  { id: 'duct-sealing',    label: { en: 'Duct Sealing Powered by Aeroseal',      fr: 'Étanchéité de conduits Aeroseal' },             short: { en: 'Aeroseal Sealing',              fr: 'Aeroseal' },                    Icon: Shield,    bookingCategoryId: null },
  { id: 'other',           label: { en: 'Other services',                        fr: 'Autres services' },                             short: { en: 'Other',                         fr: 'Autres' },                      Icon: HelpCircle,bookingCategoryId: null },
];

/** HVAC services need an on-site quote — none are eligible for in-iframe booking. */
const SERVICES_HVAC: ServiceOption[] = [
  { id: 'hvac-install',       label: { en: 'HVAC Installation',                       fr: 'Installation CVC' },                                       short: { en: 'HVAC Installation',          fr: 'Installation CVC' },                   Icon: Wrench,         bookingCategoryId: null },
  { id: 'ac-install',         label: { en: 'AC Installation',                         fr: 'Installation de climatisation' },                          short: { en: 'AC Installation',            fr: 'Installation A/C' },                   Icon: Snowflake,      bookingCategoryId: null },
  { id: 'ac-repair',          label: { en: 'AC Repair',                               fr: 'Réparation de climatisation' },                            short: { en: 'AC Repair',                  fr: 'Réparation A/C' },                     Icon: Snowflake,      bookingCategoryId: null },
  { id: 'furnace-install',    label: { en: 'Furnace Installation',                    fr: 'Installation de fournaise' },                              short: { en: 'Furnace Installation',       fr: 'Installation fournaise' },             Icon: Flame,          bookingCategoryId: null },
  { id: 'furnace-repair',     label: { en: 'Furnace Repair',                          fr: 'Réparation de fournaise' },                                short: { en: 'Furnace Repair',             fr: 'Réparation fournaise' },               Icon: Flame,          bookingCategoryId: null },
  { id: 'heat-pump-install',  label: { en: 'Heat Pump Installation',                  fr: 'Installation de thermopompe' },                            short: { en: 'Heat Pump Installation',     fr: 'Installation thermopompe' },           Icon: ThermometerSun, bookingCategoryId: null },
  { id: 'thermostat',         label: { en: 'Thermostat Installation / Smart Upgrade', fr: 'Installation de thermostat / mise à niveau intelligente' }, short: { en: 'Thermostat / Smart',         fr: 'Thermostat' },                         Icon: Smartphone,     bookingCategoryId: null },
  { id: 'duct-replacement',   label: { en: 'Duct Replacement',                        fr: 'Remplacement de conduits' },                               short: { en: 'Duct Replacement',           fr: 'Remplacement conduits' },              Icon: Replace,        bookingCategoryId: null },
];

const ALL_SERVICES = [...SERVICES_CLEANING, ...SERVICES_HVAC];
const CLEANING_IDS = new Set(SERVICES_CLEANING.map(s => s.id));
const HVAC_IDS = new Set(SERVICES_HVAC.map(s => s.id));

interface AddressParts {
  address1: string;
  city: string;
  stateCode: string;
  zip: string;
  formatted: string;
  lat: number | null;
  lng: number | null;
}
const EMPTY_ADDRESS: AddressParts = { address1: '', city: '', stateCode: '', zip: '', formatted: '', lat: null, lng: null };

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
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  const [mapsReady, setMapsReady] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [parts, setParts] = useState<AddressParts>(EMPTY_ADDRESS);
  const [sector, setSector] = useState('');
  const [services, setServices] = useState<string[]>([]);
  const [otherServiceText, setOtherServiceText] = useState('');
  const [message, setMessage] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if ((window as AnyWindow).google && (window as unknown as { google: { maps: { places: unknown } } }).google.maps?.places) {
      setMapsReady(true);
      return;
    }
    const handler = () => setMapsReady(true);
    window.addEventListener('googleMapsLoaded', handler, { once: true });
    return () => window.removeEventListener('googleMapsLoaded', handler);
  }, []);

  useEffect(() => {
    if (!mapsReady || !inputRef.current || autoRef.current) return;

    autoRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'ca' },
      fields: ['address_components', 'formatted_address', 'geometry.location'],
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

      const lat = place.geometry?.location?.lat() ?? null;
      const lng = place.geometry?.location?.lng() ?? null;

      setParts({ address1, city, stateCode, zip, formatted, lat, lng });
      setAddressInput(formatted);
    });
  }, [mapsReady]);

  /* Render a small confirmation map once a place is picked.
     The map is conditionally mounted (see JSX) so on each new selection
     after the user cleared the input, the container element is fresh
     and we need to re-init the Map instance against it. */
  useEffect(() => {
    if (!mapsReady || !mapRef.current || parts.lat == null || parts.lng == null) return;
    const center = { lat: parts.lat, lng: parts.lng };
    const sameContainer = mapInstanceRef.current?.getDiv() === mapRef.current;
    if (!mapInstanceRef.current || !sameContainer) {
      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        center,
        zoom: 16,
        disableDefaultUI: true,
        gestureHandling: 'none',
        draggable: false,
        scrollwheel: false,
        clickableIcons: false,
        keyboardShortcuts: false,
      });
      markerRef.current = new google.maps.Marker({
        position: center,
        map: mapInstanceRef.current,
      });
    } else {
      mapInstanceRef.current.setCenter(center);
      markerRef.current?.setPosition(center);
    }
  }, [mapsReady, parts.lat, parts.lng]);

  const toggleService = (id: string) => {
    setServices(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const hasOtherSelected = services.includes('other');
  const hasCleaning = services.some(id => CLEANING_IDS.has(id));
  const hasHvac     = services.some(id => HVAC_IDS.has(id));
  const derivedCategory: 'cleaning' | 'hvac' | 'both' =
    hasCleaning && hasHvac ? 'both' : hasHvac ? 'hvac' : 'cleaning';

  const validate = (): string => {
    if (!firstName.trim()) return t('Please enter your first name.', 'Veuillez entrer votre prénom.');
    if (!lastName.trim())  return t('Please enter your last name.',  'Veuillez entrer votre nom de famille.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return t('Please enter a valid email.', 'Veuillez entrer un courriel valide.');
    if (phone.replace(/\D/g, '').length < 10)             return t('Please enter a valid phone number.', 'Veuillez entrer un numéro de téléphone valide.');
    if (!parts.formatted || !parts.city)                  return t('Please select your address from the suggestions.', 'Veuillez sélectionner votre adresse dans les suggestions.');
    if (!sector)                                           return t('Please choose a sector.', 'Veuillez choisir un secteur.');
    if (services.length === 0)                             return t('Please choose at least one service.', 'Veuillez choisir au moins un service.');
    if (hasOtherSelected && !otherServiceText.trim()) return t('Please describe the service you’re looking for.', 'Veuillez décrire le service souhaité.');
    if (!agreed)                                           return t('Please agree to the privacy policy.', 'Veuillez accepter la politique de confidentialité.');
    if (!smsOptIn)                                         return t('Please confirm you consent to receive text messages.', 'Veuillez confirmer votre consentement à recevoir des messages texte.');
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setErrorMsg(err); return; }
    setErrorMsg('');
    setSubmitting(true);

    const region = cityToRegion(parts.city);
    const tracking = captureTrackingData();
    const eventId = generateEventId();

    const allServicesEligible = services.length > 0 && services.every(id =>
      ALL_SERVICES.find(s => s.id === id)?.bookingCategoryId != null
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
      customer_name: `${firstName.trim()} ${lastName.trim()}`,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: parts.address1,
      formatted_address: parts.formatted,
      city: parts.city,
      state: parts.stateCode,
      zip: parts.zip,
      region: region ?? '',
      // ── Form selections (separate, top-level fields for n8n) ──
      sector,                                                // 'Residential' | 'Commercial' | 'Industrial'
      category: derivedCategory,                             // 'cleaning' | 'hvac' | 'both'
      services: services.map(id => ALL_SERVICES.find(s => s.id === id)?.label.en ?? id),
      service_ids: services,
      other_service_description: hasOtherSelected ? otherServiceText.trim() : '',
      message: message.trim(),
      sms_opt_in: smsOptIn,
      agreed_to_policy: agreed,
      proceed_to_booking: proceedToBooking,
      ineligibility_reasons: reasons,
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
        firstName: firstName.trim(),
        lastName: lastName.trim(),
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

    onOutOfArea(firstName.trim());
    setSubmitting(false);
  };

  return (
    <div className="bg-blue-900 px-5 sm:px-8 py-7 sm:py-9">
      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleSubmit} noValidate className="space-y-5">

          {/* ── Sector tabs ── */}
          <FieldGroup label={t('Sector', 'Secteur')} required>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {SECTORS.map(s => {
                const active = sector === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSector(s.id)}
                    className={`flex flex-col items-center justify-center gap-1.5 sm:gap-2 px-2 py-3 sm:py-4 rounded-2xl transition-all ${
                      active
                        ? 'bg-white text-blue-900 ring-2 ring-blue-400 shadow-md'
                        : 'bg-white/10 text-white hover:bg-white/15 ring-1 ring-white/15'
                    }`}
                    aria-pressed={active}
                  >
                    <s.Icon className={`w-6 h-6 sm:w-7 sm:h-7 ${active ? 'text-blue-700' : 'text-white'}`} />
                    <span className="text-[11px] sm:text-xs font-semibold">{s.label[lang]}</span>
                  </button>
                );
              })}
            </div>
          </FieldGroup>

          {/* ── Services: Cleaning on the left, HVAC on the right (stacks on mobile) ── */}
          <FieldGroup
            label={t('Services', 'Services')}
            required
            hint={t('Select all that apply', 'Sélectionnez tous ceux qui s’appliquent')}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-4 gap-y-5">
              <ServiceGroup heading={t('Cleaning', 'Nettoyage')} list={SERVICES_CLEANING} services={services} toggleService={toggleService} lang={lang} />
              <ServiceGroup heading={t('HVAC', 'CVC')}           list={SERVICES_HVAC}     services={services} toggleService={toggleService} lang={lang} />
            </div>
            {hasOtherSelected && (
              <textarea
                value={otherServiceText}
                onChange={(e) => setOtherServiceText(e.target.value)}
                placeholder={t('Tell us what service you need…*', 'Dites-nous quel service vous recherchez…*')}
                rows={2}
                className="mt-3 w-full bg-white rounded-2xl px-5 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none border-0"
              />
            )}
          </FieldGroup>

          {/* ── First / Last name ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              autoComplete="given-name"
              placeholder={t('First Name*', 'Prénom*')}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={pill}
            />
            <input
              type="text"
              autoComplete="family-name"
              placeholder={t('Last Name*', 'Nom*')}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={pill}
            />
          </div>

          {/* ── Phone / Email ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder={t('Phone (xxx) xxx-xxxx*', 'Téléphone (xxx) xxx-xxxx*')}
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
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

          {/* ── Address + map preview ── */}
          <div className="space-y-2">
            <input
              ref={inputRef}
              type="text"
              autoComplete="off"
              placeholder={t('Address (start typing…)*', 'Adresse (commencez à saisir…)*')}
              value={addressInput}
              onChange={(e) => {
                setAddressInput(e.target.value);
                if (parts.formatted) setParts(EMPTY_ADDRESS);
              }}
              className={pill}
            />
            {parts.lat != null && parts.lng != null && (
              <div ref={mapRef} className="w-full h-40 sm:h-44 rounded-2xl overflow-hidden bg-white/5" />
            )}
            {parts.city && cityToRegion(parts.city) !== null && (
              <p className="text-xs font-semibold text-emerald-300">
                {t(`✓ We service ${parts.city}!`, `✓ Nous desservons ${parts.city}!`)}
              </p>
            )}
          </div>

          {/* ── Message ── */}
          <textarea
            placeholder={t('Message (optional)', 'Message (facultatif)')}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            className="w-full bg-white rounded-3xl px-5 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none border-0"
          />

          {/* ── Consents ── */}
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

function FieldGroup({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-white text-xs font-bold uppercase tracking-wider">
          {label}{required && <span className="text-blue-300 ml-0.5">*</span>}
        </p>
        {hint && <p className="text-[11px] text-blue-200 font-medium">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function ServiceGroup({
  heading, list, services, toggleService, lang,
}: {
  heading: string;
  list: ServiceOption[];
  services: string[];
  toggleService: (id: string) => void;
  lang: 'en' | 'fr';
}) {
  return (
    <div>
      <p className="text-[10px] font-bold text-blue-200 uppercase tracking-wider mb-2">{heading}</p>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {list.map(s => {
          const active = services.includes(s.id);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => toggleService(s.id)}
              className={`relative flex flex-col items-center justify-center gap-1.5 px-2 py-3 sm:py-4 rounded-2xl text-center transition-all min-h-[88px] ${
                active
                  ? 'bg-white text-blue-900 ring-2 ring-blue-400 shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/15 ring-1 ring-white/15'
              }`}
              aria-pressed={active}
            >
              {active && (
                <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-blue-700 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" strokeWidth={3.5} />
                </span>
              )}
              <s.Icon className={`w-6 h-6 ${active ? 'text-blue-700' : 'text-white'}`} />
              <span className="text-[11px] font-semibold leading-tight">{s.short[lang]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
