import { useLang } from '@/i18n';

/** Numbers in the page's script: ১৮ in Bangla, 18 in English. */
export function useNum() {
  const lang = useLang();
  return (n: number) => n.toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US');
}
