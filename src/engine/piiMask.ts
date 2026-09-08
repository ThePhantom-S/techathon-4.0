/**
 * PII Masking Utility — FlowShield Data Privacy Layer
 *
 * Masks personally identifiable information such as company names,
 * customer names, GSTIN numbers, supplier identities, and invoice IDs
 * when PII protection mode is active.
 */

/** Mask a company or person name  — keeps first word initial, redacts the rest */
export function maskName(name: string, masked: boolean): string {
  if (!masked || !name) return name;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0][0] + '•'.repeat(Math.min(parts[0].length - 1, 4)) + ' [REDACTED]';
  }
  return parts[0][0] + '•'.repeat(3) + ' [REDACTED]';
}

/** Mask a GSTIN / tax number fully */
export function maskGstin(gstin: string, masked: boolean): string {
  if (!masked || !gstin) return gstin;
  return gstin.slice(0, 2) + '•'.repeat(gstin.length - 4) + gstin.slice(-2);
}

/** Mask an invoice or entity ID */
export function maskId(id: string, masked: boolean): string {
  if (!masked || !id) return id;
  return id.slice(0, 3) + '•'.repeat(Math.min(id.length - 3, 6));
}

/** Mask an email address */
export function maskEmail(email: string, masked: boolean): string {
  if (!masked || !email) return email;
  const [local, domain] = email.split('@');
  return local[0] + '•'.repeat(local.length - 1) + '@' + domain;
}

/** Mask a phone number keeping only last 2 digits */
export function maskPhone(phone: string, masked: boolean): string {
  if (!masked || !phone) return phone;
  return '•'.repeat(phone.length - 2) + phone.slice(-2);
}

/** Mask partial customer reference in a longer string e.g. "TechCorp Invoice #104" */
export function maskEntityInString(text: string, masked: boolean): string {
  if (!masked || !text) return text;
  // Replace known word sequences before markers like Invoice, PO, #, Ltd, Pvt, Corp, Enterprise
  return text.replace(/^([A-Z][A-Za-z0-9\s]{2,30?}?)(\s+(Invoice|PO|Order|#|Ltd|Pvt|Corp|Enterprise|Services|Industries))/i,
    (_full, entity, rest) => maskName(entity.trim(), true) + rest);
}

/** Badge label for the PII protection toggle */
export const PII_BADGE_LABEL = 'PII Protected';
export const PII_OFF_LABEL = 'PII Visible';
