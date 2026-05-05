import { useRef, useEffect } from 'react';
import { SHORT_TO_PROVINCE } from '../../data/step3Options';

/* Minimal Google Maps types — avoids a full @types/google.maps install */
declare global {
  interface Window {
    googleMapsReady?: boolean;
  }
}

export interface AddressParts {
  address: string;
  city: string;
  stateCode: string;
  zip: string;
  province: string;
}

interface Props {
  value: string;
  onChange: (address: string, province?: string, parts?: AddressParts) => void;
  placeholder?: string;
  className?: string;
}

export default function AddressAutocomplete({ value, onChange, placeholder, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const initAutocomplete = () => {
      const g = (window as any).google;
      if (!inputRef.current || !g?.maps?.places) return;

      const autocomplete = new g.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'ca' },
        types: ['address'],
        fields: ['formatted_address', 'address_components'],
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place?.formatted_address) return;

        let province = '';
        let stateCode = '';
        let city = '';
        let zip = '';
        let streetNumber = '';
        let route = '';

        (place.address_components ?? []).forEach((comp: any) => {
          const types: string[] = comp.types;
          if (types.includes('administrative_area_level_1')) {
            province = SHORT_TO_PROVINCE[comp.short_name] ?? comp.long_name;
            stateCode = comp.short_name;
          }
          // City: try locality, then sublocality, then admin level 2 (e.g. Gatineau)
          if (types.includes('locality') || types.includes('sublocality_level_1') || types.includes('sublocality')) {
            city = city || comp.long_name;
          }
          if (!city && types.includes('administrative_area_level_2')) {
            city = comp.long_name;
          }
          if (types.includes('postal_code')) {
            zip = comp.short_name;
          }
          if (types.includes('street_number')) {
            streetNumber = comp.long_name;
          }
          if (types.includes('route')) {
            route = comp.long_name;
          }
        });

        const address1 = [streetNumber, route].filter(Boolean).join(' ');

        // Fallback: parse city/state/zip from formatted address if missing
        // Format: "123 Street, City, Province PostalCode, Country"
        if (!city || !stateCode || !zip) {
          const parts = place.formatted_address.split(',').map((s: string) => s.trim());
          // parts[0] = street, parts[1] = city, parts[2] = "ON K1A 0A6", parts[3] = "Canada"
          if (!city && parts.length >= 3) {
            city = parts[1] || '';
          }
          if ((!stateCode || !zip) && parts.length >= 3) {
            const stateZip = (parts[2] || '').trim();
            const match = stateZip.match(/^([A-Z]{2})\s+(.+)$/);
            if (match) {
              if (!stateCode) stateCode = match[1];
              if (!zip) zip = match[2];
              if (!province) province = SHORT_TO_PROVINCE[match[1]] ?? match[1];
            }
          }
        }

        onChange(place.formatted_address, province || undefined, {
          address: address1 || place.formatted_address,
          city,
          stateCode,
          zip,
          province: province || '',
        });
      });
    };

    if ((window as any).google?.maps?.places) {
      initAutocomplete();
    } else {
      window.addEventListener('googleMapsLoaded', initAutocomplete, { once: true });
    }

    return () => {
      window.removeEventListener('googleMapsLoaded', initAutocomplete);
    };
  }, []);

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      autoComplete="off"
    />
  );
}
