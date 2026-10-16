/**
 * Universal Clipboard Copy Helper
 * Works on localhost, HTTPS, and non-HTTPS LAN/Router IPs (e.g. http://192.168.x.x:3000)
 * Uses navigator.clipboard if available and secure, else falls back to document.execCommand('copy').
 */
export async function copyToClipboard(text) {
  const content = typeof text === 'string' ? text : JSON.stringify(text ?? '', null, 2);

  // 1. Try modern Clipboard API if supported and in secure context
  if (navigator?.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(content);
      return true;
    } catch (e) {
      // Fall through to fallback
    }
  }

  // 2. Cross-browser fallback using hidden textarea
  try {
    const textArea = document.createElement('textarea');
    textArea.value = content;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    textArea.style.opacity = '0';
    textArea.style.pointerEvents = 'none';
    document.body.appendChild(textArea);

    // iOS support
    if (navigator.userAgent.match(/ipad|ipod|iphone/i)) {
      const range = document.createRange();
      range.selectNodeContents(textArea);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
      textArea.setSelectionRange(0, 999999);
    } else {
      textArea.focus();
      textArea.select();
    }

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('copyToClipboard fallback failed:', err);
    return false;
  }
}
