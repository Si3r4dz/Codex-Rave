'use client';

import { useState, useEffect } from 'react';
import type { Invoice } from '@/types';

interface InvoiceListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface InvoiceListItem extends Invoice {
  client_name: string;
  client_nip: string;
}

export default function InvoiceListModal({ isOpen, onClose }: InvoiceListModalProps) {
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (isOpen) {
      fetchInvoices();
    }
  }, [isOpen]);

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`/api/invoices?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch invoices');
      
      const data = await response.json();
      setInvoices(data.rows || []);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError(err instanceof Error ? err.message : 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (invoiceId: number, invoiceNumber: string) => {
    if (!confirm(`Are you sure you want to delete invoice ${invoiceNumber}? This cannot be undone.`)) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete invoice');
      }

      await fetchInvoices();
    } catch (err) {
      console.error('Error deleting invoice:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = (invoiceId: number) => {
    window.open(`/api/invoices/${invoiceId}/pdf`, '_blank');
  };

  const handleDownloadXml = (invoiceId: number) => {
    window.open(`/api/invoices/${invoiceId}/xml`, '_blank');
  };

  const formatCurrency = (grosze: number) => {
    return (grosze / 100).toFixed(2) + ' PLN';
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      issued: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${styles[status as keyof typeof styles] || styles.draft}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const filteredInvoices = invoices;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            Invoice Management
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Filters */}
          <div className="flex gap-3 mb-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by invoice number or client..."
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="issued">Issued</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button
              onClick={fetchInvoices}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              {loading ? 'Loading...' : 'Search'}
            </button>
          </div>

          {/* Invoice List */}
          {loading && invoices.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-slate-400">Loading invoices...</div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-slate-400">
              No invoices found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-slate-300">
                      Invoice #
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-slate-300">
                      Client
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-slate-300">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-slate-300">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-slate-300">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-slate-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-slate-100">
                        {invoice.invoice_number}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                        <div>{invoice.client_name}</div>
                        <div className="text-xs text-gray-500 dark:text-slate-400">
                          NIP: {invoice.client_nip}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                        {invoice.issue_date}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-slate-100">
                        {formatCurrency(invoice.total_grosze)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {getStatusBadge(invoice.status)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <div className="flex justify-end gap-2">
                          {invoice.status === 'issued' && (
                            <>
                              <button
                                onClick={() => handleDownloadPdf(invoice.id)}
                                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                                title="Download PDF"
                              >
                                PDF
                              </button>
                              <button
                                onClick={() => handleDownloadXml(invoice.id)}
                                className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 font-medium"
                                title="Download XML"
                              >
                                XML
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDelete(invoice.id, invoice.invoice_number)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
                            title="Delete invoice"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary */}
          {invoices.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
              <div className="text-sm text-gray-600 dark:text-slate-400">
                Total: {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
                {statusFilter !== 'all' && ` (filtered by ${statusFilter})`}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

