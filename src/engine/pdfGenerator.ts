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
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; color: #1a1a1a; }
        .header { text-align: center; border-bottom: 3px solid #4F46E5; padding-bottom: 20px; margin-bottom: 30px; }
        .company-name { font-size: 28px; font-weight: bold; color: #4F46E5; }
        .gstin { font-size: 14px; color: #666; margin-top: 5px; }
        .report-title { font-size: 20px; margin-top: 15px; color: #333; }
        .date { font-size: 12px; color: #888; margin-top: 5px; }
        .section { margin-bottom: 25px; }
        .section-title { font-size: 16px; font-weight: bold; color: #4F46E5; border-bottom: 2px solid #E5E7EB; padding-bottom: 8px; margin-bottom: 15px; }
        .kpi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
        .kpi-card { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 15px; }
        .kpi-label { font-size: 12px; color: #666; margin-bottom: 5px; }
        .kpi-value { font-size: 24px; font-weight: bold; }
        .kpi-value.positive { color: #10B981; }
        .kpi-value.negative { color: #EF4444; }
        .kpi-value.warning { color: #F59E0B; }
        .risk-badge { display: inline-block; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        .risk-high { background: #FEE2E2; color: #DC2626; }
        .risk-low { background: #D1FAE5; color: #059669; }
        .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .table th { background: #4F46E5; color: white; padding: 10px; text-align: left; font-size: 12px; }
        .table td { padding: 10px; border-bottom: 1px solid #E5E7EB; font-size: 12px; }
        .recommendation { background: #EFF6FF; border-left: 4px solid #4F46E5; padding: 15px; margin-top: 15px; border-radius: 0 8px 8px 0; }
        .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E7EB; font-size: 11px; color: #888; }
        .status-safe { color: #10B981; }
        .status-warning { color: #F59E0B; }
        .status-danger { color: #EF4444; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-name">${companyName}</div>
        <div class="gstin">GSTIN: ${gstin}</div>
        <div class="report-title">Cash Flow Intelligence Report</div>
        <div class="date">Generated: ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>

      <div class="section">
        <div class="section-title">Executive Summary</div>
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Current Cash Position</div>
            <div class="kpi-value">${formatINR(currentCash)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Minimum Projected (90 Days)</div>
            <div class="kpi-value ${minProjectedCash < cashFloor ? 'negative' : 'positive'}">${formatINR(minProjectedCash)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Safety Floor</div>
            <div class="kpi-value">${formatINR(cashFloor)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Risk Status</div>
            <div class="kpi-value">
              <span class="risk-badge ${hasBreach ? 'risk-high' : 'risk-low'}">
                ${hasBreach ? 'HIGH RISK' : 'LOW RISK'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Risk Analysis</div>
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Breach Probability (500 Scenarios)</div>
            <div class="kpi-value ${breachProbability > 0.5 ? 'negative' : 'positive'}">${(breachProbability * 100).toFixed(0)}%</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Days Until Breach</div>
            <div class="kpi-value ${daysUntilBreach && daysUntilBreach < 30 ? 'warning' : 'positive'}">${daysUntilBreach ? `${daysUntilBreach} Days` : 'No Breach'}</div>
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
        <div class="section-title">Working Capital Metrics</div>
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Days Sales Outstanding (DSO)</div>
            <div class="kpi-value">${workingCapital.dso} Days</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Days Inventory Outstanding (DIO)</div>
            <div class="kpi-value">${workingCapital.dio} Days</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Days Payable Outstanding (DPO)</div>
            <div class="kpi-value">${workingCapital.dpo} Days</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Cash Conversion Cycle (CCC)</div>
            <div class="kpi-value ${workingCapital.ccc > 60 ? 'warning' : 'positive'}">${workingCapital.ccc} Days</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Top Cash Outflows</div>
        <table class="table">
          <thead>
            <tr>
              <th>Vendor/Supplier</th>
              <th>Amount</th>
              <th>Due Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${driverAnalysis.topOutflows.slice(0, 5).map(outflow => `
              <tr>
                <td>${outflow.entity}</td>
                <td class="negative">${formatINR(outflow.amount)}</td>
                <td>${outflow.date}</td>
                <td>${outflow.statusTag || 'DUE'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title">Top Cash Inflows</div>
        <table class="table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Amount</th>
              <th>Expected Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${driverAnalysis.topInflows.slice(0, 5).map(inflow => `
              <tr>
                <td>${inflow.entity}</td>
                <td class="positive">${formatINR(inflow.amount)}</td>
                <td>${inflow.date}</td>
                <td>${inflow.statusTag || 'PENDING'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      ${counterfactuals.length > 0 ? `
      <div class="section">
        <div class="section-title">Recommended Strategies</div>
        <table class="table">
          <thead>
            <tr>
              <th>Strategy</th>
              <th>Projected Min Cash</th>
              <th>Status</th>
              <th>Rank</th>
            </tr>
          </thead>
          <tbody>
            ${counterfactuals.map(cf => `
              <tr>
                <td>${cf.title}</td>
                <td class="${cf.minProjectedCash >= cashFloor ? 'positive' : 'negative'}">${formatINR(cf.minProjectedCash)}</td>
                <td class="${cf.statusColor === 'success' ? 'status-safe' : cf.statusColor === 'warning' ? 'status-warning' : 'status-danger'}">${cf.status}</td>
                <td>#${cf.rank}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="recommendation">
          <strong>AI Recommendation:</strong> Based on 500-scenario liquidity risk engine runs, the recommended strategy is <strong>${counterfactuals[0]?.title}</strong> which provides a minimum cash position of <strong>${formatINR(counterfactuals[0]?.minProjectedCash)}</strong>.
        </div>
      </div>
      ` : ''}

      <div class="section">
        <div class="section-title">Simulation Parameters</div>
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Supplier Delay Applied</div>
            <div class="kpi-value">${supplierDelayDays} Days</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Simulation Horizon</div>
            <div class="kpi-value">90 Days</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Liquidity Risk Engine Runs</div>
            <div class="kpi-value">500</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Engine Version</div>
            <div class="kpi-value">v2.0</div>
          </div>
        </div>
      </div>

      <div class="footer">
        <p>FlowShield - AI-Powered Cash Flow Intelligence Platform</p>
        <p>This report is generated from verified deterministic engine calculations.</p>
        <p>For questions, contact: support@flowshield.ai</p>
      </div>
    </body>
    </html>
  `;

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
