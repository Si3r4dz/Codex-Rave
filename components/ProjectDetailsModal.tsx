'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProjectDetails } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ProjectDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  currency: string;
}

export default function ProjectDetailsModal({
  isOpen,
  onClose,
  projectId,
  projectName,
  currency,
}: ProjectDetailsModalProps) {
  const [details, setDetails] = useState<ProjectDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && projectId) {
      fetchProjectDetails();
      
      // Handle ESC key to close modal
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, projectId, onClose]);

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/project-details/${projectId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch project details');
      }
      
      const data = await response.json();
      setDetails(data);
    } catch (err) {
      console.error('Error fetching project details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return 'N/A';
    
    const currencyMap: Record<string, string> = {
      PLN: 'pl-PL',
      USD: 'en-US',
      EUR: 'de-DE',
      GBP: 'en-GB',
    };
    
    const locale = currencyMap[currency] || 'pl-PL';
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatHours = (hours: number) => {
    return `${hours.toFixed(2)}h`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-slate-800 rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-slate-700 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 p-6 z-10">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                    {projectName}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                    Project Details - Current Month
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 text-2xl transition-colors"
                  aria-label="Close modal"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {loading && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-24 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse" />
                    ))}
                  </div>
                  <div className="h-64 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse" />
                  <div className="h-48 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse" />
                </div>
              )}

              {error && (
                <div className="text-center py-12">
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-4">
                    {error}
                  </div>
                  <button
                    onClick={fetchProjectDetails}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {!loading && !error && details && (
                <div className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 border border-gray-200 dark:border-slate-600">
                      <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">Total Hours</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                        {formatHours(details.total_hours)}
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 border border-gray-200 dark:border-slate-600">
                      <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">Total Income</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(details.total_income)}
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 border border-gray-200 dark:border-slate-600">
                      <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">Days Worked</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                        {details.stats.days_worked}
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 border border-gray-200 dark:border-slate-600">
                      <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">Avg Hours/Day</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                        {formatHours(details.stats.avg_hours_per_day)}
                      </p>
                    </div>
                  </div>

                  {/* Most Productive Day Badge */}
                  {details.stats.most_productive_day && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                          Most Productive Day: {formatDate(details.stats.most_productive_day.date)} 
                          ({formatHours(details.stats.most_productive_day.hours)})
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Daily Breakdown Chart */}
                  <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Daily Breakdown</h3>
                    {details.daily_breakdown.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={details.daily_breakdown.map(d => ({
                          ...d,
                          date: formatDate(d.date),
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" style={{ fontSize: '12px' }} />
                          <YAxis style={{ fontSize: '12px' }} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="hours" fill="#3b82f6" name="Hours" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-gray-500 dark:text-slate-400">
                        No daily data available
                      </div>
                    )}
                  </div>

                  {/* Daily Hours Table */}
                  <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <div className="p-6 border-b border-gray-200 dark:border-slate-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Daily Hours</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                        <thead className="bg-gray-50 dark:bg-slate-700/50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                              Hours
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                              Income
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                          {details.daily_breakdown.map((day) => (
                            <tr key={day.date} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-200">
                                {formatDate(day.date)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-200">
                                {formatHours(day.hours)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600 dark:text-green-400">
                                {formatCurrency(day.income)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Tasks Section */}
                  <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <div className="p-6 border-b border-gray-200 dark:border-slate-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Tasks</h3>
                      <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                        {details.tasks.length} task{details.tasks.length !== 1 ? 's' : ''} tracked
                      </p>
                    </div>
                    <div className="divide-y divide-gray-200 dark:divide-slate-700 max-h-96 overflow-y-auto">
                      {details.tasks.map((task) => (
                        <div key={task.task_id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-gray-900 dark:text-slate-100 flex-1">
                              {task.task_name}
                            </h4>
                            <span className="text-lg font-bold text-blue-600 dark:text-blue-400 ml-4">
                              {formatHours(task.hours)}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {task.dates.map((date) => (
                              <span
                                key={date}
                                className="text-xs px-2 py-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded"
                              >
                                {formatDate(date)}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

