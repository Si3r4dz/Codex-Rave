'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FuelStation, FuelType } from '@/types';
import { formatDistance } from '@/lib/utils/distance';
import { toast } from 'sonner';

interface StationPickerProps {
  fuelType: FuelType;
  onSelectStation: (station: FuelStation, price: number) => void;
  currency: string;
}

export default function StationPicker({ fuelType, onSelectStation, currency }: StationPickerProps) {
  const [loading, setLoading] = useState(false);
  const [stations, setStations] = useState<FuelStation[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNearbyStations = async () => {
    setLoading(true);
    setError(null);
    setStations([]);
    
    try {
      // First, get user's home coordinates from settings
      const settingsResponse = await fetch('/api/settings');
      if (!settingsResponse.ok) {
        throw new Error('Nie udało się pobrać ustawień');
      }

      const settings = await settingsResponse.json();
      
      if (!settings.home_latitude || !settings.home_longitude) {
        setError('Najpierw ustaw swój adres domowy w ustawieniach');
        setLoading(false);
        return;
      }

      const radius = settings.search_radius_km || '10';

      // Fetch nearby stations
      const stationsResponse = await fetch(
        `/api/fuel-stations?lat=${settings.home_latitude}&lng=${settings.home_longitude}&radius=${radius}`
      );

      if (!stationsResponse.ok) {
        throw new Error('Nie udało się pobrać listy stacji');
      }

      const data = await stationsResponse.json();
      
      if (!data || data.length === 0) {
        setError(`Nie znaleziono stacji w promieniu ${radius} km`);
      } else {
        setStations(data);
        setIsOpen(true);
      }
    } catch (err) {
      console.error('Error fetching stations:', err);
      const errorMessage = err instanceof Error ? err.message : 'Błąd pobierania stacji';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleStationSelect = (station: FuelStation) => {
    const price = station.prices?.[fuelType];
    if (price) {
      onSelectStation(station, price);
      setIsOpen(false);
      toast.success(`Wybrano: ${station.name}`);
    } else {
      toast.error('Brak ceny dla wybranego rodzaju paliwa');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getBrandColor = (brand?: string) => {
    const colors: Record<string, string> = {
      'Orlen': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
      'Shell': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
      'BP': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
      'Circle K': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
      'Lotos': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
    };

    return colors[brand || ''] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={fetchNearbyStations}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {loading ? 'Szukam stacji...' : '🗺️ Znajdź stacje w pobliżu'}
      </button>

      {error && (
        <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg text-sm text-orange-700 dark:text-orange-300">
          {error}
        </div>
      )}

      <AnimatePresence>
        {isOpen && stations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 overflow-hidden"
          >
            <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <div className="bg-gray-50 dark:bg-slate-800 px-4 py-2 border-b border-gray-200 dark:border-slate-700">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                    Znaleziono {stations.length} {stations.length === 1 ? 'stację' : 'stacji'}
                  </h4>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {stations.map((station, index) => {
                  const price = station.prices?.[fuelType];
                  
                  return (
                    <motion.button
                      key={`${station.latitude}-${station.longitude}-${index}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleStationSelect(station)}
                      className="w-full p-4 hover:bg-blue-50 dark:hover:bg-slate-700 border-b border-gray-100 dark:border-slate-700 last:border-b-0 transition-colors text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h5 className="font-semibold text-gray-900 dark:text-slate-100">
                              {station.name}
                            </h5>
                            {station.brand && (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getBrandColor(station.brand)}`}>
                                {station.brand}
                              </span>
                            )}
                          </div>
                          
                          {station.address && (
                            <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">
                              {station.address}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-slate-400">
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              </svg>
                              {formatDistance(station.distance_km || 0)}
                            </span>
                            
                            {station.usage_count && station.usage_count > 0 && (
                              <span className="text-blue-600 dark:text-blue-400">
                                ⭐ Tankowano {station.usage_count}x
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          {price ? (
                            <>
                              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {formatCurrency(price)}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-slate-400">
                                za litr
                              </div>
                            </>
                          ) : (
                            <div className="text-sm text-gray-400 dark:text-slate-500">
                              Brak ceny
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

