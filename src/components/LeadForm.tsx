import { useEffect, useRef, useState } from 'react';
import {
  Check, Home, Building2, Factory,
  Wind, Shirt, Snowflake, Sofa, Flame,
  Sparkles, Layers, Shield, HelpCircle,
  AirVent, Biohazard, Heater, Droplets, Fan,
  Wrench, ThermometerSun, Replace,
  Mic, Loader2, ArrowUp,
  type LucideIcon,
} from 'lucide-react';

/* Four little bars that scale with mic input level. Each bar has a
   different multiplier so the row looks like a wave even at low
   amplitudes. Smooth CSS transitions hide the per-frame jitter. */
const WAVE_MULTIPLIERS = [0.55, 1.0, 0.7, 0.85];
function MicWave({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-[2px] h-4">
      {WAVE_MULTIPLIERS.map((m, i) => {
        // Idle baseline ~22% so bars are visible even before sound; up to 100% at peak.
        const h = Math.max(22, Math.min(100, level * m * 220));
        return (
          <span
            key={i}
            className="w-[2.5px] bg-white rounded-full transition-[height] duration-75 ease-out"
            style={{ height: `${h}%` }}
          />
        );
      })}
    </div>
  );
}
import { brand } from '../brand';
import type { Region } from '../brand';
import { useLang } from '../context/LanguageContext';
import { captureTrackingData, generateEventId } from '../utils/tracking';
import { HOW_DID_YOU_HEAR } from '../data/step3Options';

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
  let digits = value.replace(/\D/g, '');
  // If user pasted a North-American number with the country code prefix,
  // drop the leading 1 so the formatted output is exactly 10 digits.
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  digits = digits.slice(0, 10);
  if (digits.length >= 7) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length >= 4) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  if (digits.length > 0) return `(${digits}`;
  return '';
}

/** NANP rules: 10 digits, area code and exchange code can't start with 0 or 1. */
function isValidPhone(value: string): boolean {
  let digits = value.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  if (digits.length !== 10) return false;
  if (digits[0] === '0' || digits[0] === '1') return false;
  if (digits[3] === '0' || digits[3] === '1') return false;
  return true;
}

/** Inject the Google Maps Places script on demand (first address focus) so it
 *  doesn't block first paint. Safe to call repeatedly — it no-ops if the API
 *  is already present or the script is already loading. */
