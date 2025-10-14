'use client';

import { motion } from 'framer-motion';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export default function StatCard({ title, value, subtitle, icon, trend }: StatCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02, y: -4 }}
      className="bg-white dark:bg-slate-800 rounded-lg shadow-md hover:shadow-lg p-6 border border-gray-200 dark:border-slate-700 transition-all duration-200"
      role="article"
      aria-label={`${title}: ${value}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className={`flex items-center mt-2 text-sm ${trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span className="ml-1">{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="ml-4 text-gray-400 dark:text-slate-500 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
            {icon}
          </div>
        )}
      </div>
    </motion.div>
  );
}

