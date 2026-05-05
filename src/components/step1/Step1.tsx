import { useState } from 'react';
import type { ServiceCategory, ServicePackage, T } from '../../data/services';
import CategoryGrid from './CategoryGrid';
import PackageList from './PackageList';

export interface Step1Selection {
  isValid: boolean;
  packageName: T | null;
  packageId: string | null;
  categoryId: string | null;
  basePrice: number;
  includes: T[];
  ventMode: 'arrival' | 'known';
  ventCount: number;
  subtotal: number;
  summaryLines: { label: string; amount: number }[];
}

const EMPTY: Step1Selection = {
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
  onSelectionChange: (sel: Step1Selection) => void;
  region?: string;
}

export default function Step1({ onSelectionChange, region }: Props) {
  const [view, setView] = useState<'categories' | 'packages'>('categories');
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
  const [expandedPackageId, setExpandedPackageId] = useState<string | null>(null);
  const [unitCounts, setUnitCounts] = useState<Record<string, number>>({});
  const [ventModes, setVentModes] = useState<Record<string, 'arrival' | 'known'>>({});
  const [ventCounts, setVentCounts] = useState<Record<string, number>>({});
  const [dryerLocations, setDryerLocations] = useState<Record<string, number>>({});

  const handleSelectCategory = (cat: ServiceCategory) => {
    setSelectedCategory(cat);
    setExpandedPackageId(null);
    setView('packages');
    onSelectionChange(EMPTY);
  };

  const handleBack = () => {
    setView('categories');
    setSelectedCategory(null);
    setExpandedPackageId(null);
    onSelectionChange(EMPTY);
  };

  const handleExpandPackage = (pkgId: string | null) => {
    setExpandedPackageId(pkgId);
    recalculate(pkgId, unitCounts, ventModes, ventCounts, dryerLocations);
  };

  const handleUnitCountChange = (pkgId: string, count: number) => {
    const next = { ...unitCounts, [pkgId]: count };
    setUnitCounts(next);
    recalculate(expandedPackageId, next, ventModes, ventCounts, dryerLocations);
  };

  const handleVentModeChange = (pkgId: string, mode: 'arrival' | 'known') => {
    const next = { ...ventModes, [pkgId]: mode };
    setVentModes(next);
    recalculate(expandedPackageId, unitCounts, next, ventCounts, dryerLocations);
  };

  const handleVentCountChange = (pkgId: string, count: number) => {
    const next = { ...ventCounts, [pkgId]: count };
    setVentCounts(next);
    recalculate(expandedPackageId, unitCounts, ventModes, next, dryerLocations);
  };

  const handleDryerLocationChange = (locationId: string, qty: number) => {
    const next = { ...dryerLocations, [locationId]: qty };
    setDryerLocations(next);
    recalculate(expandedPackageId, unitCounts, ventModes, ventCounts, next);
  };

  const recalculate = (
    pkgId: string | null,
    uCounts: Record<string, number>,
    vModes: Record<string, 'arrival' | 'known'>,
    vCounts: Record<string, number>,
    dLocations: Record<string, number>,
  ) => {
    if (!selectedCategory || !pkgId) {
      onSelectionChange(EMPTY);
      return;
    }

    const pkg: ServicePackage | undefined = selectedCategory.packages.find((p) => p.id === pkgId);
    if (!pkg) {
      onSelectionChange(EMPTY);
      return;
    }

    const lines: { label: string; amount: number }[] = [];
    let subtotal = 0;

    if (pkg.dryerLocations) {
      pkg.dryerLocations.forEach((loc) => {
        const qty = dLocations[loc.id] ?? 0;
        if (qty > 0) {
          lines.push({ label: `${loc.label.en} × ${qty}`, amount: loc.price * qty });
          subtotal += loc.price * qty;
        }
      });
    } else {
      const units = uCounts[pkgId] ?? 1;
      lines.push({ label: `${pkg.name.en} × ${units}`, amount: pkg.price * units });
      subtotal += pkg.price * units;

      if (pkg.hasVentCount && vModes[pkgId] === 'known') {
        const vents = vCounts[pkgId] ?? 0;
        const extraVents = Math.max(0, vents - 10);
        if (extraVents > 0) {
          lines.push({ label: `Extra Vents × ${extraVents}`, amount: extraVents * 15 });
          subtotal += extraVents * 15;
        }
      }
    }

    const isDryer = !!pkg.dryerLocations;
    const dryerHasQty = isDryer && Object.values(dLocations).some((v) => v > 0);
    const isValid = isDryer ? dryerHasQty : true;

    onSelectionChange({
      isValid,
      packageName: pkg.name,
      packageId: pkg.id,
      categoryId: selectedCategory.id,
      basePrice: pkg.price,
      includes: pkg.includes,
      ventMode: vModes[pkgId] ?? 'arrival',
      ventCount: vCounts[pkgId] ?? 0,
      subtotal,
      summaryLines: lines,
    });
  };

  if (view === 'packages' && selectedCategory) {
    return (
      <PackageList
        category={selectedCategory}
        expandedPackageId={expandedPackageId}
        onExpandPackage={handleExpandPackage}
        unitCounts={unitCounts}
        onUnitCountChange={handleUnitCountChange}
        ventModes={ventModes}
        onVentModeChange={handleVentModeChange}
        ventCounts={ventCounts}
        onVentCountChange={handleVentCountChange}
        dryerLocations={dryerLocations}
        onDryerLocationChange={handleDryerLocationChange}
        onBack={handleBack}
      />
    );
  }

  return <CategoryGrid onSelectCategory={handleSelectCategory} region={region} />;
}
