import { useLang } from '../../context/LanguageContext';
import AddressAutocomplete from './AddressAutocomplete';
import {
  LANGUAGE_PREFERENCES,
  PROVINCES,
  UNIT_LOCATIONS,
  SPECIAL_REQUESTS,
  HOW_DID_YOU_HEAR,
} from '../../data/step3Options';
import { brand } from '../../brand';

export interface Step3Data {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  languagePreference: string;
  streetAddress: string;
  city: string;
  stateCode: string;
  zip: string;
  province: string;
  yearBuilt: string;
  unitLocation: string;
  unitLocationFee: number;
  hasParking: string;
  parkingFee: number;
  aboveThirdFloor: string;
  aboveThirdFloorFee: number;
  parkingFar: string;
  parkingFarFee: number;
  carpetFloor: string;
  carpetFloorFee: number;
  lastCleaning: string;
  renovationsSince: string;
  specialRequest: string;
  howDidYouHear: string;
  specialNotes: string;
  agreementChecked: boolean;
}

export const EMPTY_STEP3: Step3Data = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  languagePreference: 'english',
  streetAddress: '',
  city: '',
  stateCode: '',
  zip: '',
  province: 'Québec',
  yearBuilt: '',
  unitLocation: 'standard',
  unitLocationFee: 0,
  hasParking: 'yes',
  parkingFee: 0,
  aboveThirdFloor: 'no',
  aboveThirdFloorFee: 0,
  parkingFar: 'no',
  parkingFarFee: 0,
  carpetFloor: 'no',
  carpetFloorFee: 0,
  lastCleaning: 'last-year',
  renovationsSince: 'no',
  specialRequest: 'none',
  howDidYouHear: '',
  specialNotes: '',
  agreementChecked: false,
};

interface Props {
  data: Step3Data;
  onChange: (data: Step3Data) => void;
  categoryId?: string | null;
}

/* Reusable labelled field wrapper */
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  'border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full bg-white';

const selectCls =
  'border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full bg-white appearance-none';

