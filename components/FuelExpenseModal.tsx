'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FuelTransaction, FuelType, FuelPriceApiResponse, FuelStation } from '@/types';
import StationPicker from '@/components/StationPicker';
import { toast } from 'sonner';

interface FuelExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: string;
}

export default function FuelExpenseModal({ isOpen, onClose, currency }: FuelExpenseModalProps) {
  const [transactions, setTransactions] = useState<FuelTransaction[]>([]);
  const [currentPrices, setCurrentPrices] = useState<FuelPriceApiResponse>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [fuelType, setFuelType] = useState<FuelType>('Pb95');
  const [liters, setLiters] = useState('');
  const [pricePerLiter, setPricePerLiter] = useState('');
  const [selectedStation, setSelectedStation] = useState<FuelStation | null>(null);

  // Get current month in YYYY-MM format
  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const fetchTransactions = async () => {
    try {
      const month = getCurrentMonth();
      const response = await fetch(`/api/fuel-transactions?month=${month}`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      toast.error('Nie udało się pobrać transakcji');
    }
  };

  const fetchCurrentPrices = async () => {
    try {
      const response = await fetch('/api/fuel-prices');
      if (response.ok) {
        const data = await response.json();
        setCurrentPrices(data);
        // Set initial price based on selected fuel type
        if (data[fuelType]) {
          setPricePerLiter(data[fuelType].toFixed(2));
        }
      }
    } catch (error) {
      console.error('Failed to fetch fuel prices:', error);
      toast.error('Nie udało się pobrać aktualnych cen paliwa');
    }
  };

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      Promise.all([fetchTransactions(), fetchCurrentPrices()]).finally(() => {
        setLoading(false);
      });
    }
  }, [isOpen]);

  // Update price when fuel type changes
  useEffect(() => {
    if (currentPrices[fuelType]) {
      setPricePerLiter(currentPrices[fuelType]!.toFixed(2));
    }
  }, [fuelType, currentPrices]);

  const calculateTotal = () => {
    const litersNum = parseFloat(liters);
    const priceNum = parseFloat(pricePerLiter);
    if (isNaN(litersNum) || isNaN(priceNum)) return 0;
    return litersNum * priceNum;
  };

  const handleStationSelect = (station: FuelStation, price: number) => {
    setSelectedStation(station);
    setPricePerLiter(price.toFixed(2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const litersNum = parseFloat(liters);
    const priceNum = parseFloat(pricePerLiter);
    
    if (isNaN(litersNum) || litersNum <= 0) {
      toast.error('Wprowadź prawidłową ilość litrów');
      return;
    }
    
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error('Wprowadź prawidłową cenę za litr');
      return;
    }

    const totalAmount = calculateTotal();

    setSubmitting(true);
    
    try {
      const response = await fetch('/api/fuel-transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date,
          fuel_type: fuelType,
          liters: litersNum,
          price_per_liter: priceNum,
          total_amount: totalAmount,
          station_id: selectedStation?.id,
          station_name: selectedStation?.name,
          station_address: selectedStation?.address
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create transaction');
      }

      toast.success('Transakcja dodana pomyślnie');
      
      // Reset form
      setLiters('');
      setDate(new Date().toISOString().split('T')[0]);
      setSelectedStation(null);
      
      // Refresh transactions
      await fetchTransactions();
    } catch (error) {
      console.error('Failed to create transaction:', error);
      toast.error('Nie udało się dodać transakcji');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Czy na pewno chcesz usunąć tę transakcję?')) {
      return;
    }

    try {
      const response = await fetch(`/api/fuel-transactions?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete transaction');
      }

      toast.success('Transakcja usunięta');
      await fetchTransactions();
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      toast.error('Nie udało się usunąć transakcji');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTotalSpent = () => {
    return transactions.reduce((sum, t) => sum + t.total_amount, 0);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-200 dark:border-slate-700"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                Wydatki na paliwo
              </h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                Zarządzaj swoimi wydatkami na paliwo
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
            {/* Form Section */}
            <div className="p-6 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
                Dodaj transakcję
              </h3>
              
              {/* Station Picker */}
              <StationPicker
                fuelType={fuelType}
                onSelectStation={handleStationSelect}
                currency={currency}
              />

              {/* Selected Station Display */}
              {selectedStation && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                        📍 Wybrana stacja:
                      </p>
                      <p className="text-blue-800 dark:text-blue-300 font-medium">
                        {selectedStation.name}
                      </p>
                      {selectedStation.address && (
                        <p className="text-xs text-blue-700 dark:text-blue-400">
                          {selectedStation.address}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedStation(null)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 text-sm"
                    >
                      Usuń
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Date */}
                  <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Data
                    </label>
                    <input
                      type="date"
                      id="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100 transition-colors"
                      required
                    />
                  </div>

                  {/* Fuel Type */}
                  <div>
                    <label htmlFor="fuelType" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Rodzaj paliwa
                    </label>
                    <select
                      id="fuelType"
                      value={fuelType}
                      onChange={(e) => setFuelType(e.target.value as FuelType)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100 transition-colors"
                      required
                    >
                      <option value="Pb95">Pb95</option>
                      <option value="Pb98">Pb98</option>
                      <option value="ON">ON (Diesel)</option>
                      <option value="LPG">LPG</option>
                    </select>
                  </div>

                  {/* Liters */}
                  <div>
                    <label htmlFor="liters" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Ilość litrów
                    </label>
                    <input
                      type="number"
                      id="liters"
                      value={liters}
                      onChange={(e) => setLiters(e.target.value)}
                      step="0.01"
                      min="0"
                      placeholder="45.50"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100 transition-colors"
                      required
                    />
                  </div>

                  {/* Price per Liter */}
                  <div>
                    <label htmlFor="pricePerLiter" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Cena za litr ({currency})
                    </label>
                    <input
                      type="number"
                      id="pricePerLiter"
                      value={pricePerLiter}
                      onChange={(e) => setPricePerLiter(e.target.value)}
                      step="0.01"
                      min="0"
                      placeholder="6.50"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100 transition-colors"
                      required
                    />
                  </div>
                </div>

                {/* Total Amount Display */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                      Kwota całkowita:
                    </span>
                    <span className="text-2xl font-bold text-blue-900 dark:text-blue-200">
                      {formatCurrency(calculateTotal())}
                    </span>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Dodawanie...' : 'Dodaj transakcję'}
                </button>
              </form>
            </div>

            {/* Transactions List */}
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                  Transakcje w tym miesiącu
                </h3>
                {transactions.length > 0 && (
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      Suma wydatków:
                    </p>
                    <p className="text-xl font-bold text-gray-900 dark:text-slate-100">
                      {formatCurrency(getTotalSpent())}
                    </p>
                  </div>
                )}
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="text-gray-500 dark:text-slate-400 mt-2">Ładowanie...</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-slate-400">
                  <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p>Brak transakcji w tym miesiącu</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((transaction) => (
                    <motion.div
                      key={transaction.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
                            {transaction.fuel_type}
                          </span>
                          <span className="text-gray-600 dark:text-slate-300 text-sm">
                            {formatDate(transaction.date)}
                          </span>
                        </div>
                        {transaction.station_name && (
                          <div className="mt-1 flex items-center gap-1 text-sm text-gray-600 dark:text-slate-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                            <span className="font-medium">{transaction.station_name}</span>
                          </div>
                        )}
                        <div className="mt-2 flex items-center gap-4 text-sm text-gray-500 dark:text-slate-400">
                          <span>{transaction.liters.toFixed(2)} L</span>
                          <span>×</span>
                          <span>{formatCurrency(transaction.price_per_liter)}/L</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900 dark:text-slate-100">
                            {formatCurrency(transaction.total_amount)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDelete(transaction.id)}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          aria-label="Delete transaction"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

