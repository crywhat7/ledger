/**
 * Hora Honduras = UTC-6 siempre, sin excepción.
 * No depende del timezone del navegador ni de APIs externas.
 * https://time.is/es/UTC-6
 */

const UTC_MINUS_6_HOURS_MS = 6 * 60 * 60 * 1000;

/**
 * Devuelve un Date cuya lectura en UTC corresponde a la hora en UTC-6.
 * Usar getUTC*() para obtener componentes (hora, día, etc.) en Honduras.
 */
export function getNowHonduras(): Date {
  return new Date(Date.now() - UTC_MINUS_6_HOURS_MS);
}

/**
 * Formato 24h para el reloj: "14:35:02" (siempre UTC-6).
 */
export function formatHondurasTime24(date: Date): string {
  const h = date.getUTCHours();
  const m = date.getUTCMinutes();
  const s = date.getUTCSeconds();
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Fecha en formato YYYY-MM-DD (UTC-6) para transaction_date, etc.
 */
export function getHondurasDateString(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
