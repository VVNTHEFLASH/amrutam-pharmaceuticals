export function classifyAttachment(url: string | undefined): 'image' | 'pdf' | 'unsupported' {
  if (!url) return 'unsupported';
  const cleanUrl = url.split('?')[0]; // Remove query parameters for check
  const extension = cleanUrl.split('.').pop()?.toLowerCase();
  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(extension || '')) {
    return 'image';
  }
  if (extension === 'pdf') {
    return 'pdf';
  }
  return 'unsupported';
}
