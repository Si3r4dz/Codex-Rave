'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { GeneralSettingsTab, LocationSettingsTab, FuelSettingsTab, CompanySettingsTab } from './settings/tabs';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type TabId = 'general' | 'location' | 'company' | 'fuel';

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

export default function SettingsModal({ isOpen, onClose, onSuccess }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    default_hourly_rate: '',
    currency: 'PLN',
    daily_hours_target: '8',
    home_address: '',
    search_radius_km: '10',
    company_name: '',
    company_nip: '',
    company_regon: '',
    company_address: '',
    company_city: '',
    company_postal_code: '',
    company_email: '',
    company_phone: '',
    company_bank_account: '',
  });

  const tabs: Tab[] = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'location', label: 'Location', icon: '📍' },
    { id: 'company', label: 'Company', icon: '🏢' },
    { id: 'fuel', label: 'Fuel', icon: '⛽' },
  ];

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
      
      // Handle ESC key to close modal
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings');
      
      if (response.ok) {
        const data = await response.json();
        setSettings({
          default_hourly_rate: data.default_hourly_rate || '',
          currency: data.currency || 'PLN',
          daily_hours_target: data.daily_hours_target || '8',
          home_address: data.home_address || '',
          search_radius_km: data.search_radius_km || '10',
          company_name: data.company_name || '',
          company_nip: data.company_nip || '',
          company_regon: data.company_regon || '',
          company_address: data.company_address || '',
          company_city: data.company_city || '',
          company_postal_code: data.company_postal_code || '',
          company_email: data.company_email || '',
          company_phone: data.company_phone || '',
          company_bank_account: data.company_bank_account || '',
        });
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (field: string, value: string) => {
    setSettings({ ...settings, [field]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }

      toast.success('Settings saved successfully!');
      onSuccess();
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <GeneralSettingsTab
            settings={{
              default_hourly_rate: settings.default_hourly_rate,
              currency: settings.currency,
              daily_hours_target: settings.daily_hours_target,
            }}
            onChange={handleSettingChange}
            disabled={loading}
          />
        );
      case 'location':
        return (
          <LocationSettingsTab
            settings={{
              home_address: settings.home_address,
              search_radius_km: settings.search_radius_km,
            }}
            onChange={handleSettingChange}
            disabled={loading}
          />
        );
      case 'company':
        return (
          <CompanySettingsTab
            settings={{
              company_name: settings.company_name,
              company_nip: settings.company_nip,
              company_regon: settings.company_regon,
              company_address: settings.company_address,
              company_city: settings.company_city,
              company_postal_code: settings.company_postal_code,
              company_email: settings.company_email,
              company_phone: settings.company_phone,
              company_bank_account: settings.company_bank_account,
            }}
            onChange={handleSettingChange}
            disabled={loading}
          />
        );
      case 'fuel':
        return <FuelSettingsTab />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-lg max-w-3xl w-full h-[600px] border border-gray-200 dark:border-slate-700 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Settings</h2>
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 text-2xl transition-colors"
              aria-label="Close settings"
            >
              ×
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 overflow-x-auto scrollbar-thin">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`
                  px-4 py-2 rounded-t-lg font-medium text-sm whitespace-nowrap transition-all
                  ${activeTab === tab.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                  }
                `}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Tab Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {renderTabContent()}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 transition-colors font-medium"
              >
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

