/**
 * Unit conversion helpers for the U.S.-units UI.
 * Storage is metric (cm, kg). Display + input is imperial (ft/in, lbs).
 * Convert at the UI boundary only — never elsewhere.
 */

const CM_PER_INCH = 2.54;
const KG_PER_LB = 0.45359237;

export function cmToFtIn(cm: number | null | undefined): { ft: string; inch: string } {
  if (!cm || cm <= 0) return { ft: '', inch: '' };
  const totalInches = cm / CM_PER_INCH;
  const ft = Math.floor(totalInches / 12);
  const inch = Math.round(totalInches - ft * 12);
  if (inch === 12) return { ft: String(ft + 1), inch: '0' };
  return { ft: String(ft), inch: String(inch) };
}

export function ftInToCm(ft: number | string, inch: number | string): number | null {
  const f = typeof ft === 'string' ? Number.parseFloat(ft || '0') : ft;
  const i = typeof inch === 'string' ? Number.parseFloat(inch || '0') : inch;
  if (Number.isNaN(f) || Number.isNaN(i)) return null;
  const cm = (f * 12 + i) * CM_PER_INCH;
  return cm > 0 ? Number(cm.toFixed(1)) : null;
}

export function kgToLb(kg: number | null | undefined): string {
  if (!kg || kg <= 0) return '';
  const lb = kg / KG_PER_LB;
  return lb.toFixed(1).replace(/\.0$/, '');
}

export function lbToKg(lb: number | string): number | null {
  const lbs = typeof lb === 'string' ? Number.parseFloat(lb || '0') : lb;
  if (Number.isNaN(lbs)) return null;
  const kg = lbs * KG_PER_LB;
  return kg > 0 ? Number(kg.toFixed(2)) : null;
}
