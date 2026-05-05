import { useEffect, useRef, useState } from 'react';
import { Phone } from 'lucide-react';
import { brand } from '../brand';
import type { Region } from '../brand';
import { captureTrackingData, generateEventId } from '../utils/tracking';

const BOOKING_URL = (import.meta.env.VITE_BOOKING_URL as string | undefined) ?? 'https://1cabooking.vercel.app';
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

interface AddressParts {
  address1: string;
  city: string;
  stateCode: string;
  zip: string;
  formatted: string;
}

const EMPTY_ADDRESS: AddressParts = { address1: '', city: '', stateCode: '', zip: '', formatted: '' };

export default function LeadForm() {
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
  const [outOfArea, setOutOfArea] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Wait for Google Maps script (loaded via index.html callback)
  useEffect(() => {
    if ((window as AnyWindow).google && (window as unknown as { google: { maps: { places: unknown } } }).google.maps?.places) {
      setMapsReady(true);
      return;
    }
    const handler = () => setMapsReady(true);
    window.addEventListener('googleMapsLoaded', handler, { once: true });
    return () => window.removeEventListener('googleMapsLoaded', handler);
  }, []);

  // Attach Places Autocomplete (Canada-only)
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

      // Fallback: parse from formatted address if components missing
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

  const validate = (): string => {
    if (!firstName.trim()) return 'Please enter your first name.';
    if (!lastName.trim()) return 'Please enter your last name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Please enter a valid email.';
    if (phone.replace(/\D/g, '').length < 10) return 'Please enter a valid phone number.';
    if (!parts.formatted || !parts.city) return 'Please select your address from the suggestions.';
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
      const params = new URLSearchParams({
        firstName: payload.first_name,
        lastName: payload.last_name,
        email: payload.email,
        phone: payload.phone,
        address: payload.address,
        city: payload.city,
        state: payload.state,
        zip: payload.zip,
        region: region!,
        source: 'widget',
      });
      const target = `${BOOKING_URL}/?${params.toString()}`;

      // Tell host page (in case it wants to handle navigation itself)
      try {
        window.parent.postMessage({ type: '1ca-widget-redirect', url: target }, '*');
      } catch {
        // ignore
      }

      // Navigate the top-level browsing context
      try {
        window.top!.location.href = target;
      } catch {
        window.location.href = target;
      }
      return;
    }

    setOutOfArea(true);
    setSubmitting(false);
  };

  if (outOfArea) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-white">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-blue-50 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-blue-700" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Thanks, {firstName || 'there'}!</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-6">
            You&rsquo;re just outside our standard service area, but our team will reach out shortly to see how we can help.
          </p>
          <p className="text-xs uppercase tracking-wide font-bold text-gray-500 mb-2">Need us sooner?</p>
          <a
            href={`tel:${brand.phoneDigits}`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold text-base transition-colors"
          >
            <Phone className="w-5 h-5" />
            {brand.phoneDisplay}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-4 py-6 sm:py-8">
      <div className="w-full max-w-md mx-auto">
        <header className="text-center mb-6">
          <img src={brand.logo} alt={brand.name} className="h-12 mx-auto mb-3" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Get your free quote</h1>
          <p className="text-sm text-gray-600 mt-1">Tell us a bit about you — takes under a minute.</p>
        </header>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="First name" required>
              <input
                type="text"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Last name" required>
              <input
                type="text"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Email" required>
            <input
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Phone" required>
            <input
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(613) 555-0123"
              className={inputClass}
            />
          </Field>

          <Field label="Address" required>
            <input
              ref={inputRef}
              type="text"
              autoComplete="off"
              value={addressInput}
              onChange={(e) => {
                setAddressInput(e.target.value);
                if (parts.formatted) setParts(EMPTY_ADDRESS);
              }}
              placeholder="Start typing your address…"
              className={inputClass}
            />
          </Field>

          {errorMsg && (
            <p className="text-sm text-red-600 font-medium">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[48px] rounded-lg bg-blue-700 hover:bg-blue-800 disabled:bg-blue-700/60 text-white font-semibold text-base transition-colors"
          >
            {submitting ? 'Submitting…' : 'Get My Quote'}
          </button>

          <p className="text-[11px] text-gray-500 text-center leading-relaxed">
            By submitting you agree to be contacted about your request. See our{' '}
            <a href={brand.privacyUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-700">
              privacy policy
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