function loadGoogleMaps() {
  const w = window as AnyWindow;
  if ((w as unknown as { google?: { maps?: { places?: unknown } } }).google?.maps?.places) return;
  if (document.getElementById('gmaps-js')) return;
  const key = import.meta.env.VITE_PLACES_API_KEY as string | undefined;
  if (!key) return;
  const s = document.createElement('script');
  s.id = 'gmaps-js';
  s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&callback=initGoogleMaps&region=CA`;
  s.async = true;
  s.defer = true;
  document.head.appendChild(s);
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
  /* Combo tile — routes into the central-air booking flow where dryer vent
     cleaning is the first Step-2 extra, producing the Duct & Dryer jobType. */
  { id: 'air-duct-dryer',  label: { en: 'Air Duct + Dryer Vent Cleaning',        fr: 'Nettoyage de conduits d’air + sécheuse' },      short: { en: 'Air Duct + Dryer Vent',         fr: 'Conduits d’air + sécheuse' },   Icon: AirVent,   bookingCategoryId: 'central-air' },
  { id: 'duct-cleaning',   label: { en: 'Air Duct Cleaning',                     fr: 'Nettoyage de conduits d’air' },                 short: { en: 'Air Duct Cleaning',             fr: 'Nettoyage de conduits d’air' }, Icon: Wind,      bookingCategoryId: 'central-air' },
  { id: 'dryer-vent',      label: { en: 'Dryer Vent Cleaning',                   fr: 'Nettoyage de sécheuse' },                       short: { en: 'Dryer Vent Cleaning',           fr: 'Nettoyage de sécheuse' },       Icon: Shirt,     bookingCategoryId: 'dryer-vent' },
  { id: 'wall-unit',       label: { en: 'Wall-Mounted AC Cleaning (Mini-Split)', fr: 'Nettoyage de climatiseur mural (mini-split)' }, short: { en: 'Wall AC / Mini-Split Cleaning', fr: 'Nettoyage de mini-split' },     Icon: Snowflake, bookingCategoryId: 'wall-unit' },
  { id: 'carpet-cleaning', label: { en: 'Carpet, Rug & Upholstery Cleaning',     fr: 'Nettoyage de tapis, moquettes et rembourrage' }, short: { en: 'Carpet, Rug & Upholstery',      fr: 'Tapis & rembourrage' },         Icon: Sofa,      bookingCategoryId: 'carpet' },
  { id: 'high-dusting',    label: { en: 'High Dusting',                          fr: 'Dépoussiérage en hauteur' },                    short: { en: 'High Dusting',                  fr: 'Dépoussiérage' },               Icon: Sparkles,  bookingCategoryId: null },
  { id: 'insulation',      label: { en: 'Insulation Services',                   fr: 'Isolation' },                                   short: { en: 'Insulation',                    fr: 'Isolation' },                   Icon: Layers,    bookingCategoryId: null },
  { id: 'duct-sealing',    label: { en: 'Duct Sealing Powered by Aeroseal',      fr: 'Étanchéité de conduits Aeroseal' },             short: { en: 'Aeroseal Sealing',              fr: 'Aeroseal' },                    Icon: Shield,    bookingCategoryId: null },
  { id: 'mold-remediation',label: { en: 'Mold Remediation',                      fr: 'Décontamination de moisissures' },              short: { en: 'Mold Remediation',              fr: 'Décontamination moisissures' }, Icon: Biohazard, bookingCategoryId: null },
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
  { id: 'boiler',             label: { en: 'Boiler Installation / Repair',            fr: 'Installation / réparation de chaudière' },                short: { en: 'Boiler',                     fr: 'Chaudière' },                          Icon: Heater,         bookingCategoryId: null },
  { id: 'water-heater',       label: { en: 'Water Heater Installation / Repair',      fr: 'Installation / réparation de chauffe-eau' },              short: { en: 'Water Heater',               fr: 'Chauffe-eau' },                        Icon: Droplets,       bookingCategoryId: null },
  { id: 'mini-split-ductless',label: { en: 'Mini-Split / Ductless Installation',      fr: 'Installation de mini-split / sans conduits' },            short: { en: 'Mini-Split / Ductless',      fr: 'Mini-split / sans conduits' },         Icon: Fan,            bookingCategoryId: null },
  { id: 'duct-replacement',   label: { en: 'Duct Replacement',                        fr: 'Remplacement de conduits' },                               short: { en: 'Duct Replacement',           fr: 'Remplacement conduits' },              Icon: Replace,        bookingCategoryId: null },
];

const ALL_SERVICES = [...SERVICES_CLEANING, ...SERVICES_HVAC];
const CLEANING_IDS = new Set(SERVICES_CLEANING.map(s => s.id));
const HVAC_IDS = new Set(SERVICES_HVAC.map(s => s.id));

type DealType = 'Cleaning' | 'Insulation' | 'Aeroseal' | 'HVAC';

/** CRM deal type per service. Insulation and Aeroseal are each their own
 *  bucket, separate from regular cleaning. */
const DEAL_TYPE_BY_SERVICE: Record<string, DealType> = {
  'air-duct-dryer': 'Cleaning',
  'duct-cleaning': 'Cleaning',
  'mold-remediation': 'Cleaning',
  'dryer-vent': 'Cleaning',
  'wall-unit': 'Cleaning',
  'carpet-cleaning': 'Cleaning',
  'high-dusting': 'Cleaning',
  'other': 'Cleaning',
  'insulation': 'Insulation',
  'duct-sealing': 'Aeroseal',
  'hvac-install': 'HVAC',
  'ac-install': 'HVAC',
  'ac-repair': 'HVAC',
  'furnace-install': 'HVAC',
  'furnace-repair': 'HVAC',
  'heat-pump-install': 'HVAC',
  'boiler': 'HVAC',
  'water-heater': 'HVAC',
  'mini-split-ductless': 'HVAC',
  'duct-replacement': 'HVAC',
};

/** Collapse the selected services to a single deal type. Priority order when
 *  a request spans buckets: HVAC > Insulation > Aeroseal > Cleaning.
 *  Insulation beats Aeroseal so an Insulation + Aeroseal combo routes as
 *  Insulation. */
function resolveDealType(serviceIds: string[]): DealType | '' {
  const types = new Set(serviceIds.map(id => DEAL_TYPE_BY_SERVICE[id]).filter(Boolean));
  if (types.has('HVAC')) return 'HVAC';
  if (types.has('Insulation')) return 'Insulation';
  if (types.has('Aeroseal')) return 'Aeroseal';
  if (types.has('Cleaning')) return 'Cleaning';
  return '';
}

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
  howDidYouHear: string;  // referral-source value; prefilled into the booking form's matching field
  eventId: string;  // the lead webhook's event_id, reused by the booking webhook to correlate
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
  const [howDidYouHear, setHowDidYouHear] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  /* Cloudinary URL of the most recent dictation, returned by
     /api/transcribe. Forwarded to the lead webhook as recording_url
     so operators can listen to what the customer said. */
  const [recordingUrl, setRecordingUrl] = useState<string>('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRafRef = useRef<number | null>(null);

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

  /* ── Voice-to-text (ElevenLabs Scribe via /api/transcribe) ──
     Records via MediaRecorder, posts the blob to our own edge function
     (keeps the API key server-side), appends the returned text to the
     existing message so users can dictate into a partially-typed note. */
  const startRecording = async () => {
    setTranscribeError('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setTranscribeError(t('Voice input is not supported in this browser.', "L'entrée vocale n'est pas prise en charge dans ce navigateur."));
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setTranscribeError(t('Microphone access denied.', 'Accès au microphone refusé.'));
      return;
    }
    const preferred = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
    const mimeType = preferred.find(m => typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(m));
    const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    audioChunksRef.current = [];
    mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };

    /* Wire an AnalyserNode to the same stream so the mic-button "wave"
       bars react to real audio levels. Cleaned up in mr.onstop. */
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx) {
        const audioCtx = new Ctx();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.6;
        source.connect(analyser);
        const buf = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteFrequencyData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) sum += buf[i];
          // Normalize 0–1 and bias upward so soft speech still moves the bars.
          const avg = sum / buf.length / 255;
          setAudioLevel(Math.min(1, avg * 2.5));
          analyserRafRef.current = requestAnimationFrame(tick);
        };
        audioCtxRef.current = audioCtx;
        analyserRafRef.current = requestAnimationFrame(tick);
      }
    } catch { /* analyser is decorative — recording still works without it */ }

    mr.onstop = async () => {
      stream.getTracks().forEach(tr => tr.stop());
      if (analyserRafRef.current !== null) {
        cancelAnimationFrame(analyserRafRef.current);
        analyserRafRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      setAudioLevel(0);
      const blob = new Blob(audioChunksRef.current, { type: mr.mimeType || 'audio/webm' });
      audioChunksRef.current = [];
      if (blob.size === 0) return;
      setIsTranscribing(true);
      try {
        const fd = new FormData();
        const ext = (mr.mimeType || '').includes('mp4') ? 'm4a' : 'webm';
        fd.append('file', blob, `recording.${ext}`);
        fd.append('language_code', lang === 'fr' ? 'fra' : 'eng');
        const res = await fetch('/api/transcribe', { method: 'POST', body: fd });
        const data = await res.json().catch(() => ({} as { text?: string; recording_url?: string; error?: string }));
        if (!res.ok) {
          setTranscribeError(data?.error || t('Transcription failed.', 'Échec de la transcription.'));
        } else {
          if (data.text) setMessage(prev => (prev.trim() ? prev.trimEnd() + ' ' : '') + data.text!.trim());
          if (data.recording_url) setRecordingUrl(data.recording_url);
        }
      } catch {
        setTranscribeError(t('Could not reach transcription service.', 'Impossible de joindre le service de transcription.'));
      } finally {
        setIsTranscribing(false);
      }
    };
    mediaRecorderRef.current = mr;
    mr.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    const mr = mediaRecorderRef.current;
    if (mr && isRecording) {
      mr.stop();
      mediaRecorderRef.current = null;
      setIsRecording(false);
    }
  };

  const validate = (): string => {
    if (!firstName.trim()) return t('Please enter your first name.', 'Veuillez entrer votre prénom.');
    if (!lastName.trim())  return t('Please enter your last name.',  'Veuillez entrer votre nom de famille.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return t('Please enter a valid email.', 'Veuillez entrer un courriel valide.');
    if (!isValidPhone(phone))                              return t('Please enter a valid phone number.', 'Veuillez entrer un numéro de téléphone valide.');
    if (!parts.formatted || !parts.city)                  return t('Please select your address from the suggestions.', 'Veuillez sélectionner votre adresse dans les suggestions.');
    if (!sector)                                           return t('Please choose a sector.', 'Veuillez choisir un secteur.');
    if (services.length === 0)                             return t('Please choose at least one service.', 'Veuillez choisir au moins un service.');
    if (hasOtherSelected && !otherServiceText.trim()) return t('Please describe the service you’re looking for.', 'Veuillez décrire le service souhaité.');
    if (!howDidYouHear)                                   return t('Please tell us how you heard about us.', 'Veuillez nous indiquer comment vous nous avez connus.');
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
      deal_type: resolveDealType(services),                  // 'Cleaning' | 'Insulation&Aeroseal' | 'HVAC' (priority: HVAC > Insulation&Aeroseal > Cleaning)
      services: services.map(id => {
        const label = ALL_SERVICES.find(s => s.id === id)?.label.en ?? id;
        // Inline the user's description on the "Other" tile so the services
        // array carries it too — not just the standalone field below.
        if (id === 'other' && otherServiceText.trim()) {
          return `Other services: ${otherServiceText.trim()}`;
        }
        return label;
      }),
      service_ids: services,
      other_service_description: hasOtherSelected ? otherServiceText.trim() : '',
      how_did_you_hear: HOW_DID_YOU_HEAR.find(o => o.value === howDidYouHear)?.label.en ?? howDidYouHear,
      how_did_you_hear_id: howDidYouHear,
      message: message.trim(),
      recording_url: recordingUrl,
      sms_opt_in: smsOptIn,
      agreed_to_policy: agreed,
      proceed_to_booking: proceedToBooking,
      ineligibility_reasons: reasons,
      ...tracking,
      submitted_at: new Date().toISOString(),
    };

    // Test bypass: "Test Boi" (case-insensitive) runs through the flow without
    // posting to the lead webhook so we can rehearse without polluting n8n.
    const isTestSubmission =
      firstName.trim().toLowerCase() === 'test' && lastName.trim().toLowerCase() === 'boi';

    if (LEAD_WEBHOOK && !isTestSubmission) {
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
        howDidYouHear,
        eventId,
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
            <div>
              <input
                type="tel"
                autoComplete="tel"
                inputMode="numeric"
                maxLength={14}
                placeholder={t('Phone (xxx) xxx-xxxx*', 'Téléphone (xxx) xxx-xxxx*')}
                value={phone}
                onChange={(e) => {
                  const formatted = formatPhone(e.target.value);
                  setPhone(formatted);
                  const digits = formatted.replace(/\D/g, '');
                  if (digits.length > 0 && !isValidPhone(formatted)) {
                    setPhoneError(t('Please enter a valid phone number.', 'Veuillez entrer un numéro de téléphone valide.'));
                  } else {
                    setPhoneError('');
                  }
                }}
                className={pill}
              />
              {phoneError && (
                <p className="text-[12px] text-red-300 font-medium mt-1.5 ml-1">{phoneError}</p>
              )}
            </div>
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
              onFocus={loadGoogleMaps}
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
          <div>
            <div className="relative">
              <textarea
                placeholder={t('Message (optional)', 'Message (facultatif)')}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                className="w-full bg-white rounded-3xl px-5 py-3 pr-14 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none border-0"
              />
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isTranscribing}
                aria-label={
                  isRecording
                    ? t('Stop recording', "Arrêter l'enregistrement")
                    : isTranscribing
                      ? t('Transcribing', 'Transcription en cours')
                      : t('Voice input', 'Entrée vocale')
                }
                title={
                  isRecording
                    ? t('Stop recording', "Arrêter l'enregistrement")
                    : t('Tap to dictate', 'Appuyez pour dicter')
                }
                className={`absolute bottom-2.5 right-2.5 w-9 h-9 rounded-full flex items-center justify-center transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                  isRecording
                    ? 'bg-red-500 text-white shadow-lg shadow-red-200'
                    : 'bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-700'
                }`}
              >
                {isTranscribing
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : isRecording
                    ? <MicWave level={audioLevel} />
                    : <Mic className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-end justify-end gap-1.5 mt-1.5 px-2">
              <span className="text-[11px] text-blue-200 font-medium">
                {t('Use the mic to write your message', 'Utilisez le micro pour dicter votre message')}
              </span>
              <ArrowUp className="w-4 h-4 text-blue-200 mr-2.5 animate-bounce shrink-0" />
            </div>
            {transcribeError && (
              <p className="text-[12px] text-red-300 mt-1 ml-2">{transcribeError}</p>
            )}
          </div>

          {/* ── How did you hear about us? (mirrors the booking form; prefilled there) ── */}
          <FieldGroup label={t('How did you hear about us?', 'Comment nous avez-vous connus?')} required>
            <select
              value={howDidYouHear}
              onChange={(e) => setHowDidYouHear(e.target.value)}
              className={`${pill} appearance-none cursor-pointer ${howDidYouHear ? 'text-gray-900' : 'text-gray-400'}`}
            >
              {HOW_DID_YOU_HEAR.map((opt) => (
                <option key={opt.value} value={opt.value} className="text-gray-900">
                  {opt.label[lang]}
                </option>
              ))}
            </select>
          </FieldGroup>

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
