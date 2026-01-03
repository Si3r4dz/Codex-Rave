import { SettingCard, SettingRow } from '../shared';

interface GeneralSettingsTabProps {
  settings: {
    default_hourly_rate: string;
    currency: string;
    daily_hours_target: string;
  };
  onChange: (field: string, value: string) => void;
  disabled?: boolean;
}

export default function GeneralSettingsTab({ settings, onChange, disabled }: GeneralSettingsTabProps) {
  return (
    <div className="space-y-6">
      <SettingCard
        title="Work Settings"
        description="Configure your default work-related settings"
      >
        <SettingRow
          label="Default Hourly Rate"
          description={`Your default rate in ${settings.currency}`}
        >
          <input
            type="number"
            step="0.01"
            min="0"
            value={settings.default_hourly_rate}
            onChange={(e) => onChange('default_hourly_rate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
            required
            disabled={disabled}
          />
        </SettingRow>

        <SettingRow
          label="Currency"
          description="Your preferred currency for all financial data"
        >
          <select
            value={settings.currency}
            onChange={(e) => onChange('currency', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
            disabled={disabled}
          >
            <option value="PLN">PLN (Polish Zloty)</option>
            <option value="USD">USD (US Dollar)</option>
            <option value="EUR">EUR (Euro)</option>
            <option value="GBP">GBP (British Pound)</option>
          </select>
        </SettingRow>

        <SettingRow
          label="Daily Hours Target"
          description="Standard hours you work per day"
        >
          <input
            type="number"
            step="0.5"
            min="1"
            max="24"
            value={settings.daily_hours_target}
            onChange={(e) => onChange('daily_hours_target', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
            required
            disabled={disabled}
          />
        </SettingRow>
      </SettingCard>
    </div>
  );
}

