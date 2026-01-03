import { SettingCard } from '../shared';

export default function FuelSettingsTab() {
  return (
    <div className="space-y-6">
      <SettingCard
        title="Fuel Preferences"
        description="Configure your fuel tracking preferences"
      >
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">
            Coming Soon
          </h3>
          <p className="text-gray-600 dark:text-slate-400 max-w-sm">
            Fuel budget tracking, price alerts, and preferences will be available here in the next update.
          </p>
        </div>
      </SettingCard>
    </div>
  );
}

