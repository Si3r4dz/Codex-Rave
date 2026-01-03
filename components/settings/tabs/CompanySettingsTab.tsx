import { SettingCard, SettingRow } from '../shared';

interface CompanySettingsTabProps {
  settings: {
    company_name: string;
    company_nip: string;
    company_regon: string;
    company_address: string;
    company_city: string;
    company_postal_code: string;
    company_email: string;
    company_phone: string;
    company_bank_account: string;
  };
  onChange: (field: string, value: string) => void;
  disabled?: boolean;
}

export default function CompanySettingsTab({ settings, onChange, disabled }: CompanySettingsTabProps) {
  return (
    <div className="space-y-6">
      <SettingCard
        title="Company (Seller) Details"
        description="Used for VAT invoices and KSeF-compatible XML export"
      >
        <div className="mb-3 rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          KSeF integration is not enabled. XML files are for manual upload or archival only.
        </div>

        <SettingRow label="Company Name" description="Your legal seller name">
          <input
            type="text"
            value={settings.company_name}
            onChange={(e) => onChange('company_name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
            disabled={disabled}
          />
        </SettingRow>

        <SettingRow label="NIP" description="Digits only; separators allowed in input">
          <input
            type="text"
            inputMode="numeric"
            value={settings.company_nip}
            onChange={(e) => onChange('company_nip', e.target.value)}
            placeholder="123-456-32-18"
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
            disabled={disabled}
          />
        </SettingRow>

        <SettingRow label="REGON" description="9 or 14 digits; separators allowed in input">
          <input
            type="text"
            inputMode="numeric"
            value={settings.company_regon}
            onChange={(e) => onChange('company_regon', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
            disabled={disabled}
          />
        </SettingRow>

        <SettingRow label="Address" description="Street and number" fullWidth>
          <input
            type="text"
            value={settings.company_address}
            onChange={(e) => onChange('company_address', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
            disabled={disabled}
          />
        </SettingRow>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SettingRow label="City" description="">
            <input
              type="text"
              value={settings.company_city}
              onChange={(e) => onChange('company_city', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
              disabled={disabled}
            />
          </SettingRow>
          <SettingRow label="Postal Code" description="">
            <input
              type="text"
              value={settings.company_postal_code}
              onChange={(e) => onChange('company_postal_code', e.target.value)}
              placeholder="00-000"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
              disabled={disabled}
            />
          </SettingRow>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SettingRow label="Email" description="">
            <input
              type="email"
              value={settings.company_email}
              onChange={(e) => onChange('company_email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
              disabled={disabled}
            />
          </SettingRow>
          <SettingRow label="Phone" description="">
            <input
              type="text"
              value={settings.company_phone}
              onChange={(e) => onChange('company_phone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
              disabled={disabled}
            />
          </SettingRow>
        </div>

        <SettingRow label="Bank Account" description="Used for payment instructions">
          <input
            type="text"
            value={settings.company_bank_account}
            onChange={(e) => onChange('company_bank_account', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
            disabled={disabled}
          />
        </SettingRow>
      </SettingCard>
    </div>
  );
}


