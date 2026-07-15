import { useLang } from '../context/LanguageContext';
import { CheckCircle2, Trash2 } from 'lucide-react';
import type { Step1Selection } from './step1/Step1';
import { EXTRAS, extraPrice, hasTierToggle, rugSqft, rugLinePrice, rugsSubtotal, extraRowsTotal, allRowExtrasTotal, type RugEntry } from '../data/extras';
import { PROVINCE_TAXES } from '../data/step3Options';

interface Props {
  step: number;
  step1: Step1Selection;
  selectedExtras?: Record<string, number>;
  carpetTiers?: Record<string, 'clean' | 'protect'>;
  dryerVentLocations?: Record<string, number>;
  areaRugs?: RugEntry[];
  province?: string;
  unitLocationFee?: number;
  parkingFee?: number;
  floorFee?: number;
  parkingFarFee?: number;
  carpetFloorFee?: number;
  feeReasons?: { unitLocation?: string; noParking?: boolean; parkingFar?: boolean; aboveFloor?: boolean; carpetFloor?: boolean };
  couponCode?: string;
  couponDiscount?: number;
  onCouponCodeChange?: (v: string) => void;
  onCouponApply?: () => void;
  onRemoveExtra?: (id: string) => void;
  onClearRowExtra?: (id: string) => void;
}

