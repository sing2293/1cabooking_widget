import { Plus, Trash2 } from 'lucide-react';
import {
  AREA_RUG_MIN,
  RUG_RATES,
  RUG_PROTECTION_RATE,
  rugSqft,
  rugLinePrice,
  rugsSubtotal,
  type RugEntry,
} from '../../data/extras';
import { useLang } from '../../context/LanguageContext';

interface Props {
  rugs: RugEntry[];
  onChange: (rugs: RugEntry[]) => void;
}

const fmt = (n: number) =>
  '$' + n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

let rugSeq = 0;
const newRugId = () => `rug-${Date.now()}-${rugSeq++}`;

export default function RugBuilder({ rugs, onChange }: Props) {
  const { lang } = useLang();

  const addRug = () => {
    onChange([
      ...rugs,
      { id: newRugId(), type: 'synthetic', lengthFt: 8, widthFt: 5, location: 'in-shop', protection: false },
    ]);
  };

  const updateRug = (id: string, patch: Partial<RugEntry>) => {
    onChange(rugs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRug = (id: string) => {
    onChange(rugs.filter((r) => r.id !== id));
  };

  const subtotal = rugsSubtotal(rugs);
  const shortfall = subtotal > 0 ? Math.max(0, AREA_RUG_MIN - subtotal) : 0;

  const numInput = (value: number, onVal: (n: number) => void) => (
    <input
      type="number"
      min={1}
      step={0.5}
      value={value}
      onChange={(e) => onVal(Math.max(0, parseFloat(e.target.value) || 0))}
      className="w-16 border border-gray-300 rounded px-1.5 py-1.5 text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );

  return (
    <div className="space-y-4">
      {/* Rug cards */}
      {rugs.map((rug, idx) => {
        const sqft = rugSqft(rug);
        const rate = RUG_RATES[rug.type][rug.location] + (rug.protection ? RUG_PROTECTION_RATE : 0);
        return (
          <div key={rug.id} className="bg-white border-2 border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 text-sm">
                {lang === 'en' ? `Rug ${idx + 1}` : `Carpette ${idx + 1}`}
              </h3>
              <button
                onClick={() => removeRug(rug.id)}
                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 font-semibold transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {lang === 'en' ? 'Remove' : 'Retirer'}
              </button>
            </div>

            {/* Type */}
            <div className="flex rounded-lg overflow-hidden border border-gray-200 mb-3">
              <button
                onClick={() => updateRug(rug.id, { type: 'synthetic' })}
                className={`flex-1 py-1.5 text-xs font-semibold transition-colors ${
                  rug.type === 'synthetic' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {lang === 'en' ? 'Polyester / Synthetic' : 'Polyester / Synthétique'}
              </button>
              <button
                onClick={() => updateRug(rug.id, { type: 'wool' })}
                className={`flex-1 py-1.5 text-xs font-semibold transition-colors ${
                  rug.type === 'wool' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {lang === 'en' ? 'Wool / Specialty' : 'Laine / Spécialité'}
              </button>
            </div>

            {/* Location */}
            <div className="flex rounded-lg overflow-hidden border border-gray-200 mb-3">
              <button
                onClick={() => updateRug(rug.id, { location: 'in-shop' })}
                className={`flex-1 py-1.5 text-xs font-semibold transition-colors ${
                  rug.location === 'in-shop' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {lang === 'en' ? '🏭 In-Shop (Pickup & Delivery)' : '🏭 En atelier (cueillette incl.)'}
              </button>
              <button
                onClick={() => updateRug(rug.id, { location: 'on-site' })}
                className={`flex-1 py-1.5 text-xs font-semibold transition-colors ${
                  rug.location === 'on-site' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {lang === 'en' ? '🏠 On-Site (½ price)' : '🏠 Sur place (½ prix)'}
              </button>
            </div>

            {/* Dimensions */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-gray-600">
                {lang === 'en' ? 'Dimensions:' : 'Dimensions:'}
              </span>
              {numInput(rug.lengthFt, (n) => updateRug(rug.id, { lengthFt: n }))}
              <span className="text-xs text-gray-500">×</span>
              {numInput(rug.widthFt, (n) => updateRug(rug.id, { widthFt: n }))}
              <span className="text-xs text-gray-500">{lang === 'en' ? 'ft' : 'pi'}</span>
              <span className="text-xs text-gray-400 ml-1">
                = {sqft} {lang === 'en' ? 'sq ft' : 'pi²'}
              </span>
            </div>

            {/* Protection */}
            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={rug.protection}
                onChange={(e) => updateRug(rug.id, { protection: e.target.checked })}
                className="w-4 h-4 accent-blue-600"
              />
              <span className="text-xs text-gray-700">
                {lang === 'en'
                  ? `Add protective treatment (+$${RUG_PROTECTION_RATE.toFixed(2)}/sq ft)`
                  : `Ajouter le traitement protecteur (+${RUG_PROTECTION_RATE.toFixed(2)}$/pi²)`}
              </span>
            </label>

            {/* Line price */}
            <div className="flex justify-between items-center border-t border-gray-100 pt-2">
              <span className="text-xs text-gray-500">
                {sqft} {lang === 'en' ? 'sq ft' : 'pi²'} × ${rate.toFixed(2)}
              </span>
              <span className="text-base font-bold text-blue-600">{fmt(rugLinePrice(rug))}</span>
            </div>
          </div>
        );
      })}

      {/* Add rug */}
      <button
        onClick={addRug}
        className="w-full py-3 rounded-xl border-2 border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        {rugs.length === 0
          ? (lang === 'en' ? 'Add a Rug' : 'Ajouter une carpette')
          : (lang === 'en' ? 'Add Another Rug' : 'Ajouter une autre carpette')}
      </button>

      {/* Totals + minimum progress */}
      {rugs.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-1.5">
          <div className="flex justify-between text-sm font-bold text-gray-900">
            <span>{lang === 'en' ? 'Rug total' : 'Total carpettes'}</span>
            <span>{fmt(subtotal)}</span>
          </div>
          {shortfall > 0 && (
            <p className="text-[11px] text-amber-700 leading-snug">
              {lang === 'en'
                ? `⚠ Add ${fmt(shortfall)} more to reach the $${AREA_RUG_MIN} minimum — add another rug or increase dimensions to continue.`
                : `⚠ Ajoutez ${fmt(shortfall)} de plus pour atteindre le minimum de ${AREA_RUG_MIN}$ — ajoutez une autre carpette ou augmentez les dimensions pour continuer.`}
            </p>
          )}
        </div>
      )}

      {/* Info note */}
      <p className="text-[11px] text-blue-800 bg-blue-50 border border-blue-200 rounded-md px-3 py-2 leading-snug">
        ℹ️ {lang === 'en'
          ? `In-shop cleaning includes pickup & delivery (approx. 10 business days). Rugs cleaned on-site (driveway/deck/patio) are half price. Minimum charge $${AREA_RUG_MIN} per pickup.`
          : `Le nettoyage en atelier inclut cueillette et livraison (env. 10 jours ouvrables). Les carpettes nettoyées sur place sont à moitié prix. Frais minimum de ${AREA_RUG_MIN}$ par cueillette.`}
      </p>
    </div>
  );
}
