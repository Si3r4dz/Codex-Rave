interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}

export default function SettingRow({ label, description, children, fullWidth = false }: SettingRowProps) {
  return (
    <div className={fullWidth ? 'space-y-2' : 'flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2'}>
      <div className={fullWidth ? '' : 'sm:max-w-[50%]'}>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
          {label}
        </label>
        {description && (
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            {description}
          </p>
        )}
      </div>
      <div className={fullWidth ? 'w-full' : 'sm:w-64'}>
        {children}
      </div>
    </div>
  );
}

