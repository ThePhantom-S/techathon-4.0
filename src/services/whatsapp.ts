import { formatINR } from '../engine/calculator';

/**
 * FlowShield WhatsApp Liquidity Alert & Briefing service.
 *
 * Security rules enforced here:
 *  - The WhatsApp access token is read ONLY from process.env.WHATSAPP_ACCESS_TOKEN
 *    on the backend. It is never logged, stored, persisted, or returned by any API.
 *  - WhatsApp is a pure notification channel. FlowShield never initiates
 *    payments or transactions through WhatsApp.
 *  - All financial numbers are supplied by the caller (the FlowShield
 *    deterministic financial/forecast engine). This service never computes
 *    or invents financial figures.
 */

const DEFAULT_API_VERSION = 'v21.0';
const REQUEST_TIMEOUT_MS = 15000;

export class WhatsAppError extends Error {
  readonly statusCode: number;
  constructor(message: string, statusCode = 502) {
    super(message);
    this.name = 'WhatsAppError';
    this.statusCode = statusCode;
  }
}

// ── Configuration (server-side only) ───────────────────────────────────────
export interface WhatsAppConfig {
  enabled: boolean;
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string;
  apiVersion: string;
  recipientPhone: string;
}

export function loadWhatsAppConfig(): WhatsAppConfig {
  const token = (process.env.WHATSAPP_ACCESS_TOKEN || '').trim();
  const apiVersion = (process.env.WHATSAPP_API_VERSION || '').trim();
  return {
    enabled: (process.env.WHATSAPP_ENABLED || 'true').trim().toLowerCase() === 'true',
    accessToken: token,
    phoneNumberId: (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim(),
    businessAccountId: (process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '').trim(),
    apiVersion: apiVersion.startsWith('v') ? apiVersion : DEFAULT_API_VERSION,
    recipientPhone: (process.env.WHATSAPP_RECIPIENT_PHONE || '').trim(),
  };
}

/** Safe config status — never includes the token or headers. */
export function getWhatsAppStatus(): {
  enabled: boolean;
  configured: boolean;
  recipientConfigured: boolean;
} {
  const cfg = loadWhatsAppConfig();
  return {
    enabled: cfg.enabled,
    configured: !!(cfg.enabled && cfg.accessToken && cfg.phoneNumberId),
    recipientConfigured: !!(cfg.enabled && cfg.accessToken && cfg.phoneNumberId && cfg.recipientPhone),
  };
}

// ── Core Meta WhatsApp Cloud API caller ─────────────────────────────────────
interface SendResult {
  messageId: string | null;
}

async function postToWhatsAppApi(bodyText: string, recipient: string): Promise<SendResult> {
  const cfg = loadWhatsAppConfig();

  if (!cfg.enabled) {
    throw new WhatsAppError('WhatsApp integration is not enabled.', 503);
  }
  if (!cfg.accessToken || !cfg.phoneNumberId) {
    throw new WhatsAppError('WhatsApp integration is not configured.', 503);
  }
  if (!recipient) {
    throw new WhatsAppError('WhatsApp recipient is not configured.', 400);
  }

  const url = `https://graph.facebook.com/${cfg.apiVersion}/${cfg.phoneNumberId}/messages`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: recipient,
        type: 'text',
        text: { preview_url: false, body: bodyText },
      }),
      signal: controller.signal,
    });

    const data: any = await res.json().catch(() => ({}));

    if (!res.ok) {
      // Log diagnostic details only — the token is never included.
      const code = data?.error?.code;
      const subcode = data?.error?.error_subcode;
      console.error(
        `WhatsApp API request failed (status ${res.status}, code ${code ?? 'unknown'}, subcode ${subcode ?? 'unknown'})`
      );
      throw new WhatsAppError('WhatsApp API request failed.', 502);
    }

    return { messageId: data?.messages?.[0]?.id || null };
  } catch (err: any) {
    if (err instanceof WhatsAppError) throw err;
    if (err?.name === 'AbortError') {
      throw new WhatsAppError('WhatsApp API request timed out.', 504);
    }
    console.error('WhatsApp API network error (details suppressed for security):', err?.name || 'unknown');
    throw new WhatsAppError('WhatsApp API request failed.', 502);
  } finally {
    clearTimeout(timer);
  }
}

