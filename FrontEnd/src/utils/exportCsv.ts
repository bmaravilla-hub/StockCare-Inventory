/**
 * Exporta arreglos tabulares a CSV compatible con Excel (BOM UTF-8).
 */
export function exportToCsv(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number>>
): void {
  const escapeCell = (value: string | number) => {
    const str = String(value ?? '');
    if (/[",\n\r;]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ].join('\r\n');

  const blob = new Blob(['\uFEFF' + csvContent], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

