'use client';

import { useState, useEffect } from 'react';
import { Client, DashboardStats } from '@/types';

interface InvoiceWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMonth?: string;
}

type Step = 'period' | 'client' | 'review';

export default function InvoiceWizardModal({ isOpen, onClose, initialMonth }: InvoiceWizardModalProps) {
  const [step, setStep] = useState<Step>('period');
  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth || '');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [defaultHourlyRate, setDefaultHourlyRate] = useState<string>('50');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoiceId, setInvoiceId] = useState<number | null>(null);
  const [issueLoading, setIssueLoading] = useState(false);
  const [issueSuccess, setIssueSuccess] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  
  // Editable invoice fields
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [vatRate, setVatRate] = useState<number>(23);
  const [issueDate, setIssueDate] = useState('');
  const [saleDate, setSaleDate] = useState('');
  const [paymentDeadline, setPaymentDeadline] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchClients();
      fetchSettings();
      if (initialMonth) {
        setSelectedMonth(initialMonth);
        fetchStats(initialMonth);
      }
    } else {
      // Reset on close
      setStep('period');
      setSelectedClient(null);
      setStats(null);
      setError(null);
      setInvoiceId(null);
      setIssueSuccess(false);
      setClientSearch('');
    }
  }, [isOpen, initialMonth]);

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients');
      if (response.ok) {
        const data = await response.json();
        setClients(data.rows || []);
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setDefaultHourlyRate(data.default_hourly_rate || '50');
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const fetchStats = async (month: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/stats?month=${month}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch stats');
      }
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load month data');
    } finally {
      setLoading(false);
    }
  };

  const handleNextFromPeriod = () => {
    if (!selectedMonth) {
      setError('Please select a month');
      return;
    }
    if (!stats) {
      fetchStats(selectedMonth);
    }
    setStep('client');
    setError(null);
  };

  const handleNextFromClient = () => {
    if (!selectedClient) {
      setError('Please select a client');
      return;
    }
    
    // Pre-fill editable fields with defaults
    if (stats && selectedMonth) {
      const [year, month] = selectedMonth.split('-');
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const lastDayOfMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
      const saleDateStr = `${year}-${month}-${String(lastDayOfMonth).padStart(2, '0')}`;
      
      // Payment deadline: 14 days from issue date
      const deadline = new Date(today);
      deadline.setDate(deadline.getDate() + 14);
      const deadlineStr = `${deadline.getFullYear()}-${String(deadline.getMonth() + 1).padStart(2, '0')}-${String(deadline.getDate()).padStart(2, '0')}`;
      
      setItemName(`Usługi informatyczne za ${year}-${month}`);
      setQuantity(stats.total_hours.toFixed(2));
      setUnitPrice(defaultHourlyRate);
      setVatRate(23);
      setIssueDate(todayStr);
      setSaleDate(saleDateStr);
      setPaymentDeadline(deadlineStr);
    }
    
    setStep('review');
    setError(null);
  };

  const handleSaveDraft = async (): Promise<number | null> => {
    if (!selectedClient || !stats) return null;

    setLoading(true);
    setError(null);

    try {
      const unitPriceGrosze = Math.round(parseFloat(unitPrice) * 100);
      const parsedQuantity = parseFloat(quantity);
      
      if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
        setError('Invalid quantity');
        setLoading(false);
        return null;
      }
      
      if (isNaN(unitPriceGrosze) || unitPriceGrosze <= 0) {
        setError('Invalid unit price');
        setLoading(false);
        return null;
      }
      
      if (!issueDate || !saleDate) {
        setError('Issue date and sale date are required');
        setLoading(false);
        return null;
      }
      
      // Validate date format YYYY-MM-DD
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(issueDate) || !dateRegex.test(saleDate)) {
        setError('Invalid date format');
        setLoading(false);
        return null;
      }
      
      if (paymentDeadline && !dateRegex.test(paymentDeadline)) {
        setError('Invalid payment deadline format');
        setLoading(false);
        return null;
      }
      
      const invoiceData = {
        client_id: selectedClient.id,
        issue_date: issueDate,
        sale_date: saleDate,
        payment_method: 'bank_transfer',
        payment_deadline: paymentDeadline || null,
        currency: 'PLN',
        notes: null,
        status: 'draft',
        items: [
          {
            name: itemName,
            quantity: parsedQuantity,
            unit: 'h',
            unit_price_grosze: unitPriceGrosze,
            vat_rate: vatRate,
          },
        ],
      };

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create invoice');
      }

      const invoice = await response.json();
      setInvoiceId(invoice.id);
      alert('Draft invoice created successfully!');
      return invoice.id;
    } catch (err) {
      console.error('Error creating invoice:', err);
      setError(err instanceof Error ? err.message : 'Failed to create invoice');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleIssue = async () => {
    if (!selectedClient || !stats) return;

    setIssueLoading(true);
    setError(null);

    try {
      // Create invoice if not already created
      let currentInvoiceId = invoiceId;
      if (!currentInvoiceId) {
        const createdId = await handleSaveDraft();
        if (!createdId) {
          throw new Error('Failed to create invoice');
        }
        currentInvoiceId = createdId;
      }

      // Issue the invoice
      const response = await fetch(`/api/invoices/${currentInvoiceId}/issue`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to issue invoice');
      }

      const result = await response.json();
      setIssueSuccess(true);
      setInvoiceId(result.invoice.id);
    } catch (err) {
      console.error('Error issuing invoice:', err);
      setError(err instanceof Error ? err.message : 'Failed to issue invoice');
    } finally {
      setIssueLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!invoiceId) return;
    window.open(`/api/invoices/${invoiceId}/pdf`, '_blank');
  };

  const handleDownloadXml = () => {
    if (!invoiceId) return;
    window.open(`/api/invoices/${invoiceId}/xml`, '_blank');
  };

  const filteredClients = clientSearch
    ? clients.filter(
        (c) =>
          c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
          c.nip.includes(clientSearch)
      )
    : clients;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            {step === 'period' && 'Select Period'}
            {step === 'client' && 'Select Client'}
            {step === 'review' && 'Review & Issue'}
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

          {/* Step 1: Period */}
          {step === 'period' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Invoice Month
                </label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(e.target.value);
                    fetchStats(e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                />
              </div>

              {loading && (
                <div className="text-center py-4 text-gray-500 dark:text-slate-400">
                  Loading month data...
                </div>
              )}

              {stats && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Month Summary</h3>
                  <div className="space-y-1 text-sm text-blue-800 dark:text-blue-400">
                    <p>Total Hours: {stats.total_hours.toFixed(2)}h</p>
                    <p>Estimated Income: {stats.total_income.toFixed(2)} PLN</p>
                    <p>Active Projects: {stats.active_projects}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Client */}
          {step === 'client' && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Search Client
                  </label>
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    placeholder="Search by name or NIP..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="border border-gray-200 dark:border-slate-700 rounded-lg max-h-96 overflow-y-auto">
                {filteredClients.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-slate-400">
                    No clients found
                  </div>
                ) : (
                  filteredClients.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => setSelectedClient(client)}
                      className={`w-full text-left p-4 border-b border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${
                        selectedClient?.id === client.id
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500'
                          : ''
                      }`}
                    >
                      <div className="font-medium text-gray-900 dark:text-slate-100">{client.name}</div>
                      <div className="text-sm text-gray-500 dark:text-slate-400">NIP: {client.nip}</div>
                      {client.email && (
                        <div className="text-sm text-gray-500 dark:text-slate-400">{client.email}</div>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 'review' && stats && selectedClient && (
            <div className="space-y-4">
              {issueSuccess ? (
                <div className="text-center py-8 space-y-4">
                  <div className="text-green-600 dark:text-green-400 text-6xl mb-4">✓</div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                    Invoice Issued Successfully!
                  </h3>
                  <p className="text-gray-600 dark:text-slate-400">
                    Your invoice has been generated with both PDF and KSeF XML files.
                  </p>
                  <div className="flex justify-center gap-4 pt-4">
                    <button
                      onClick={handleDownloadPdf}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                    >
                      Download PDF
                    </button>
                    <button
                      onClick={handleDownloadXml}
                      className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                    >
                      Download KSeF XML
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4 space-y-3">
                    <h3 className="font-medium text-gray-900 dark:text-slate-100 mb-2">Invoice Details</h3>
                    
                    <div className="text-sm space-y-1 mb-3">
                      <p className="text-gray-700 dark:text-slate-300">
                        <span className="font-medium">Period:</span> {selectedMonth}
                      </p>
                      <p className="text-gray-700 dark:text-slate-300">
                        <span className="font-medium">Client:</span> {selectedClient.name} ({selectedClient.nip})
                      </p>
                    </div>

                    <div className="space-y-3 border-t border-gray-200 dark:border-slate-600 pt-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                            Issue Date
                          </label>
                          <input
                            type="date"
                            value={issueDate}
                            onChange={(e) => setIssueDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                            Sale Date
                          </label>
                          <input
                            type="date"
                            value={saleDate}
                            onChange={(e) => setSaleDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                            Payment Deadline
                          </label>
                          <input
                            type="date"
                            value={paymentDeadline}
                            onChange={(e) => setPaymentDeadline(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-100"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 border-t border-gray-200 dark:border-slate-600 pt-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                          Service Description
                        </label>
                        <input
                          type="text"
                          value={itemName}
                          onChange={(e) => setItemName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                            Quantity (hours)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                            Unit Price (NET PLN)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={unitPrice}
                            onChange={(e) => setUnitPrice(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-100"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                          VAT Rate
                        </label>
                        <select
                          value={vatRate}
                          onChange={(e) => setVatRate(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-100"
                        >
                          <option value={23}>23%</option>
                          <option value={8}>8%</option>
                          <option value={5}>5%</option>
                          <option value={0}>0%</option>
                        </select>
                      </div>

                      <div className="border-t border-gray-200 dark:border-slate-600 pt-3 space-y-1">
                        <p className="text-gray-700 dark:text-slate-300 font-bold text-base">
                          <span className="font-medium">Total NET:</span>{' '}
                          {(parseFloat(quantity || '0') * parseFloat(unitPrice || '0')).toFixed(2)} PLN
                        </p>
                        <p className="text-gray-700 dark:text-slate-300 font-bold text-base">
                          <span className="font-medium">Total GROSS:</span>{' '}
                          {(parseFloat(quantity || '0') * parseFloat(unitPrice || '0') * (1 + vatRate / 100)).toFixed(2)} PLN
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-sm text-yellow-800 dark:text-yellow-400">
                    <p className="font-medium mb-1">⚠️ Ready to issue?</p>
                    <p>This will generate the invoice in the database and create both PDF and KSeF FA(3) XML files.</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between p-6 border-t border-gray-200 dark:border-slate-700">
          {step !== 'period' && !issueSuccess && (
            <button
              onClick={() => {
                if (step === 'client') setStep('period');
                if (step === 'review') setStep('client');
              }}
              className="text-gray-700 dark:text-slate-200 hover:text-gray-900 dark:hover:text-slate-100 font-medium"
            >
              ← Back
            </button>
          )}
          {issueSuccess ? (
            <button
              onClick={onClose}
              className="ml-auto bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Close
            </button>
          ) : (
            <div className="ml-auto flex gap-3">
              {step === 'period' && (
                <button
                  onClick={handleNextFromPeriod}
                  disabled={!selectedMonth || loading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  Next →
                </button>
              )}
              {step === 'client' && (
                <button
                  onClick={handleNextFromClient}
                  disabled={!selectedClient}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  Next →
                </button>
              )}
              {step === 'review' && (
                <>
                  <button
                    onClick={handleSaveDraft}
                    disabled={loading || invoiceId !== null}
                    className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                  >
                    {invoiceId ? 'Draft Saved' : 'Save Draft'}
                  </button>
                  <button
                    onClick={handleIssue}
                    disabled={issueLoading}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                  >
                    {issueLoading ? 'Issuing...' : 'Issue & Generate'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

