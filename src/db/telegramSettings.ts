import fs from 'fs';
import path from 'path';

/**
 * User-selectable Liquidity Alert settings (safe, non-secret metadata).
 * The Telegram access token is never stored here — it lives only in
 * process.env.WHATSAPP_ACCESS_TOKEN on the backend.
 */

const SETTINGS_FILE = path.join(process.cwd(), 'flowshield_telegram_settings.json');

export interface TelegramAlertSettings {
  /** Alert when projected cash falls below the safety floor. */
  floorBreachEnabled: boolean;
  /** Alert when breach probability crosses the configured threshold. */
  highRiskEnabled: boolean;
  /** Alert when a large payment is approaching while cash is insufficient. */
  paymentRiskEnabled: boolean;
  /** Periodic summarized liquidity briefing. */
  weeklyBriefingEnabled: boolean;
  /** Breach-probability threshold (percent) for HIGH RISK alerts. */
  riskThreshold: number; // 0-100
}

const DEFAULT_SETTINGS: TelegramAlertSettings = {
  floorBreachEnabled: true,
  highRiskEnabled: true,
  paymentRiskEnabled: true,
  weeklyBriefingEnabled: false,
  riskThreshold: 70,
};

export function getTelegramAlertSettings(): TelegramAlertSettings {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf-8');
      return { ...DEFAULT_SETTINGS };
    }
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      floorBreachEnabled: typeof parsed.floorBreachEnabled === 'boolean' ? parsed.floorBreachEnabled : DEFAULT_SETTINGS.floorBreachEnabled,
      highRiskEnabled: typeof parsed.highRiskEnabled === 'boolean' ? parsed.highRiskEnabled : DEFAULT_SETTINGS.highRiskEnabled,
      paymentRiskEnabled: typeof parsed.paymentRiskEnabled === 'boolean' ? parsed.paymentRiskEnabled : DEFAULT_SETTINGS.paymentRiskEnabled,
      weeklyBriefingEnabled: typeof parsed.weeklyBriefingEnabled === 'boolean' ? parsed.weeklyBriefingEnabled : DEFAULT_SETTINGS.weeklyBriefingEnabled,
      riskThreshold: typeof parsed.riskThreshold === 'number' ? Math.max(0, Math.min(100, parsed.riskThreshold)) : DEFAULT_SETTINGS.riskThreshold,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveTelegramAlertSettings(partial: Partial<TelegramAlertSettings>): TelegramAlertSettings {
  const current = getTelegramAlertSettings();
  const next: TelegramAlertSettings = {
    floorBreachEnabled: typeof partial.floorBreachEnabled === 'boolean' ? partial.floorBreachEnabled : current.floorBreachEnabled,
    highRiskEnabled: typeof partial.highRiskEnabled === 'boolean' ? partial.highRiskEnabled : current.highRiskEnabled,
    paymentRiskEnabled: typeof partial.paymentRiskEnabled === 'boolean' ? partial.paymentRiskEnabled : current.paymentRiskEnabled,
    weeklyBriefingEnabled: typeof partial.weeklyBriefingEnabled === 'boolean' ? partial.weeklyBriefingEnabled : current.weeklyBriefingEnabled,
    riskThreshold: typeof partial.riskThreshold === 'number' ? Math.max(0, Math.min(100, partial.riskThreshold)) : current.riskThreshold,
  };
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(next, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing Telegram alert settings:', e);
  }
  return next;
}
