export function exportToCsv(dataArray, filename = 'export.csv') {
  if (!dataArray || !dataArray.length) return;

  // Extract all keys dynamically from the first object
  const headerKeys = Object.keys(dataArray[0]);
  const csvHeaders = headerKeys.join(',');

  const csvRows = dataArray.map(obj => {
    return headerKeys.map(key => {
      let val = obj[key] === null || obj[key] === undefined ? '' : obj[key].toString();
      // Handle commas or quotes inside strings to escape properly
      if (val.includes(',') || val.includes('"') || val.includes('\\n')) {
        val = `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(',');
  });

  const csvContent = [csvHeaders, ...csvRows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  // DOM Anchor download
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
