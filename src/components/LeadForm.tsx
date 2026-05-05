import { useEffect, useRef, useState } from 'react';
import { brand } from '../brand';
import type { Region } from '../brand';
import { useLang } from '../context/LanguageContext';
import { captureTrackingData, generateEventId } from '../utils/tracking';

const N8N_WEBHOOK = import.meta.env.VITE_N8N_WEBHOOK as string | undefined;

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
}

interface Props {
  onInArea: (lead: CapturedLead) => void;
  onOutOfArea: (firstName: string) => void;
}

export default function LeadForm({ onInArea, onOutOfArea }: Props) {
  const { lang } = useLang();
  const inputRef = useRef<HTMLInputElement>(null);
  const autoRef = useRef<google.maps.places.Autocomplete | null>(null);

  const [mapsReady, setMapsReady] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [parts, setParts] = useState<AddressParts>(EMPTY_ADDRESS);
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

  const t = (en: string, fr: string) => (lang === 'en' ? en : fr);

  const validate = (): string => {
    if (!firstName.trim()) return t('Please enter your first name.', 'Veuillez entrer votre prénom.');
    if (!lastName.trim()) return t('Please enter your last name.', 'Veuillez entrer votre nom de famille.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return t('Please enter a valid email.', 'Veuillez entrer un courriel valide.');
    if (phone.replace(/\D/g, '').length < 10) return t('Please enter a valid phone number.', 'Veuillez entrer un numéro de téléphone valide.');
    if (!parts.formatted || !parts.city) return t('Please select your address from the suggestions.', 'Veuillez sélectionner votre adresse dans les suggestions.');
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setErrorMsg(err);
      return;
    }
    setErrorMsg('');
    setSubmitting(true);

    const region = cityToRegion(parts.city);
    const inServiceArea = region !== null;
    const tracking = captureTrackingData();
    const eventId = generateEventId();

    const payload = {
      event_id: eventId,
      lead_type: inServiceArea ? 'widget_lead' : 'out_of_area_inquiry',
      brand: brand.id,
      source: 'widget',
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
      in_service_area: inServiceArea,
      ...tracking,
      submitted_at: new Date().toISOString(),
    };

    if (N8N_WEBHOOK) {
      try {
        await fetch(N8N_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        });
      } catch {
        // Non-fatal — keep the user moving forward
      }
    }

    if (inServiceArea) {
      const isGatineau = GATINEAU_QC.some(c => normalize(parts.city).includes(c));
      const province = (region === 'montreal' || isGatineau) ? 'Québec' : 'Ontario';
      onInArea({
        firstName: payload.first_name,
        lastName: payload.last_name,
        email: payload.email,
        phone: payload.phone,
        region: region!,
        province,
        address1: parts.address1,
        formattedAddress: parts.formatted,
        city: parts.city,
        stateCode: parts.stateCode,
        zip: parts.zip,
      });
      return;
    }

    onOutOfArea(payload.first_name);
    setSubmitting(false);
  };

  return (
    <div className="px-4 py-6 sm:py-8">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            {t('Get your free quote', 'Obtenez votre soumission gratuite')}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {t('Tell us a bit about you — takes under a minute.', 'Parlez-nous de vous — moins d’une minute.')}
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t('First name', 'Prénom')} required>
              <input type="text" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
            </Field>
            <Field label={t('Last name', 'Nom')} required>
              <input type="text" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
            </Field>
          </div>

          <Field label={t('Email', 'Courriel')} required>
            <input type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </Field>

          <Field label={t('Phone', 'Téléphone')} required>
            <input type="tel" autoComplete="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(613) 555-0123" className={inputClass} />
          </Field>

          <Field label={t('Address', 'Adresse')} required>
            <input
              ref={inputRef}
              type="text"
              autoComplete="off"
              value={addressInput}
              onChange={(e) => {
                setAddressInput(e.target.value);
                if (parts.formatted) setParts(EMPTY_ADDRESS);
              }}
              placeholder={t('Start typing your address…', 'Commencez à saisir votre adresse…')}
              className={inputClass}
            />
          </Field>

          {errorMsg && <p className="text-sm text-red-600 font-medium">{errorMsg}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[48px] rounded-lg bg-blue-700 hover:bg-blue-800 disabled:bg-blue-700/60 text-white font-semibold text-base transition-colors"
          >
            {submitting ? t('Submitting…', 'Envoi…') : t('Continue', 'Continuer')}
          </button>

          <p className="text-[11px] text-gray-500 text-center leading-relaxed">
            {t('By submitting you agree to be contacted about your request. See our', 'En soumettant, vous acceptez d’être contacté à propos de votre demande. Voir notre')}{' '}
            <a href={brand.privacyUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-700">
              {t('privacy policy', 'politique de confidentialité')}
            </a>.
          </p>
        </form>
      </div>
    </div>
  );
}

const inputClass =
  'w-full min-h-[48px] border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition';

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">
        {label}{required && ' *'}
      </span>
      {children}
    </label>
  );
}
