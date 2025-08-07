// 画面下に短時間だけ出る通知。alertと違い操作を止めず、スクリーンリーダーにも読ませる。
let host: HTMLElement | null = null;

function ensureHost(): HTMLElement {
  if (host && host.isConnected) return host;
  host = document.createElement('div');
  host.className = 'toast-host';
  host.setAttribute('aria-live', 'polite');
  document.body.appendChild(host);
  return host;
}

export function toast(message: string, kind: 'info' | 'error' = 'info'): void {
  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.textContent = message;
  ensureHost().appendChild(el);
  setTimeout(() => {
    el.classList.add('toast-out');
    el.addEventListener('animationend', () => el.remove(), { once: true });
    // アニメーションが走らない環境でも確実に消す
    setTimeout(() => el.remove(), 400);
  }, 2600);
}
