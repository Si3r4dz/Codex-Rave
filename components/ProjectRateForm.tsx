'use client';

import { useState, useEffect } from 'react';
import { ProjectRate, EverhourProject } from '@/types';
import { toast } from 'sonner';

interface ProjectRateFormProps {
  onSuccess: () => void;
}

export default function ProjectRateForm({ onSuccess }: ProjectRateFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [everhourProjects, setEverhourProjects] = useState<EverhourProject[]>([]);
  const [existingRates, setExistingRates] = useState<ProjectRate[]>([]);
  const [formData, setFormData] = useState({
    everhour_project_id: '',
    project_name: '',
    hourly_rate: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [projectsRes, ratesRes] = await Promise.all([
        fetch('/api/everhour-projects'),
        fetch('/api/project-rates'),
      ]);

      if (projectsRes.ok) {
        const projects = await projectsRes.json();
        setEverhourProjects(projects);
      }

      if (ratesRes.ok) {
        const rates = await ratesRes.json();
        setExistingRates(rates);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSelect = (projectId: string) => {
    const project = everhourProjects.find((p) => p.id === projectId);
    const existingRate = existingRates.find((r) => r.everhour_project_id === projectId);

    if (project) {
      setFormData({
        everhour_project_id: project.id,
        project_name: project.name,
        hourly_rate: existingRate ? existingRate.hourly_rate.toString() : '',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/project-rates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          everhour_project_id: formData.everhour_project_id,
          project_name: formData.project_name,
          hourly_rate: parseFloat(formData.hourly_rate),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save project rate');
      }

      toast.success('Project rate saved successfully!');
      setFormData({ everhour_project_id: '', project_name: '', hourly_rate: '' });
      setIsOpen(false);
      onSuccess();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this project rate?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/project-rates?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete project rate');
      }

      toast.success('Project rate deleted successfully!');
      onSuccess();
      fetchData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
      >
        Manage Project Rates
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-slate-700 shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Manage Project Rates</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 text-2xl transition-colors"
                >
                  ×
                </button>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mb-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Select Project
                    </label>
                    <select
                      value={formData.everhour_project_id}
                      onChange={(e) => handleProjectSelect(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
                      required
                      disabled={loading}
                    >
                      <option value="">Choose a project...</option>
                      {everhourProjects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Project Name
                    </label>
                    <input
                      type="text"
                      value={formData.project_name}
                      onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Hourly Rate (PLN)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.hourly_rate}
                      onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Saving...' : 'Save Rate'}
                  </button>
                </div>
              </form>

              {existingRates.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-3">Existing Rates</h3>
                  <div className="space-y-2">
                    {existingRates.map((rate) => (
                      <div
                        key={rate.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-md border border-gray-200 dark:border-slate-600"
                      >
                        <div>
                          <p className="font-medium text-gray-900 dark:text-slate-100">{rate.project_name}</p>
                          <p className="text-sm text-gray-600 dark:text-slate-400">{rate.hourly_rate} PLN/hour</p>
                        </div>
                        <button
                          onClick={() => handleDelete(rate.id)}
                          disabled={loading}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium text-sm disabled:opacity-50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