export default function Step3({ data, onChange, categoryId }: Props) {
  const { lang } = useLang();
  const isCarpet = categoryId === 'carpet';
  const showHvacFields = categoryId === 'central-air' || categoryId === 'air-exchanger';

  const set = (key: keyof Step3Data, value: string | boolean | number) => {
    onChange({ ...data, [key]: value });
  };

  const handleUnitLocationChange = (value: string) => {
    const opt = UNIT_LOCATIONS.find((o) => o.value === value);
    onChange({ ...data, unitLocation: value, unitLocationFee: opt?.fee ?? 0 });
  };

  // HVAC portable unit fee: $149 max once across parking/distance/floor
  const calcHvacPortableFee = (parking: string, far: string, floor: string) =>
    (parking === 'no' || far === 'yes' || floor === 'yes') ? 149 : 0;

  const handleParkingChange = (value: string) => {
    // If no parking, reset Q2 since it's hidden
    const fee = calcHvacPortableFee(value, 'no', data.aboveThirdFloor);
    onChange({ ...data, hasParking: value, parkingFar: 'no', parkingFarFee: 0, parkingFee: fee, aboveThirdFloorFee: 0 });
  };

  const handleHvacParkingFarChange = (value: string) => {
    const fee = calcHvacPortableFee(data.hasParking, value, data.aboveThirdFloor);
    onChange({ ...data, parkingFar: value, parkingFarFee: 0, parkingFee: fee, aboveThirdFloorFee: 0 });
  };

  const handleFloorChange = (value: string) => {
    const fee = calcHvacPortableFee(data.hasParking, data.parkingFar, value);
    onChange({ ...data, aboveThirdFloor: value, parkingFee: fee, aboveThirdFloorFee: 0 });
  };

  // Carpet portable unit fee: $40 max once, regardless of how many reasons
  const calcPortableFee = (parking: string, far: string, floor: string) =>
    (parking === 'no' || far === 'yes' || floor === 'yes') ? 40 : 0;

  const handleCarpetParkingChange = (value: string) => {
    const fee = calcPortableFee(value, 'no', data.carpetFloor);
    onChange({
      ...data,
      hasParking: value,
      parkingFee: fee,
      parkingFar: 'no',
      parkingFarFee: 0,
      carpetFloorFee: 0,
    });
  };

  const handleParkingFarChange = (value: string) => {
    const fee = calcPortableFee(data.hasParking, value, data.carpetFloor);
    onChange({ ...data, parkingFar: value, parkingFarFee: 0, parkingFee: fee });
  };

  const handleCarpetFloorChange = (value: string) => {
    const fee = calcPortableFee(data.hasParking, data.parkingFar, value);
    onChange({ ...data, carpetFloor: value, carpetFloorFee: 0, parkingFee: fee });
  };

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    let formatted = '';
    if (digits.length >= 7) {
      formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length >= 4) {
      formatted = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else if (digits.length > 0) {
      formatted = `(${digits}`;
    }
    set('phone', formatted);
  };

  const handleAddressChange = (address: string, province?: string, parts?: { address: string; city: string; stateCode: string; zip: string; province: string }) => {
    onChange({
      ...data,
      streetAddress: address,
      ...(province ? { province } : {}),
      ...(parts ? { city: parts.city, stateCode: parts.stateCode, zip: parts.zip } : {}),
    });
  };

  const t = (obj: Record<string, string>) => obj[lang] ?? obj['en'];

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-gray-800">
        {lang === 'en' ? '3. Your Details' : '3. Vos coordonnées'}
      </h2>

      {/* ── Contact Information ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-base font-bold text-gray-800 mb-5">
          {lang === 'en' ? 'Contact Information' : 'Coordonnées'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={lang === 'en' ? 'First Name' : 'Prénom'} required>
            <input
              type="text"
              value={data.firstName}
              onChange={(e) => set('firstName', e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label={lang === 'en' ? 'Last Name' : 'Nom de famille'} required>
            <input
              type="text"
              value={data.lastName}
              onChange={(e) => set('lastName', e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label={lang === 'en' ? 'Email' : 'Courriel'} required>
            <input
              type="email"
              value={data.email}
              onChange={(e) => set('email', e.target.value)}
              className={inputCls}
            />
            {data.email.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()) && (
              <p className="text-xs text-red-500 mt-1">
                {lang === 'en' ? 'Please enter a valid email address.' : 'Veuillez entrer une adresse courriel valide.'}
              </p>
            )}
          </Field>

          <Field label={lang === 'en' ? 'Cell Phone' : 'Téléphone cellulaire'} required>
            <input
              type="tel"
              value={data.phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="(514) 555-1234"
              className={inputCls}
            />
          </Field>

          <Field label={lang === 'en' ? 'Language Preference' : 'Préférence de langue'}>
            <select
              value={data.languagePreference}
              onChange={(e) => set('languagePreference', e.target.value)}
              className={selectCls}
            >
              {LANGUAGE_PREFERENCES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.label)}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      {/* ── Property Details ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-base font-bold text-gray-800 mb-5">
          {lang === 'en' ? 'Property Details' : 'Détails de la propriété'}
        </h3>
        <div className="space-y-4">
          <Field label={lang === 'en' ? 'Street Address' : 'Adresse'} required>
            <AddressAutocomplete
              value={data.streetAddress}
              onChange={handleAddressChange}
              placeholder={lang === 'en' ? 'Start typing your address...' : 'Commencez à taper votre adresse...'}
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={lang === 'en' ? 'Province (For Taxes)' : 'Province (pour les taxes)'}>
              <select
                value={data.province}
                onChange={(e) => set('province', e.target.value)}
                className={selectCls}
              >
                {PROVINCES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.label)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={lang === 'en' ? 'Year Home Was Built' : 'Année de construction'}>
              <input
                type="number"
                value={data.yearBuilt}
                onChange={(e) => set('yearBuilt', e.target.value)}
                placeholder="e.g. 1985"
                min={1800}
                max={new Date().getFullYear()}
                className={inputCls}
              />
            </Field>
          </div>

          {showHvacFields && (
            <>
              <Field label={lang === 'en' ? 'Main Unit (Furnace or Air Exchanger) Location' : 'Emplacement de l\'unité principale'}>
                <select
                  value={data.unitLocation}
                  onChange={(e) => handleUnitLocationChange(e.target.value)}
                  className={selectCls}
                >
                  {UNIT_LOCATIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {t(opt.label)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label={lang === 'en' ? 'Do you have guaranteed parking?' : 'Avez-vous un stationnement garanti?'}>
                <select
                  value={data.hasParking}
                  onChange={(e) => handleParkingChange(e.target.value)}
                  className={selectCls}
                >
                  <option value="yes">{lang === 'en' ? 'Yes' : 'Oui'}</option>
                  <option value="no">{lang === 'en' ? 'No — $149.00 Fee (Portable unit may be needed)' : 'Non — Frais de 149,00$ (Unité portable possiblement requise)'}</option>
                </select>
              </Field>

              {data.hasParking === 'yes' && (
                <Field label={lang === 'en' ? 'Is your parking over 100 feet from the entrance?' : 'Votre stationnement est-il à plus de 100 pieds de l\'entrée?'}>
                  <select
                    value={data.parkingFar}
                    onChange={(e) => handleHvacParkingFarChange(e.target.value)}
                    className={selectCls}
                  >
                    <option value="no">{lang === 'en' ? 'No' : 'Non'}</option>
                    <option value="yes">{lang === 'en' ? 'Yes — $149.00 Fee (Portable unit may be needed)' : 'Oui — Frais de 149,00$ (Unité portable possiblement requise)'}</option>
                  </select>
                </Field>
              )}

              <Field label={lang === 'en' ? 'Is the unit above 3rd floor?' : 'L\'unité est-elle au-dessus du 3e étage?'}>
                <select
                  value={data.aboveThirdFloor}
                  onChange={(e) => handleFloorChange(e.target.value)}
                  className={selectCls}
                >
                  <option value="no">{lang === 'en' ? 'No' : 'Non'}</option>
                  <option value="yes">{lang === 'en' ? 'Yes — $149.00 Fee (Portable unit may be needed)' : 'Oui — Frais de 149,00$ (Unité portable possiblement requise)'}</option>
                </select>
              </Field>
            </>
          )}

          {isCarpet && (
            <>
              <Field label={lang === 'en' ? 'Do you have guaranteed parking?' : 'Avez-vous un stationnement garanti?'}>
                <select
                  value={data.hasParking}
                  onChange={(e) => handleCarpetParkingChange(e.target.value)}
                  className={selectCls}
                >
                  <option value="yes">{lang === 'en' ? 'Yes' : 'Oui'}</option>
                  <option value="no">{lang === 'en' ? 'No — $40.00 Fee (Portable unit may be needed)' : 'Non — Frais de 40,00$ (Unité portable possiblement requise)'}</option>
                </select>
              </Field>

              {data.hasParking === 'yes' && (
                <Field label={lang === 'en' ? 'Is your parking over 100 feet from the entrance?' : 'Votre stationnement est-il à plus de 100 pieds de l\'entrée?'}>
                  <select
                    value={data.parkingFar}
                    onChange={(e) => handleParkingFarChange(e.target.value)}
                    className={selectCls}
                  >
                    <option value="no">{lang === 'en' ? 'No' : 'Non'}</option>
                    <option value="yes">{lang === 'en' ? 'Yes — $40.00 Fee (Portable unit may be needed)' : 'Oui — Frais de 40,00$ (Unité portable possiblement requise)'}</option>
                  </select>
                </Field>
              )}

              <Field label={lang === 'en' ? 'Is the area on 3rd floor or higher?' : 'La zone est-elle au 3e étage ou plus?'}>
                <select
                  value={data.carpetFloor}
                  onChange={(e) => handleCarpetFloorChange(e.target.value)}
                  className={selectCls}
                >
                  <option value="no">{lang === 'en' ? 'No' : 'Non'}</option>
                  <option value="yes">{lang === 'en' ? 'Yes — $40.00 Fee (may vary, TBD)' : 'Oui — Frais de 40,00$ (peut varier, à confirmer)'}</option>
                </select>
              </Field>
            </>
          )}
        </div>
      </div>

      {/* ── Requests ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-base font-bold text-gray-800 mb-5">
          {lang === 'en' ? 'Requests' : 'Demandes'}
        </h3>
        <div className="space-y-4">
          <Field label={lang === 'en' ? 'Customer Special Request' : 'Demande spéciale'}>
            <select
              value={data.specialRequest}
              onChange={(e) => set('specialRequest', e.target.value)}
              className={selectCls}
            >
              {SPECIAL_REQUESTS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.label)}
                </option>
              ))}
            </select>
          </Field>

          <Field label={lang === 'en' ? 'How Did You Hear About Us?' : 'Comment nous avez-vous connus?'}>
            <select
              value={data.howDidYouHear}
              onChange={(e) => set('howDidYouHear', e.target.value)}
              className={selectCls}
            >
              {HOW_DID_YOU_HEAR.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.label)}
                </option>
              ))}
            </select>
          </Field>

          <Field label={lang === 'en' ? 'Special Notes (Optional)' : 'Notes spéciales (facultatif)'}>
            <textarea
              value={data.specialNotes}
              onChange={(e) => set('specialNotes', e.target.value)}
              placeholder={lang === 'en' ? 'Any specific instructions for our team?' : 'Des instructions spécifiques pour notre équipe?'}
              rows={4}
              className={`${inputCls} resize-y`}
            />
          </Field>
        </div>
      </div>

      {/* ── Service Agreement ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={data.agreementChecked}
            onChange={(e) => set('agreementChecked', e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-blue-700 shrink-0"
          />
          <span className="text-sm text-gray-700">
            {lang === 'en' ? 'I confirm I have read and understand the ' : 'Je confirme avoir lu et compris la '}
            <a href={brand.privacyUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">
              {lang === 'en' ? 'Service Agreement & Precautions' : 'Entente de service et précautions'}
            </a>
            .{' '}
            <span className="text-red-500 font-bold">*</span>
          </span>
        </label>
      </div>
    </div>
  );
}
