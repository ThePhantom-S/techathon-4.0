import React, { useState } from 'react';
import { Expense, InventoryItem, Payable, Supplier, Transaction } from '../types';
import { Upload, Download, CheckCircle2, Database } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { generateBankStatementTemplate, generateCashShockTemplate } from '../engine/csvParser';
import { formatINR } from '../engine/calculator';
import { formatCurrencyFull } from '../utils/currency';

import { TableSkeleton } from './ui/Skeleton';

interface DataManagementViewProps {
  transactions: Transaction[];
  payables: Payable[];
  inventory: InventoryItem[];
  suppliers: Supplier[];
  expenses: Expense[];
  onUploadCsvData: (csvText: string) => void;
  onResetDemoData: () => void;
  isLoading?: boolean;
}

export const DataManagementView: React.FC<DataManagementViewProps> = ({
  transactions,
  payables,
  inventory,
  suppliers,
  expenses,
  onUploadCsvData,
  onResetDemoData,
  isLoading = false,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [activeSubTab, setActiveSubTab] = useState<'transactions' | 'payables' | 'inventory' | 'suppliers' | 'expenses'>('transactions');
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        onUploadCsvData(text);
        setUploadStatus(`Successfully parsed "${file.name}" into simulation engine.`);
        setTimeout(() => setUploadStatus(null), 4000);
      }
    };
    reader.readAsText(file);
  };

  const downloadSampleCsv = (format: 'bank' | 'template') => {
    const content = format === 'bank' ? generateBankStatementTemplate() : generateCashShockTemplate();
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', format === 'bank' ? 'shakti_bank_statement.csv' : 'cashshock_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-xl font-bold tracking-tight flex items-center gap-2 ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            <Database className="w-5 h-5 text-indigo-500" />
            FlowShield — SME Financial Events Ledger
          </h2>
          <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
            Inspect and ingest financial transactions, payables, inventory, and supplier parameters.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => downloadSampleCsv('bank')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-150 cursor-pointer active:scale-[0.97] ${
              isLight ? 'bg-[#FFFFFF] border-[#EAEAEA] text-[#171717] hover:bg-[#FAFAFA]' : 'bg-[#0A0A0A] border-[#222222] text-[#EDEDED] hover:bg-[#111111]'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Bank Statement CSV
          </button>
          <button
            onClick={() => downloadSampleCsv('template')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-150 cursor-pointer active:scale-[0.97] ${
              isLight ? 'bg-[#FFFFFF] border-[#EAEAEA] text-[#171717] hover:bg-[#FAFAFA]' : 'bg-[#0A0A0A] border-[#222222] text-[#EDEDED] hover:bg-[#111111]'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            FlowShield CSV
          </button>
          <button
            onClick={onResetDemoData}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer active:scale-[0.97] ${
              isLight ? 'bg-[#171717] text-[#FFFFFF] hover:opacity-90' : 'bg-[#EDEDED] text-[#000000] hover:opacity-90'
            }`}
          >
            Reset Demo Data
          </button>
        </div>
      </div>

      {/* Upload Drag & Drop Box */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-colors ${
          dragActive
            ? 'border-[#EDEDED] bg-[#1A1A1A]'
            : isLight
            ? 'bg-[#FAFAFA] border-[#EAEAEA]'
            : 'bg-[#0A0A0A] border-[#222222]'
        }`}
      >
        <Upload className="w-6 h-6 text-[#A1A1AA] mb-2" />
        <h3 className={`text-sm font-semibold ${isLight ? 'text-[#171717]' : 'text-[#EDEDED]'}`}>
          Upload Financial CSV File
        </h3>
        <p className={`text-xs mt-1 mb-3 ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>
          Drag and drop your financial CSV records containing transactions, payables, inventory, and suppliers.
        </p>
        <label className={`px-4 py-1.5 text-xs font-medium rounded-full cursor-pointer transition-all duration-150 active:scale-[0.97] ${
          isLight ? 'bg-[#171717] text-[#FFFFFF] hover:opacity-90' : 'bg-[#EDEDED] text-[#000000] hover:opacity-90'
        }`}>
          Browse CSV File
          <input type="file" accept=".csv" onChange={handleFileInput} className="hidden" />
        </label>
        {uploadStatus && (
          <div className="mt-3 text-xs text-[#22C55E] font-mono flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            {uploadStatus}
          </div>
        )}
      </div>

      {/* Dataset Sub-navigation */}
      <div className={`flex border-b gap-1 font-mono text-xs overflow-x-auto no-scrollbar pb-0.5 ${isLight ? 'border-[#EAEAEA]' : 'border-[#222222]'}`}>
        {[
          { id: 'transactions', label: `Transactions (${transactions.length})` },
          { id: 'payables', label: `Payables (${payables.length})` },
          { id: 'inventory', label: `Inventory (${inventory.length})` },
          { id: 'suppliers', label: `Suppliers (${suppliers.length})` },
          { id: 'expenses', label: `Expenses (${expenses.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`px-3 py-2 font-medium transition-all duration-150 cursor-pointer rounded-t-xl shrink-0 whitespace-nowrap ${
              activeSubTab === tab.id
                ? isLight
                  ? 'bg-[#FFFFFF] text-[#171717] border-t border-x border-[#EAEAEA]'
                  : 'bg-[#0A0A0A] text-[#EDEDED] border-t border-x border-[#222222]'
                : isLight
                ? 'text-[#666666] hover:text-[#171717]'
                : 'text-[#71717A] hover:text-[#EDEDED]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Raw Data Table */}
      {isLoading ? (
        <TableSkeleton rows={7} columns={6} />
      ) : (
        <div className={`border rounded-2xl overflow-x-auto ${
          isLight ? 'bg-[#FFFFFF] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'
        }`}>
          {activeSubTab === 'transactions' && (
          <table className="w-full text-left font-mono text-xs">
            <thead className={`border-b ${
              isLight ? 'bg-[#FAFAFA] border-[#EAEAEA] text-[#8A8A8A]' : 'bg-[#111111] border-[#222222] text-[#71717A]'
            }`}>
              <tr>
                <th className="p-3">ID</th>
                <th className="p-3">Expected Date</th>
                <th className="p-3">Customer</th>
                <th className="p-3 text-right">Invoice Amount</th>
                <th className="p-3 text-center">Probability</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-[#EAEAEA]' : 'divide-[#222222]'}`}>
              {transactions.map((t) => (
                <tr key={t.id} className={isLight ? 'hover:bg-[#FAFAFA]' : 'hover:bg-[#111111]'}>
                  <td className="p-3 font-semibold">{t.id}</td>
                  <td className="p-3">{t.expected_payment_date}</td>
                  <td className={`p-3 font-sans ${isLight ? 'text-[#171717]' : 'text-[#EDEDED]'}`}>{t.customer}</td>
                  <td className="p-3 text-right font-semibold text-[#22C55E]">
                    {formatINR(t.invoice_amount)}
                  </td>
                  <td className="p-3 text-center">{(t.collection_probability * 100).toFixed(0)}%</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] ${
                      t.status === 'DELAYED'
                        ? 'border-[#EAB308]/30 text-[#EAB308] bg-[#EAB308]/10'
                        : 'border-[#22C55E]/30 text-[#22C55E] bg-[#22C55E]/10'
                    }`}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeSubTab === 'payables' && (
          <table className="w-full text-left font-mono text-xs">
            <thead className={`border-b ${
              isLight ? 'bg-[#FAFAFA] border-[#EAEAEA] text-[#8A8A8A]' : 'bg-[#111111] border-[#222222] text-[#71717A]'
            }`}>
              <tr>
                <th className="p-3">ID</th>
                <th className="p-3">Due Date</th>
                <th className="p-3">Supplier / Vendor</th>
                <th className="p-3">Category</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-[#EAEAEA]' : 'divide-[#222222]'}`}>
              {payables.map((p) => (
                <tr key={p.id} className={isLight ? 'hover:bg-[#FAFAFA]' : 'hover:bg-[#111111]'}>
                  <td className="p-3 font-semibold text-[#EF4444]">{p.id}</td>
                  <td className="p-3">{p.due_date}</td>
                  <td className={`p-3 font-sans ${isLight ? 'text-[#171717]' : 'text-[#EDEDED]'}`}>{p.supplier}</td>
                  <td className={isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}>{p.category}</td>
                  <td className="p-3 text-right font-semibold text-[#EF4444]">
                    -{formatINR(p.amount)}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] ${
                      p.status === 'CRITICAL'
                        ? 'border-[#EF4444]/30 text-[#EF4444] bg-[#EF4444]/10'
                        : isLight ? 'bg-[#FAFAFA] text-[#666666] border-[#EAEAEA]' : 'bg-[#111111] text-[#A1A1AA] border-[#222222]'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeSubTab === 'inventory' && (
          <table className="w-full text-left font-mono text-xs">
            <thead className={`border-b ${
              isLight ? 'bg-[#FAFAFA] border-[#EAEAEA] text-[#8A8A8A]' : 'bg-[#111111] border-[#222222] text-[#71717A]'
            }`}>
              <tr>
                <th className="p-3">SKU</th>
                <th className="p-3">Item Name</th>
                <th className="p-3 text-right">Quantity</th>
                <th className="p-3 text-right">Unit Cost</th>
                <th className="p-3 text-right">Safety Stock</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-[#EAEAEA]' : 'divide-[#222222]'}`}>
              {inventory.map((item) => (
                <tr key={item.SKU} className={isLight ? 'hover:bg-[#FAFAFA]' : 'hover:bg-[#111111]'}>
                  <td className="p-3 font-semibold">{item.SKU}</td>
                  <td className={`p-3 font-sans ${isLight ? 'text-[#171717]' : 'text-[#EDEDED]'}`}>{item.name}</td>
                  <td className="p-3 text-right">{item.quantity}</td>
                  <td className="p-3 text-right">{formatCurrencyFull(item.unitCost)}</td>
                  <td className="p-3 text-right">{item.safetyStock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeSubTab === 'suppliers' && (
          <table className="w-full text-left font-mono text-xs">
            <thead className={`border-b ${
              isLight ? 'bg-[#FAFAFA] border-[#EAEAEA] text-[#8A8A8A]' : 'bg-[#111111] border-[#222222] text-[#71717A]'
            }`}>
              <tr>
                <th className="p-3">Supplier Name</th>
                <th className="p-3">Category</th>
                <th className="p-3 text-right">Lead Time</th>
                <th className="p-3 text-right">Reliability</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-[#EAEAEA]' : 'divide-[#222222]'}`}>
              {suppliers.map((s) => (
                <tr key={s.id} className={isLight ? 'hover:bg-[#FAFAFA]' : 'hover:bg-[#111111]'}>
                  <td className={`p-3 font-sans font-semibold ${isLight ? 'text-[#171717]' : 'text-[#EDEDED]'}`}>{s.name}</td>
                  <td className="p-3">{s.category}</td>
                  <td className="p-3 text-right">{s.leadTimeDays} Days</td>
                  <td className="p-3 text-right">{(s.reliabilityScore * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeSubTab === 'expenses' && (
          <table className="w-full text-left font-mono text-xs">
            <thead className={`border-b ${
              isLight ? 'bg-[#FAFAFA] border-[#EAEAEA] text-[#8A8A8A]' : 'bg-[#111111] border-[#222222] text-[#71717A]'
            }`}>
              <tr>
                <th className="p-3">ID</th>
                <th className="p-3">Date</th>
                <th className="p-3">Category</th>
                <th className="p-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-[#EAEAEA]' : 'divide-[#222222]'}`}>
              {expenses.map((e) => (
                <tr key={e.id} className={isLight ? 'hover:bg-[#FAFAFA]' : 'hover:bg-[#111111]'}>
                  <td className="p-3 font-semibold">{e.id}</td>
                  <td className="p-3">{e.date}</td>
                  <td className="p-3 font-sans">{e.category}</td>
                  <td className="p-3 text-right font-semibold text-[#EF4444]">-{formatINR(e.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      )}
    </div>
  );
};
