interface SettingCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export default function SettingCard({ title, description, children }: SettingCardProps) {
  return (
    <div className="border-b border-gray-200 dark:border-slate-700 pb-6 last:border-b-0 last:pb-0">
      <div className="mb-4">
        <h4 className="text-base font-semibold text-gray-900 dark:text-slate-100">
          {title}
        </h4>
        {description && (
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {description}
          </p>
        )}
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

