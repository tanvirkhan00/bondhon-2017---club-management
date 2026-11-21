/**
 * Utility to export tabular data to CSV with UTF-8 BOM.
 * UTF-8 BOM (\uFEFF) ensures Bengali characters and currency symbols (৳)
 * open correctly in Microsoft Excel, Apple Numbers, and Google Sheets.
 */

export function downloadCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const escapeCsv = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headerLine = headers.map(escapeCsv).join(',');
  const rowLines = rows.map(row => row.map(escapeCsv).join(',')).join('\r\n');
  const csvContent = `\uFEFF${headerLine}\r\n${rowLines}`;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
