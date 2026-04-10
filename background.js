function cleanUrl(input) {
  try {
    let current = input;

    for (let depth = 0; depth < 3; depth++) {
      const probe = new URL(current);
      const nested =
        probe.searchParams.get('share_url') ||
        probe.searchParams.get('u') ||
        probe.searchParams.get('url');

      if (nested && /^https?:/i.test(decodeURIComponent(nested))) {
        current = decodeURIComponent(nested);
        continue;
      }
      break;
    }

    const url = new URL(current);
    url.protocol = 'https:';
    url.hostname = url.hostname
      .replace(/^www\./i, '')
      .replace(/^m\./i, '')
      .toLowerCase();

    const keepByHost = [
      { pattern: /(^|\.)youtube\.com$/i, keep: new Set(['v', 'list']) },
      { pattern: /(^|\.)youtu\.be$/i, keep: new Set() },
      { pattern: /(^|\.)google\.com$/i, keep: new Set(['q']) },
      { pattern: /(^|\.)maps\.google\.com$/i, keep: new Set(['q']) },
      { pattern: /(^|\.)amazon\.com$/i, keep: new Set(['k']) }
    ];

    let keepParams = new Set();
    for (const rule of keepByHost) {
      if (rule.pattern.test(url.hostname)) {
        keepParams = rule.keep;
        break;
      }
    }

    for (const key of [...url.searchParams.keys()]) {
      if (!keepParams.has(key)) {
        url.searchParams.delete(key);
      }
    }

    url.hash = '';
    url.pathname = url.pathname.replace(/\/+$/, '') || '/';

    if (/amazon\.com$/i.test(url.hostname)) {
      const dpMatch = url.pathname.match(/\/dp\/([A-Z0-9]{10})/i);
      if (dpMatch) {
        url.pathname = `/dp/${dpMatch[1]}`;
      }
    }

    return url.toString().replace(/\/$/, '');
  } catch {
    return input;
  }
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.url) return;

  const cleaned = cleanUrl(tab.url);
  const copied = await copyToClipboard(cleaned);

  if (!copied) {
    await chrome.tabs.create({
      url:
        'data:text/html;charset=utf-8,' +
        encodeURIComponent(`
          <!doctype html>
          <html>
          <body style="font-family:system-ui;padding:24px;">
            <h2>Copy this cleaned URL</h2>
            <textarea style="width:100%;height:120px;">${cleaned}</textarea>
          </body>
          </html>
        `)
    });
  }
});