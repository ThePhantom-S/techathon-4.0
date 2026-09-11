import { SimulationResult } from '../types';
import { formatINR } from './calculator';

interface PDFData {
  simulationResult: SimulationResult;
  cashFloor: number;
  supplierDelayDays: number;
  companyName?: string;
  gstin?: string;
}

export function generatePDFReport(data: PDFData): void {
  const { simulationResult, cashFloor, supplierDelayDays, companyName = 'Shakti Electronics', gstin = '33AABCS1234B1Z1' } = data;
  
  const {
    currentCash,
    minProjectedCash,
    hasBreach,
    breachProbability,
    p10Cash,
    p50Cash,
    p90Cash,
    earliestBreachDate,
    daysUntilBreach,
    workingCapital,
    counterfactuals,
    driverAnalysis,
  } = simulationResult;

  // Create HTML content for PDF
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Cash Flow Intelligence Report</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        @page { size: A4; margin: 12mm; }
        body { 
          font-family: 'Inter', sans-serif; 
          color: #1f2937; 
          margin: 0; 
          padding: 20px; 
          background-color: #fff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .report-container { max-width: 1000px; margin: 0 auto; }
        .header { 
          display: flex; 
          justify-content: space-between; 
          align-items: flex-end; 
          border-bottom: 2px solid #e5e7eb; 
          padding-bottom: 20px; 
          margin-bottom: 30px; 
        }
        .brand { display: flex; flex-direction: column; }
        .company-name { font-size: 28px; font-weight: 800; color: #111827; letter-spacing: -0.02em; }
        .gstin { font-size: 13px; color: #6b7280; margin-top: 4px; font-weight: 500; }
        .report-meta { text-align: right; }
        .report-title { font-size: 16px; font-weight: 700; color: #4f46e5; text-transform: uppercase; letter-spacing: 0.05em; }
        .date { font-size: 13px; color: #6b7280; margin-top: 4px; font-weight: 500; }
        
        .section { margin-bottom: 32px; page-break-inside: avoid; }
        .section-title { 
          font-size: 14px; 
          font-weight: 700; 
          color: #374151; 
          text-transform: uppercase; 
          letter-spacing: 0.06em; 
          border-bottom: 1px solid #e5e7eb; 
          padding-bottom: 8px; 
          margin-bottom: 16px; 
        }
        
        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .kpi-card { background: #f9fafb; border: 1px solid #f3f4f6; border-radius: 8px; padding: 16px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
        .kpi-label { font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.02em; margin-bottom: 8px; }
        .kpi-value { font-size: 20px; font-weight: 700; color: #111827; }
        
        .positive { color: #059669 !important; }
        .negative { color: #dc2626 !important; }
        .warning { color: #d97706 !important; }
        
        .risk-badge { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; letter-spacing: 0.02em; }
        .risk-high { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
        .risk-low { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
        
        .table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 8px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
        .table th { background: #f9fafb; color: #4b5563; padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.02em; border-bottom: 1px solid #e5e7eb; }
        .table td { padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #374151; font-weight: 500; }
        .table tr:last-child td { border-bottom: none; }
        .table tbody tr:nth-child(even) { background-color: #fdfdfd; }
        
        .recommendation { background: #eff6ff; border: 1px solid #bfdbfe; border-left: 4px solid #3b82f6; padding: 16px 20px; margin-top: 20px; border-radius: 4px 8px 8px 4px; font-size: 14px; line-height: 1.5; color: #1e3a8a; }
        
        .footer { text-align: center; margin-top: 50px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; font-weight: 500; }
        
        .status-pill { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
        .status-safe { background: #ecfdf5; color: #059669; }
        .status-warn { background: #fffbeb; color: #d97706; }
        .status-dang { background: #fef2f2; color: #dc2626; }
        .status-pend { background: #f3f4f6; color: #4b5563; }
      </style>
    </head>
    <body>
      <div class="report-container">
        <div class="header">
          <div class="brand">
            <div class="company-name">${companyName}</div>
            <div class="gstin">GSTIN: ${gstin}</div>
          </div>
          <div class="report-meta">
            <div class="report-title">Cash Flow Intelligence Report</div>
            <div class="date">Generated: ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Executive Summary</div>
          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-label">Current Cash Position</div>
              <div class="kpi-value">${formatINR(currentCash)}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Min Projected (90 Days)</div>
              <div class="kpi-value ${minProjectedCash < cashFloor ? 'negative' : 'positive'}">${formatINR(minProjectedCash)}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Policy Safety Floor</div>
              <div class="kpi-value">${formatINR(cashFloor)}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Liquidity Risk Status</div>
              <div>
                <span class="risk-badge ${hasBreach ? 'risk-high' : 'risk-low'}">
                  ${hasBreach ? 'CRITICAL RISK' : 'HEALTHY'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Forecast &amp; Volatility Analysis</div>
          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-label">Breach Probability</div>
              <div class="kpi-value ${breachProbability > 0.5 ? 'negative' : 'positive'}">${(breachProbability * 100).toFixed(0)}%</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Time to Breach</div>
              <div class="kpi-value ${daysUntilBreach && daysUntilBreach < 30 ? 'warning' : 'positive'}">${daysUntilBreach ? `${daysUntilBreach} Days` : 'Safe (>90d)'}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Worst Case (P10)</div>
              <div class="kpi-value negative">${formatINR(p10Cash)}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Best Case (P90)</div>
              <div class="kpi-value positive">${formatINR(p90Cash)}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Working Capital Efficiency</div>
          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-label">Days Sales Outstanding</div>
              <div class="kpi-value">${workingCapital.dso} Days</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Days Inventory (DIO)</div>
              <div class="kpi-value">${workingCapital.dio} Days</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Days Payable (DPO)</div>
              <div class="kpi-value">${workingCapital.dpo} Days</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Cash Conversion Cycle</div>
              <div class="kpi-value ${workingCapital.ccc > 60 ? 'warning' : 'positive'}">${workingCapital.ccc} Days</div>
            </div>
          </div>
        </div>

        <div class="section" style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
          <div>
            <div class="section-title">Key Outflows (Next 30 Days)</div>
            <table class="table">
              <thead>
                <tr>
                  <th>Vendor / Payable</th>
                  <th style="text-align: right;">Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${driverAnalysis.topOutflows.slice(0, 5).map(outflow => `
                  <tr>
                    <td>${outflow.entity}</td>
                    <td class="negative" style="text-align: right;">${formatINR(outflow.amount)}</td>
                    <td><span class="status-pill status-dang">${outflow.statusTag || 'DUE'}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div>
            <div class="section-title">Key Inflows (Next 30 Days)</div>
            <table class="table">
              <thead>
                <tr>
                  <th>Customer / Receivable</th>
                  <th style="text-align: right;">Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${driverAnalysis.topInflows.slice(0, 5).map(inflow => `
                  <tr>
                    <td>${inflow.entity}</td>
                    <td class="positive" style="text-align: right;">${formatINR(inflow.amount)}</td>
                    <td><span class="status-pill status-pend">${inflow.statusTag || 'PENDING'}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        ${counterfactuals.length > 0 ? `
        <div class="section">
          <div class="section-title">Decision Impact Analysis &amp; Strategies</div>
          <table class="table">
            <thead>
              <tr>
                <th>Strategy Name</th>
                <th style="text-align: right;">Projected Min Cash</th>
                <th>Outcome Status</th>
                <th style="text-align: center;">Rank</th>
              </tr>
            </thead>
            <tbody>
              ${counterfactuals.map(cf => `
                <tr>
                  <td><strong>${cf.title}</strong></td>
                  <td style="text-align: right;" class="${cf.minProjectedCash >= cashFloor ? 'positive' : 'negative'}">${formatINR(cf.minProjectedCash)}</td>
                  <td>
                    <span class="status-pill ${cf.statusColor === 'success' ? 'status-safe' : cf.statusColor === 'warning' ? 'status-warn' : 'status-dang'}">
                      ${cf.status}
                    </span>
                  </td>
                  <td style="text-align: center; font-weight: 700;">#${cf.rank}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="recommendation">
            <strong>SYSTEM RECOMMENDATION:</strong> Based on 500-scenario liquidity risk runs, the optimal strategy is <strong>${counterfactuals[0]?.title}</strong>, which secures a minimum cash position of <strong>${formatINR(counterfactuals[0]?.minProjectedCash)}</strong> and mitigates immediate breach risk.
          </div>
        </div>
        ` : ''}

        <div class="footer">
          <p>CONFIDENTIAL BUSINESS REPORT • GENERATED BY FLOWSHIELD AI</p>
          <p style="margin-top: 4px; font-size: 10px; color: #d1d5db;">Powered by verified deterministic financial engine calculations.</p>
        </div>
      </div>
    </body>
    </html>`;

  // Create a new window with the HTML content
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Auto-print after a short delay
    setTimeout(() => {
      printWindow.print();
    }, 500);
  } else {
    // Fallback: download as HTML file
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FlowShield_Report_${new Date().toISOString().split('T')[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
