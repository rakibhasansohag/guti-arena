import { getLang } from '@/i18n';

export interface InviteResult {
  /** How the link went out: the system share sheet, the clipboard, or neither. */
  method: 'shared' | 'copied' | 'none';
  url: string;
  whatsapp: string;
  /** Opens Messenger on phones; desktop browsers ignore it. */
  messenger: string;
}

/**
 * Share a room link. Uses the Web Share API when available, otherwise copies the link.
 * Always returns WhatsApp and Messenger links so the caller can show them as fallbacks.
 */
export async function shareInvite(code: string): Promise<InviteResult> {
  const url = `${location.origin}/r/${code}`;
  const text =
    getLang() === 'bn'
      ? `গুটি অ্যারেনায় আমার সঙ্গে খেলো। রুম কোড ${code}`
      : `Play Guti Arena with me. Room code ${code}`;
  const links = {
    url,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
    messenger: `fb-messenger://share/?link=${encodeURIComponent(url)}`,
  };

  if (navigator.share) {
    try {
      await navigator.share({ title: 'Guti Arena', text, url });
      return { method: 'shared', ...links };
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return { method: 'none', ...links };
      // Share refused for another reason: fall through to copying.
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return { method: 'copied', ...links };
  } catch {
    return { method: 'none', ...links };
  }
}