const fmt = (n: number) =>
  '$' + n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ServiceSummary({
  step,
  step1,
  selectedExtras = {},
  carpetTiers = {},
  dryerVentLocations = {},
  areaRugs = [],
  province = 'Québec',
  unitLocationFee = 0,
  parkingFee = 0,
  floorFee = 0,
  parkingFarFee = 0,
  carpetFloorFee = 0,
  feeReasons = {},
  couponCode = '',
  couponDiscount = 0,
  onCouponCodeChange,
  onCouponApply,
  onRemoveExtra,
  onClearRowExtra,
}: Props) {
  const { t, lang } = useLang();

  /* ── Step 1 sidebar ── */
  if (step === 1) {
    /* A preserved carpet cart stays visible while the customer browses sub-services */
    const cartEntries = Object.entries(selectedExtras).filter(([, qty]) => qty > 0);
    const cartTotal = cartEntries.reduce((sum, [id, qty]) => {
      const extra = EXTRAS.find((e) => e.id === id);
      return extra ? sum + extraPrice(extra, carpetTiers[id]) * qty : sum;
    }, 0) + rugsSubtotal(areaRugs);
    const total = step1.subtotal + cartTotal;
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 sm:p-5 lg:sticky lg:top-4">
        <h3 className="text-base font-bold text-gray-800 border-b border-gray-200 pb-3 mb-4">
          {lang === 'en' ? 'Service Summary' : 'Résumé du service'}
        </h3>
        <div className="space-y-2 mb-4">
          {step1.summaryLines.length === 0 && cartEntries.length === 0 && areaRugs.length === 0 ? (
            <div className="flex justify-between text-sm text-gray-500">
              <span>{lang === 'en' ? 'Subtotal' : 'Sous-total'}</span>
              <span>{fmt(0)}</span>
            </div>
          ) : (
            <>
              {step1.summaryLines.map((l, i) => (
                <div key={i} className="flex justify-between text-sm text-gray-700">
                  <span className="pr-2">{l.label}</span>
                  <span className="font-medium">{fmt(l.amount)}</span>
                </div>
              ))}
              {cartEntries.map(([id, qty]) => {
                const extra = EXTRAS.find((e) => e.id === id);
                if (!extra) return null;
                const price = extraPrice(extra, carpetTiers[id]);
                return (
                  <div key={id} className="flex justify-between text-sm text-gray-700">
                    <span className="pr-2">{t(extra.name)}{qty > 1 ? ` × ${qty}` : ''}</span>
                    <span className="font-medium">{extra.priceDisplay ? t(extra.priceDisplay) : fmt(price * qty)}</span>
                  </div>
                );
              })}
              {areaRugs.map((rug, i) => (
                <div key={rug.id} className="flex justify-between text-sm text-gray-700">
                  <span className="pr-2">
                    {lang === 'en' ? `Rug ${i + 1}` : `Carpette ${i + 1}`} ({rugSqft(rug)} {lang === 'en' ? 'sq ft' : 'pi²'})
                  </span>
                  <span className="font-medium">{fmt(rugLinePrice(rug))}</span>
                </div>
              ))}
            </>
          )}
        </div>
        <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
          <span className="font-bold text-blue-700 text-base">{lang === 'en' ? 'Total' : 'Total'}</span>
          <span className="font-bold text-blue-700 text-xl">{fmt(total)}</span>
        </div>
      </div>
    );
  }

  /* ── Step 2+ sidebar ── */
  const rowExtras = EXTRAS.filter((e) => e.dryerLocations);
  const rowExtrasTotal = allRowExtrasTotal(dryerVentLocations);

  const extrasTotal = Object.entries(selectedExtras).reduce((sum, [id, qty]) => {
    const extra = EXTRAS.find((e) => e.id === id);
    if (!extra) return sum;
    return sum + extraPrice(extra, carpetTiers[id]) * qty;
  }, 0) + rowExtrasTotal + rugsSubtotal(areaRugs);

  const subtotal = step1.subtotal + extrasTotal + unitLocationFee + parkingFee + floorFee + parkingFarFee + carpetFloorFee - couponDiscount;
  const taxInfo = PROVINCE_TAXES[province] ?? PROVINCE_TAXES['Québec'];
  const taxLines = taxInfo.lines.map((l) => ({ label: l.label, amount: subtotal * l.rate }));
  const totalTax = taxLines.reduce((s, l) => s + l.amount, 0);
  const total = subtotal + totalTax;

  const selectedExtraEntries = Object.entries(selectedExtras).filter(([, qty]) => qty > 0);

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 sm:p-5 lg:sticky lg:top-4 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto">
      <h3 className="text-base font-bold text-gray-800 border-b border-gray-200 pb-3 mb-4">
        {lang === 'en' ? 'Service Summary' : 'Résumé du service'}
      </h3>

      {/* Row-based package summary (dryer vent locations / wall unit heights) */}
      {(step1.categoryId === 'dryer-vent' || step1.categoryId === 'wall-unit') && step1.summaryLines.length > 0 && (
        <div className="mb-3">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">
              {step1.packageName ? t(step1.packageName) : (lang === 'en' ? 'Service' : 'Service')}
            </span>
            <span className="text-sm font-semibold text-gray-900">{fmt(step1.subtotal)}</span>
          </div>
          <div className="space-y-0.5">
            {step1.summaryLines.map((line, i) => (
              <div key={i} className="flex justify-between text-[10px] text-gray-500 pl-2">
                <span>{line.label}</span>
                <span>{fmt(line.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Base package section (hidden for carpet, dryer vent & wall unit) */}
      {step1.packageName && step1.categoryId !== 'carpet' && step1.categoryId !== 'dryer-vent' && step1.categoryId !== 'wall-unit' && (
        <div className="mb-3">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">
              {lang === 'en' ? 'Base Package' : 'Forfait de base'}
            </span>
            <span className="text-sm font-semibold text-gray-900">{fmt(step1.basePrice)}</span>
          </div>
          <div className="space-y-0.5 mb-2">
            {step1.includes.map((item, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0 mt-0.5" />
                <span className="text-[11px] text-gray-500 leading-snug">{t(item)}</span>
              </div>
            ))}
          </div>
          {(step1.categoryId === 'central-air' || step1.categoryId === 'air-exchanger') && (
            <div className="flex justify-between items-center mt-1.5">
              <span className="text-[11px] text-gray-500">• {lang === 'en' ? 'Vents' : 'Bouches'}</span>
              {step1.ventMode === 'arrival' ? (
                <span className="text-[11px] text-blue-600 font-semibold">
                  {lang === 'en' ? 'Plus Vents (TBD)' : 'Plus bouches (À déterminer)'}
                </span>
              ) : step1.ventCount <= 10 ? (
                <span className="text-[11px] text-green-600 font-semibold">
                  {step1.ventCount} {lang === 'en' ? 'Included' : 'Incluses'}
                </span>
              ) : (
                <span className="text-[11px] text-gray-600">
                  {step1.ventCount} ({lang === 'en' ? `${step1.ventCount - 10} extra` : `${step1.ventCount - 10} suppl.`} × $15.00)
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Selected extras */}
      {selectedExtraEntries.length > 0 && (
        <div className="border-t border-gray-100 pt-3 mb-3 space-y-1.5">
          {selectedExtraEntries.map(([id, qty]) => {
            const extra = EXTRAS.find((e) => e.id === id);
            if (!extra) return null;
            const tier = carpetTiers[id];
            const toggle = hasTierToggle(extra);
            const price = extraPrice(extra, tier);
            /* Strip any leading emoji from the tier label for the compact summary */
            const stripEmoji = (s: string) => s.replace(/^[^\w+]+\s*/, '');
            const tierLabel = !toggle
              ? ''
              : tier === 'protect'
                ? ` (${stripEmoji(extra.tierLabels ? t(extra.tierLabels.protect) : (lang === 'en' ? 'Protect' : 'Protéger'))})`
                : ` (${stripEmoji(extra.tierLabels ? t(extra.tierLabels.clean) : (lang === 'en' ? 'Clean' : 'Nettoyer'))})`;
            return (
              <div key={id} className="flex justify-between items-start gap-2">
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide leading-snug">
                  {t(extra.name)}{tierLabel}{qty > 1 ? ` × ${qty}` : ''}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-sm font-semibold text-gray-900">
                    {extra.priceDisplay ? t(extra.priceDisplay) : fmt(price * qty)}
                  </span>
                  {onRemoveExtra && (
                    <button
                      type="button"
                      onClick={() => onRemoveExtra(id)}
                      aria-label={lang === 'en' ? `Remove ${t(extra.name)}` : `Retirer ${t(extra.name)}`}
                      className="p-1 -m-1 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Area rugs breakdown */}
      {areaRugs.length > 0 && (
        <div className="border-t border-gray-100 pt-3 mb-3 space-y-1.5">
          {areaRugs.map((rug, i) => (
            <div key={rug.id} className="flex justify-between items-start gap-2">
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide leading-snug">
                {lang === 'en' ? `Rug ${i + 1}` : `Carpette ${i + 1}`} — {rug.type === 'wool' ? (lang === 'en' ? 'Wool' : 'Laine') : (lang === 'en' ? 'Synthetic' : 'Synthétique')}, {rugSqft(rug)} {lang === 'en' ? 'sq ft' : 'pi²'}
                {rug.location === 'on-site' ? (lang === 'en' ? ', On-Site' : ', Sur place') : ''}
                {rug.protection ? (lang === 'en' ? ', +Protection' : ', +Protection') : ''}
              </span>
              <span className="text-sm font-semibold text-gray-900 shrink-0">{fmt(rugLinePrice(rug))}</span>
            </div>
          ))}
        </div>
      )}

      {/* Row-based extras breakdown (dryer vent locations, wall-unit heights) */}
      {rowExtras.map((ex) => {
        const exTotal = extraRowsTotal(ex.id, dryerVentLocations);
        if (exTotal === 0) return null;
        return (
          <div key={ex.id} className="border-t border-gray-100 pt-3 mb-3">
            <div className="flex justify-between items-start gap-2 mb-1.5">
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide leading-snug">
                {t(ex.name)}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-sm font-semibold text-gray-900">{fmt(exTotal)}</span>
                {onClearRowExtra && (
                  <button
                    type="button"
                    onClick={() => onClearRowExtra(ex.id)}
                    aria-label={lang === 'en' ? `Remove ${t(ex.name)}` : `Retirer ${t(ex.name)}`}
                    className="p-1 -m-1 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            {ex.dryerLocations!.map((loc) => {
              const qty = dryerVentLocations[loc.id] ?? 0;
              if (qty === 0) return null;
              return (
                <div key={loc.id} className="flex justify-between text-[10px] text-gray-500 pl-2">
                  <span>{t(loc.label)} × {qty}</span>
                  <span>{fmt(loc.price * qty)}</span>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Unit location fee (if any) */}
      {unitLocationFee > 0 && (
        <div className="border-t border-gray-100 pt-3 mb-3">
          <div className="flex justify-between items-baseline">
            <span className="text-xs font-semibold text-amber-600">
              {lang === 'en' ? 'Unit Location Fee' : 'Frais d\'emplacement'}
            </span>
            <span className="text-sm font-semibold text-gray-900">{fmt(unitLocationFee)}</span>
          </div>
          {feeReasons.unitLocation && (
            <p className="text-[10px] text-gray-400 mt-0.5">{feeReasons.unitLocation}</p>
          )}
        </div>
      )}

      {/* Portable unit fee (if any) */}
      {parkingFee > 0 && (
        <div className="border-t border-gray-100 pt-3 mb-3">
          <div className="flex justify-between items-baseline">
            <span className="text-xs font-semibold text-amber-600">
              {lang === 'en' ? 'Portable Unit Fee' : 'Frais unité portable'}
            </span>
            <span className="text-sm font-semibold text-gray-900">{fmt(parkingFee)}</span>
          </div>
          <div className="mt-0.5 space-y-0">
            {feeReasons.noParking && (
              <p className="text-[10px] text-gray-400">{lang === 'en' ? '• No guaranteed parking' : '• Pas de stationnement garanti'}</p>
            )}
            {feeReasons.parkingFar && (
              <p className="text-[10px] text-gray-400">{lang === 'en' ? '• Parking over 100ft from entrance' : '• Stationnement à +100 pi de l\'entrée'}</p>
            )}
            {feeReasons.aboveFloor && (
              <p className="text-[10px] text-gray-400">{lang === 'en' ? '• Above 3rd floor' : '• Au-dessus du 3e étage'}</p>
            )}
          </div>
        </div>
      )}

      {/* Above 3rd floor fee (if any) */}
      {floorFee > 0 && (
        <div className="flex justify-between items-baseline border-t border-gray-100 pt-3 mb-3">
          <span className="text-xs font-semibold text-amber-600">
            {lang === 'en' ? 'Above 3rd Floor Fee' : 'Frais au-dessus du 3e étage'}
          </span>
          <span className="text-sm font-semibold text-gray-900">{fmt(floorFee)}</span>
        </div>
      )}

      {/* Parking far fee (carpet - portable unit) */}
      {parkingFarFee > 0 && (
        <div className="flex justify-between items-baseline border-t border-gray-100 pt-3 mb-3">
          <span className="text-xs font-semibold text-amber-600">
            {lang === 'en' ? 'Parking Over 100ft Fee' : 'Frais stationnement à +100 pi'}
          </span>
          <span className="text-sm font-semibold text-gray-900">{fmt(parkingFarFee)}</span>
        </div>
      )}

      {/* Carpet high-rise (3rd floor+) fee */}
      {carpetFloorFee > 0 && (
        <div className="flex justify-between items-baseline border-t border-gray-100 pt-3 mb-3">
          <span className="text-xs font-semibold text-amber-600">
            {lang === 'en' ? 'High-Rise Fee (3rd Floor+)' : 'Frais immeuble (3e étage+)'}
          </span>
          <span className="text-sm font-semibold text-gray-900">{fmt(carpetFloorFee)}</span>
        </div>
      )}

      {/* Subtotal + taxes */}
      <div className="border-t border-gray-200 pt-3 space-y-1.5 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">{lang === 'en' ? 'Subtotal' : 'Sous-total'}</span>
          <span className="font-medium">{fmt(subtotal)}</span>
        </div>
        {taxLines.map((tl) => (
          <div key={tl.label} className="flex justify-between text-sm text-gray-500">
            <span>{tl.label}</span>
            <span>{fmt(tl.amount)}</span>
          </div>
        ))}
      </div>

      {/* Coupon Code */}
      <div className="mb-4">
        <label className="text-xs font-semibold text-gray-700 block mb-1.5">
          {lang === 'en' ? 'Coupon Code' : 'Code promo'}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={couponCode}
            onChange={(e) => onCouponCodeChange?.(e.target.value)}
            className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0"
          />
          <button
            onClick={onCouponApply}
            className="bg-gray-700 hover:bg-gray-800 text-white text-sm font-semibold px-4 py-2 rounded transition-colors shrink-0"
          >
            {lang === 'en' ? 'Apply' : 'Appliquer'}
          </button>
        </div>
      </div>

      {/* Total */}
      <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
        <span className="font-bold text-blue-700 text-base">{lang === 'en' ? 'Total' : 'Total'}</span>
        <span className="font-bold text-blue-700 text-xl">{fmt(total)}</span>
      </div>
    </div>
  );
}
