// COMMERCIA Core Formatting, Currency & Localized Helpers
// Resolves hardcoded currency, Excel CSV UTF-8 encoding, and phone localization

export function formatCurrency(amount: number | undefined | null, currency: string = 'FCFA'): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return `0 ${currency}`;
  }

  const rounded = Math.round(amount * 100) / 100;

  if (currency === 'EUR' || currency === '€') {
    return `${rounded.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`;
  }

  if (currency === 'USD' || currency === '$') {
    return `$${rounded.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }

  // Franc CFA (XAF / XOF) or other African currencies (GNF, CDF, etc.)
  return `${Math.round(rounded).toLocaleString('fr-FR')} ${currency}`;
}

export function formatNumber(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '0';
  return Math.round(amount).toLocaleString('fr-FR');
}

/**
 * Downloads a CSV string or structured (headers, rows) with a UTF-8 BOM (\uFEFF)
 * Ensures Microsoft Excel on Windows renders all French accents (é, è, à, etc.) perfectly.
 */
export function downloadCSVWithBOM(
  filename: string,
  contentOrHeaders: string | (string | number)[],
  rows?: (string | number)[][]
): void {
  let content = '';
  if (Array.isArray(contentOrHeaders)) {
    const headerLine = contentOrHeaders.map(h => `"${String(h).replace(/"/g, '""')}"`).join(';');
    const rowLines = (rows || []).map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';'));
    content = [headerLine, ...rowLines].join('\r\n');
  } else {
    content = contentOrHeaders;
  }
  const bom = '\uFEFF';
  const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Localized date formatter respecting the user's browser timezone
 */
export function formatLocalDate(dateInput: string | Date | number): string {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return String(dateInput);
  }
}

export function formatLocalDateTime(dateInput: string | Date | number): string {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(dateInput);
  }
}

/**
 * Multi-country WhatsApp assistance routing
 */
export function getSupportWhatsAppNumber(countryCodeOrCurrency?: string): string {
  const norm = (countryCodeOrCurrency || '').toUpperCase();
  if (norm.includes('CI') || norm.includes('225') || norm === 'XOF') {
    return '2250700000000'; // Côte d'Ivoire
  }
  if (norm.includes('SN') || norm.includes('221')) {
    return '221770000000'; // Sénégal
  }
  // Default support desk
  return '237690000000';
}
