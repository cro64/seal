/** Get first markdown heading (e.g. # Title) and return a safe filename base, or 'document'. */
export function getDownloadBasename(markdown) {
  const match = markdown.match(/^#{1,6}\s+(.+)$/m);
  const raw = match ? match[1].trim() : '';
  const safe = raw
    .replace(/[/\\:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
  return safe || 'document';
}

export function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
