'use client';

import { useState, useEffect } from 'react';
import { DashboardStats, Settings, FuelMonthlyStats } from '@/types';
import StatCard from '@/components/StatCard';
import ProjectTable from '@/components/ProjectTable';
import Charts from '@/components/Charts';
import ProjectRateForm from '@/components/ProjectRateForm';
import SettingsModal from '@/components/SettingsModal';
import FuelExpenseModal from '@/components/FuelExpenseModal';
import InvoiceWizardModal from '@/components/invoices/InvoiceWizardModal';
import InvoiceListModal from '@/components/invoices/InvoiceListModal';
import ClientManagementModal from '@/components/clients/ClientManagementModal';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { StatCardSkeleton, TableSkeleton, ChartSkeleton } from '@/components/ui/Skeleton';
import { getCurrentMonth, addMonths, isCurrentMonth } from '@/lib/utils/date';
import { format, parse } from 'date-fns';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [settings, setSettings] = useState<Settings>({ default_hourly_rate: '50', currency: 'PLN', daily_hours_target: '8' });
  const [fuelStats, setFuelStats] = useState<FuelMonthlyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);
  const [isInvoiceWizardOpen, setIsInvoiceWizardOpen] = useState(false);
  const [isInvoiceListOpen, setIsInvoiceListOpen] = useState(false);
  const [isClientManagementOpen, setIsClientManagementOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth());

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const fetchFuelStats = async () => {
    try {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const response = await fetch(`/api/fuel-transactions/stats?month=${currentMonth}`, {
        cache: 'no-store',
      });

      if (response.ok) {
        const data = await response.json();
        setFuelStats(data);
      }
    } catch (err) {
      console.error('Error fetching fuel stats:', err);
      // Don't show error for fuel stats, just log it
    }
  };

  const fetchStats = async (month?: string) => {
    try {
      setLoading(true);
      setError(null);
      const url = month ? `/api/stats?month=${month}` : '/api/stats';
      const response = await fetch(url, {
        cache: 'no-store',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch statistics');
      }

      const data = await response.json();
      setStats(data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchSettings();
    fetchStats(selectedMonth);
    fetchFuelStats();
  };

  const handleMonthChange = (newMonth: string) => {
    setSelectedMonth(newMonth);
    // Update URL without reloading the page
    const url = new URL(window.location.href);
    url.searchParams.set('month', newMonth);
    window.history.pushState({}, '', url);
    fetchStats(newMonth);
  };

  const handlePreviousMonth = () => {
    const prevMonth = addMonths(selectedMonth, -1);
    handleMonthChange(prevMonth);
  };

  const handleNextMonth = () => {
    const nextMonth = addMonths(selectedMonth, 1);
    handleMonthChange(nextMonth);
  };

  const handleToday = () => {
    const currentMonth = getCurrentMonth();
    handleMonthChange(currentMonth);
  };

  const getMonthDisplayName = (month: string) => {
    const date = parse(month, 'yyyy-MM', new Date());
    return format(date, 'MMMM yyyy');
  };

  const handleFuelModalClose = () => {
    setIsFuelModalOpen(false);
    fetchFuelStats(); // Refresh fuel stats when modal closes
  };

  useEffect(() => {
    // Initialize month from URL on mount
    const urlParams = new URLSearchParams(window.location.search);
    const monthParam = urlParams.get('month');
    
    if (monthParam) {
      setSelectedMonth(monthParam);
    }
    
    fetchSettings();
    fetchStats(monthParam || undefined);
    fetchFuelStats();
  }, []);

  // Auto-refresh every 5 minutes based on selected month
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSettings();
      fetchStats(selectedMonth);
      fetchFuelStats();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [selectedMonth]);

  const formatCurrency = (amount: number) => {
    const currencyMap: Record<string, string> = {
      PLN: 'pl-PL',
      USD: 'en-US',
      EUR: 'de-DE',
      GBP: 'en-GB',
    };
    
    const locale = currencyMap[settings.currency] || 'pl-PL';
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: settings.currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatHours = (hours: number) => {
    return `${hours.toFixed(2)}h`;
  };

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors">
        <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-slate-700 transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Freelance Dashboard</h1>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Loading...</p>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
          <div>
            <div className="h-8 w-48 bg-gray-200 dark:bg-slate-700 rounded mb-4 animate-pulse"></div>
            <TableSkeleton rows={5} />
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4 transition-colors">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-8 max-w-md w-full border border-gray-200 dark:border-slate-700">
          <div className="text-red-600 dark:text-red-400 text-center">
            <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-slate-100">Error Loading Dashboard</h2>
            <p className="text-gray-600 dark:text-slate-400 mb-4">{error}</p>
            <button
              onClick={fetchStats}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-slate-700 transition-colors backdrop-blur-sm bg-white/95 dark:bg-slate-800/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Freelance Dashboard</h1>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Month Navigation */}
              <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-1">
                <button
                  onClick={handlePreviousMonth}
                  className="p-2 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  aria-label="Previous month"
                  title="Previous month"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="flex items-center gap-2 px-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-slate-100 whitespace-nowrap">
                    {getMonthDisplayName(selectedMonth)}
                  </span>
                  {!isCurrentMonth(selectedMonth) && (
                    <button
                      onClick={handleToday}
                      className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                      title="Jump to current month"
                    >
                      Today
                    </button>
                  )}
                </div>
                <button
                  onClick={handleNextMonth}
                  className="p-2 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  aria-label="Next month"
                  title="Next month"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                aria-label="Refresh dashboard data"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
              <ThemeToggle />
              <button
                onClick={() => setIsInvoiceWizardOpen(true)}
                className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 p-2 rounded-lg transition-colors border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                title="Create Invoice"
                aria-label="Create invoice"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
              <button
                onClick={() => setIsInvoiceListOpen(true)}
                className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 p-2 rounded-lg transition-colors border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                title="View Invoices"
                aria-label="View invoices"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
              <button
                onClick={() => setIsClientManagementOpen(true)}
                className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 p-2 rounded-lg transition-colors border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                title="Manage Clients"
                aria-label="Manage clients"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </button>
              <button
                onClick={() => setIsFuelModalOpen(true)}
                className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 p-2 rounded-lg transition-colors border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                title="Fuel Expenses"
                aria-label="Open fuel expenses"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </button>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 p-2 rounded-lg transition-colors border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                title="Settings"
                aria-label="Open settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <ProjectRateForm onSuccess={handleRefresh} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" aria-label="Dashboard content">
        {/* Summary Cards */}
        <section aria-labelledby="stats-heading" className="mb-8">
          <h2 id="stats-heading" className="sr-only">Dashboard Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <StatCard
            title="Total Hours"
            value={formatHours(stats.total_hours)}
            subtitle="This month"
            color="blue"
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            title="Estimated Income"
            value={formatCurrency(stats.total_income)}
            subtitle="Based on logged hours"
            color="green"
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            title="Fuel Expenses"
            value={fuelStats?.total?.total_spent ? formatCurrency(fuelStats.total.total_spent) : formatCurrency(0)}
            subtitle={fuelStats?.total?.transaction_count ? `${fuelStats.total.transaction_count} tankowanie` : "Brak transakcji"}
            color="orange"
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          />
          <StatCard
            title="Active Projects"
            value={stats.active_projects}
            subtitle="Projects with logged time"
            color="purple"
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          />
          <StatCard
            title="Monthly Goal"
            value={`${stats.goal_percentage.toFixed(1)}%`}
            subtitle={`${formatHours(stats.total_hours)} / ${formatHours(stats.monthly_goal)}`}
            color="indigo"
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            }
          />
          </div>
        </section>

        {/* Charts */}
        <section aria-labelledby="charts-heading" className="mb-8">
          <h2 id="charts-heading" className="sr-only">Data Visualization</h2>
          <Charts dailyBreakdown={stats.daily_breakdown} projects={stats.projects} />
        </section>

        {/* Project Breakdown Table */}
        <section aria-labelledby="projects-heading">
          <h2 id="projects-heading" className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-4">Project Breakdown</h2>
          <ProjectTable projects={stats.projects} currency={settings.currency} />
        </section>
      </main>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        onSuccess={handleRefresh}
      />

      {/* Fuel Expense Modal */}
      <FuelExpenseModal
        isOpen={isFuelModalOpen}
        onClose={handleFuelModalClose}
        currency={settings.currency}
      />

      {/* Invoice Wizard Modal */}
      <InvoiceWizardModal
        isOpen={isInvoiceWizardOpen}
        onClose={() => setIsInvoiceWizardOpen(false)}
        initialMonth={selectedMonth}
      />

      {/* Invoice List Modal */}
      <InvoiceListModal
        isOpen={isInvoiceListOpen}
        onClose={() => setIsInvoiceListOpen(false)}
      />

      {/* Client Management Modal */}
      <ClientManagementModal
        isOpen={isClientManagementOpen}
        onClose={() => setIsClientManagementOpen(false)}
      />
    </div>
  );
}
