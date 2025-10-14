'use client';

import { DailyStats, ProjectStats } from '@/types';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

interface ChartsProps {
  dailyBreakdown: DailyStats[];
  projects: ProjectStats[];
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1', '#f97316'];

export default function Charts({ dailyBreakdown, projects }: ChartsProps) {
  // Prepare data for project distribution pie chart
  const projectDistribution = projects.map((project) => ({
    name: project.project_name,
    value: project.hours,
  }));

  // Prepare data for income by project bar chart
  const incomeByProject = projects
    .filter((p) => p.income !== null)
    .map((project) => ({
      name: project.project_name.length > 20 ? project.project_name.substring(0, 20) + '...' : project.project_name,
      income: project.income,
    }));

  // Format daily data for chart
  const dailyData = dailyBreakdown.map((day) => ({
    date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    hours: day.hours,
    income: day.income,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Daily Hours Chart */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-slate-700"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Daily Hours</h3>
        {dailyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyData}>
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
      </motion.div>

      {/* Project Distribution Pie Chart */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-slate-700"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Project Distribution</h3>
        {projectDistribution.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={projectDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: any) => `${entry.name}: ${Number(entry.value).toFixed(1)}h`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {projectDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500 dark:text-slate-400">
            No project data available
          </div>
        )}
      </motion.div>

      {/* Income by Project Bar Chart */}
      {incomeByProject.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 lg:col-span-2 border border-gray-200 dark:border-slate-700"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Income by Project</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={incomeByProject}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" style={{ fontSize: '12px' }} />
              <YAxis style={{ fontSize: '12px' }} />
              <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
              <Legend />
              <Bar dataKey="income" fill="#10b981" name="Income ($)" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}
    </div>
  );
}