// ── Clean text/numbers helpers ──────────────────────────────────────────────
function formatDateSafe(isoDate?: string | null): string {
  if (!isoDate) return 'N/A';
  const d = new Date(`${isoDate.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function pct(probability?: number): string {
  if (probability === undefined || probability === null || Number.isNaN(probability)) return 'N/A';
  return `${Math.round(Math.max(0, Math.min(1, probability)) * 100)}%`;
}

function riskLevelFor(probability?: number, hasBreach?: boolean): string {
  if (hasBreach) return 'CRITICAL';
  if (probability === undefined || probability === null) return 'LOW';
  if (probability >= 0.6) return 'HIGH';
  if (probability >= 0.25) return 'MEDIUM';
  return 'LOW';
}

// ── Message payloads ────────────────────────────────────────────────────────
export interface LiquidityBriefPayload {
  businessName?: string;
  currentCash?: number;
  safetyFloor?: number;
  /** Expected cash at 30 days (engine horizon snapshot). */
  forecast30Day?: number;
  /** Deterministic minimum projected cash across the 90-day horizon. */
  minProjectedCash90?: number;
  /** Breach probability 0-1 from the Monte Carlo engine. */
  breachProbability?: number;
  /** Earliest projected floor-breach date (ISO yyyy-mm-dd) or null. */
  expectedBreachDate?: string | null;
  /** Top 3 liquidity drivers (label + optional amount). */
  topDrivers?: { label: string; amount?: number }[];
  /** Recommended action from the Decision Impact Analysis (best counterfactual). */
  recommendation?: string;
  /** Simulated impact of the recommended action, computed by the engine. */
  simulated?: {
    label?: string;
    minCash?: number;
    breachProbability?: number;
  } | null;
  /** For escalation messages: previous forecast probability (0-1). */
  previousBreachProbability?: number;
}

// ── Message builders ────────────────────────────────────────────────────────
function buildLiquidityAlertText(p: LiquidityBriefPayload): string {
  const lines: string[] = [];
  lines.push('FlowShield Liquidity Alert');
  lines.push('');
  lines.push(`Business: ${p.businessName || 'Business Entity'}`);
  lines.push('');
  lines.push('CURRENT POSITION');
  lines.push(`Cash: ${p.currentCash !== undefined ? formatINR(p.currentCash) : 'N/A'}`);
  lines.push(`Safety Floor: ${p.safetyFloor !== undefined ? formatINR(p.safetyFloor) : 'N/A'}`);
  lines.push('');
  lines.push('FORECAST');
  lines.push(`30-Day Cash: ${p.forecast30Day !== undefined ? formatINR(p.forecast30Day) : 'N/A'}`);
  lines.push(`90-Day Minimum Cash: ${p.minProjectedCash90 !== undefined ? formatINR(p.minProjectedCash90) : 'N/A'}`);
  lines.push('');
  lines.push('LIQUIDITY RISK');
  lines.push(`Breach Probability: ${pct(p.breachProbability)}`);
  lines.push(`Expected Breach: ${p.expectedBreachDate ? formatDateSafe(p.expectedBreachDate) : 'No breach projected'}`);
  lines.push('');
  lines.push('TOP DRIVERS');
  if (p.topDrivers && p.topDrivers.length > 0) {
    p.topDrivers.slice(0, 3).forEach((d) => {
      lines.push(`• ${d.label}${d.amount !== undefined ? `: ${formatINR(d.amount)}` : ''}`);
    });
  } else {
    lines.push('• Data not available');
  }
  if (p.recommendation) {
    lines.push('');
    lines.push('RECOMMENDED ACTION');
    lines.push(p.recommendation);
  }
  if (p.simulated) {
    lines.push('');
    lines.push('SIMULATED RESULT');
    if (p.simulated.label) lines.push(p.simulated.label);
    if (p.simulated.minCash !== undefined) {
      lines.push(`Projected Minimum Cash: ${formatINR(p.simulated.minCash)}`);
    }
    if (p.simulated.breachProbability !== undefined) {
      lines.push(`Breach Risk: ${pct(p.breachProbability)} → ${pct(p.simulated.breachProbability)}`);
    }
  }
  lines.push('');
  lines.push('— FlowShield');
  return lines.join('\n');
}

function buildEscalationText(p: LiquidityBriefPayload): string {
  const risk = riskLevelFor(p.breachProbability, !!p.expectedBreachDate && p.minProjectedCash90 !== undefined && (p.safetyFloor !== undefined && (p.minProjectedCash90 ?? 0) < p.safetyFloor));
  const lines: string[] = [];
  lines.push('FlowShield Risk Escalation');
  lines.push('');
  lines.push(`Business: ${p.businessName || 'Business Entity'}`);
  lines.push(`Risk Level: ${risk}`);
  lines.push(`Breach Probability: ${pct(p.breachProbability)}`);
  if (p.previousBreachProbability !== undefined) {
    lines.push(`Previous Forecast: ${pct(p.previousBreachProbability)} (Δ ${pct(Math.abs((p.breachProbability || 0) - p.previousBreachProbability))})`);
  }
  lines.push(`Expected Breach: ${p.expectedBreachDate ? formatDateSafe(p.expectedBreachDate) : 'No breach projected'}`);
  if (p.recommendation) {
    lines.push('');
    lines.push('RECOMMENDED ACTION');
    lines.push(p.recommendation);
  }
  lines.push('');
  lines.push('— FlowShield');
  return lines.join('\n');
}

function buildWeeklyBriefingText(p: LiquidityBriefPayload): string {
  const lines: string[] = [];
  lines.push('FlowShield Weekly Liquidity Briefing');
  lines.push('');
  lines.push(`Business: ${p.businessName || 'Business Entity'}`);
  lines.push(`Cash: ${p.currentCash !== undefined ? formatINR(p.currentCash) : 'N/A'}  |  Safety Floor: ${p.safetyFloor !== undefined ? formatINR(p.safetyFloor) : 'N/A'}`);
  lines.push('');
  lines.push('OUTLOOK');
  lines.push(`30-Day Cash: ${p.forecast30Day !== undefined ? formatINR(p.forecast30Day) : 'N/A'}`);
  lines.push(`90-Day Minimum Cash: ${p.minProjectedCash90 !== undefined ? formatINR(p.minProjectedCash90) : 'N/A'}`);
  lines.push(`Breach Probability: ${pct(p.breachProbability)}`);
  if (p.expectedBreachDate) lines.push(`Expected Breach: ${formatDateSafe(p.expectedBreachDate)}`);
  if (p.recommendation) {
    lines.push('');
    lines.push('RECOMMENDED ACTION');
    lines.push(p.recommendation);
  }
  lines.push('');
  lines.push('— FlowShield');
  return lines.join('\n');
}

function buildFinancialReportText(p: LiquidityBriefPayload): string {
  const lines: string[] = [];
  lines.push('FlowShield Financial Report');
  lines.push('');
  lines.push(`Business: ${p.businessName || 'Business Entity'}`);
  lines.push('');
  lines.push('POSITION');
  lines.push(`Cash: ${p.currentCash !== undefined ? formatINR(p.currentCash) : 'N/A'}`);
  lines.push(`Safety Floor: ${p.safetyFloor !== undefined ? formatINR(p.safetyFloor) : 'N/A'}`);
  lines.push('');
  lines.push('FORECAST');
  lines.push(`30-Day Cash: ${p.forecast30Day !== undefined ? formatINR(p.forecast30Day) : 'N/A'}`);
  lines.push(`90-Day Minimum Cash: ${p.minProjectedCash90 !== undefined ? formatINR(p.minProjectedCash90) : 'N/A'}`);
  lines.push(`Breach Probability: ${pct(p.breachProbability)}`);
  lines.push('');
  lines.push('TOP DRIVERS');
  if (p.topDrivers && p.topDrivers.length > 0) {
    p.topDrivers.slice(0, 3).forEach((d) => lines.push(`• ${d.label}${d.amount !== undefined ? `: ${formatINR(d.amount)}` : ''}`));
  } else {
    lines.push('• Data not available');
  }
  if (p.recommendation) {
    lines.push('');
    lines.push('RECOMMENDED ACTION');
    lines.push(p.recommendation);
  }
  lines.push('');
  lines.push('— FlowShield');
  return lines.join('\n');
}

// ── Public API (clean abstraction over the Meta API) ────────────────────────

/** Send an arbitrary text message to the configured recipient. */
export async function sendWhatsAppMessage(text: string, recipient?: string): Promise<SendResult> {
  const cfg = loadWhatsAppConfig();
  return postToWhatsAppApi(text, recipient || cfg.recipientPhone);
}

/** Simple connectivity test message. */
export async function sendTestMessage(recipient?: string): Promise<SendResult> {
  return sendWhatsAppMessage('FlowShield\n\nWhatsApp integration is working.', recipient);
}

/** Current verified liquidity alert with forecast, risk, drivers and action. */
export async function sendLiquidityAlert(payload: LiquidityBriefPayload, recipient?: string): Promise<SendResult> {
  return sendWhatsAppMessage(buildLiquidityAlertText(payload), recipient);
}

/** Summarized weekly liquidity briefing. */
export async function sendWeeklyBriefing(payload: LiquidityBriefPayload, recipient?: string): Promise<SendResult> {
  return sendWhatsAppMessage(buildWeeklyBriefingText(payload), recipient);
}

/** Escalation alert fired when risk rises materially vs the previous forecast. */
export async function sendRiskEscalation(payload: LiquidityBriefPayload, recipient?: string): Promise<SendResult> {
  return sendWhatsAppMessage(buildEscalationText(payload), recipient);
}

/** Full financial report of the current verified position. */
export async function sendFinancialReport(payload: LiquidityBriefPayload, recipient?: string): Promise<SendResult> {
  return sendWhatsAppMessage(buildFinancialReportText(payload), recipient);
}
