'use client';

import { useState, useMemo } from 'react';
import { ProjectStats } from '@/types';

interface ProjectTableProps {
  projects: ProjectStats[];
  currency?: string;
}

type SortField = 'name' | 'hours' | 'rate' | 'income' | 'percentage';
type SortDirection = 'asc' | 'desc';

export default function ProjectTable({ projects, currency = 'PLN' }: ProjectTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('hours');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
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

  const formatHours = (hours: number) => {
    return `${hours.toFixed(2)}h`;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredAndSortedProjects = useMemo(() => {
    let filtered = projects.filter((project) =>
      project.project_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.project_name.toLowerCase();
          bValue = b.project_name.toLowerCase();
          break;
        case 'hours':
          aValue = a.hours;
          bValue = b.hours;
          break;
        case 'rate':
          aValue = a.hourly_rate ?? -1;
          bValue = b.hourly_rate ?? -1;
          break;
        case 'income':
          aValue = a.income ?? -1;
          bValue = b.income ?? -1;
          break;
        case 'percentage':
          aValue = a.percentage;
          bValue = b.percentage;
          break;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [projects, searchQuery, sortField, sortDirection]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  if (projects.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-8 text-center border border-gray-200 dark:border-slate-700">
        <p className="text-gray-500 dark:text-slate-400">No project data available for this month</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop/Tablet Table View */}
      <div className="hidden md:block bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-slate-700">
        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 rounded-md leading-5 placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
            aria-label="Search projects"
          />
        </div>
        {searchQuery && (
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">
            Found {filteredAndSortedProjects.length} of {projects.length} projects
          </p>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
          <thead className="bg-gray-50 dark:bg-slate-700/50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600/50 transition-colors select-none"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-2">
                  <span>Project</span>
                  <SortIcon field="name" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600/50 transition-colors select-none"
                onClick={() => handleSort('hours')}
              >
                <div className="flex items-center gap-2">
                  <span>Hours</span>
                  <SortIcon field="hours" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600/50 transition-colors select-none"
                onClick={() => handleSort('rate')}
              >
                <div className="flex items-center gap-2">
                  <span>Rate</span>
                  <SortIcon field="rate" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600/50 transition-colors select-none"
                onClick={() => handleSort('income')}
              >
                <div className="flex items-center gap-2">
                  <span>Income</span>
                  <SortIcon field="income" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600/50 transition-colors select-none"
                onClick={() => handleSort('percentage')}
              >
                <div className="flex items-center gap-2">
                  <span>% of Total</span>
                  <SortIcon field="percentage" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
            {filteredAndSortedProjects.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-slate-400">
                  No projects match your search
                </td>
              </tr>
            ) : (
              filteredAndSortedProjects.map((project) => (
              <tr key={project.project_id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-slate-100">{project.project_name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-slate-200">{formatHours(project.hours)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-slate-200">
                    {project.hourly_rate !== null ? (
                      <div className="flex items-center gap-2">
                        <span>{project.hourly_rate} {currency}/h</span>
                      </div>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 text-xs font-medium">Not set</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className={`text-sm font-medium ${project.income !== null ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-slate-500'}`}>
                    {formatCurrency(project.income)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="text-sm text-gray-900 dark:text-slate-200">{project.percentage.toFixed(1)}%</div>
                    <div className="ml-3 w-16 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(project.percentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {/* Search Bar for Mobile */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-slate-700">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 rounded-md leading-5 placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
              aria-label="Search projects"
            />
          </div>
          {searchQuery && (
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">
              Found {filteredAndSortedProjects.length} of {projects.length} projects
            </p>
          )}
        </div>

        {/* Project Cards */}
        {filteredAndSortedProjects.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-8 text-center border border-gray-200 dark:border-slate-700">
            <p className="text-gray-500 dark:text-slate-400">No projects match your search</p>
          </div>
        ) : (
          filteredAndSortedProjects.map((project) => (
            <div 
              key={project.project_id}
              className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-slate-700"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-slate-100 text-lg">{project.project_name}</h3>
                <span className="text-sm text-gray-500 dark:text-slate-400">{project.percentage.toFixed(1)}%</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-slate-400">Hours</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-slate-200">{formatHours(project.hours)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-slate-400">Rate</span>
                  {project.hourly_rate !== null ? (
                    <span className="text-sm font-medium text-gray-900 dark:text-slate-200">{project.hourly_rate} {currency}/h</span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 text-xs font-medium">Not set</span>
                  )}
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-slate-400">Income</span>
                  <span className={`text-sm font-medium ${project.income !== null ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-slate-500'}`}>
                    {formatCurrency(project.income)}
                  </span>
                </div>
              </div>
              
              <div className="mt-3">
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(project.percentage, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

