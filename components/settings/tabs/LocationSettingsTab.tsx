'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { SettingCard, SettingRow } from '../shared';

const LocationMap = dynamic(() => import('@/components/LocationMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-gray-100 dark:bg-slate-700 rounded-lg animate-pulse flex items-center justify-center">
      <p className="text-gray-500 dark:text-slate-400">Ładowanie mapy...</p>
    </div>
  ),
});

interface LocationSettingsTabProps {
  settings: {
    home_address: string;
    search_radius_km: string;
  };
  onChange: (field: string, value: string) => void;
  disabled?: boolean;
}

export default function LocationSettingsTab({ settings, onChange, disabled }: LocationSettingsTabProps) {
  const [verifying, setVerifying] = useState(false);
  const [verifiedCoords, setVerifiedCoords] = useState<string | null>(null);
  const [mapCoords, setMapCoords] = useState<{ lat: number; lng: number } | null>(null);

  const handleVerifyAddress = async () => {
    if (!settings.home_address.trim()) {
      toast.error('Wprowadź adres do weryfikacji');
      return;
    }

    setVerifying(true);
    setVerifiedCoords(null);

    try {
      const response = await fetch(`/api/geocode?address=${encodeURIComponent(settings.home_address)}`);
      
      if (!response.ok) {
        throw new Error('Nie udało się zweryfikować adresu');
      }

      const data = await response.json();
      
      if (data.latitude && data.longitude) {
        setVerifiedCoords(`${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}`);
        setMapCoords({ lat: data.latitude, lng: data.longitude });
        toast.success('Adres zweryfikowany pomyślnie!');
      } else {
        toast.error('Nie znaleziono adresu');
      }
    } catch (err) {
      toast.error('Błąd weryfikacji adresu');
      console.error('Address verification error:', err);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <SettingCard
        title="Home Location"
        description="Set your home address for finding nearby fuel stations"
      >
        <SettingRow
          label="Home Address"
          description="Used to search for fuel stations nearby"
          fullWidth
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={settings.home_address}
              onChange={(e) => {
                onChange('home_address', e.target.value);
                setVerifiedCoords(null);
                setMapCoords(null);
              }}
              placeholder="np. Plac Defilad 1, Warszawa"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
              disabled={disabled}
            />
            <button
              type="button"
              onClick={handleVerifyAddress}
              disabled={disabled || verifying || !settings.home_address.trim()}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {verifying ? 'Weryfikacja...' : 'Weryfikuj'}
            </button>
          </div>
          {verifiedCoords && (
            <p className="text-sm text-green-600 dark:text-green-400 mt-2">
              ✓ Współrzędne: {verifiedCoords}
            </p>
          )}
        </SettingRow>

        <SettingRow
          label="Search Radius"
          description="Maximum distance for finding fuel stations"
          fullWidth
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                {settings.search_radius_km} km
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              step="1"
              value={settings.search_radius_km}
              onChange={(e) => onChange('search_radius_km', e.target.value)}
              className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              disabled={disabled}
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 mt-1">
              <span>1 km</span>
              <span>50 km</span>
            </div>
          </div>
        </SettingRow>

        {mapCoords && (
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Your Location on Map
            </p>
            <LocationMap
              latitude={mapCoords.lat}
              longitude={mapCoords.lng}
              radiusKm={parseFloat(settings.search_radius_km)}
              address={settings.home_address}
            />
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
              💡 Blue circle shows the station search area
            </p>
          </div>
        )}
      </SettingCard>
    </div>
  );
}

