interface Turnstile {
  render(
    el: HTMLElement,
    opts: {
      sitekey: string;
      callback: (token: string) => void;
      'error-callback'?: () => void;
      'expired-callback'?: () => void;
      theme?: 'light' | 'dark' | 'auto';
      language?: string;
    },
  ): string;
  reset(id: string): void;
  remove(id: string): void;
}

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

/** The production widget only works on its own host; everywhere else Cloudflare's always-pass test key. */
export const SITE_KEY =
  typeof location !== 'undefined' && location.hostname === 'guti.rakibhasansohag.com'
    ? '0x4AAAAAAGApw2IfT6b1xnjZ'
    : '1x00000000000000000000AA';

let loading: Promise<Turnstile> | null = null;

/** Load the Turnstile script once, in explicit-render mode. */
export function loadTurnstile(): Promise<Turnstile> {
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = () =>
      window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile'));
    s.onerror = () => {
      loading = null;
      reject(new Error('turnstile'));
    };
    document.head.append(s);
  });
  return loading;
}
