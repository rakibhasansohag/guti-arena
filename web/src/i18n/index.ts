import { useSyncExternalStore } from 'react';
import gameBn from './game.bn.ts';
import gameEn from './game.en.ts';
import landingBn from './landing.bn.ts';
import landingEn from './landing.en.ts';
import roomBn from './room.bn.ts';
import roomEn from './room.en.ts';

export type Lang = 'bn' | 'en';
export type Dict = Record<string, string>;

const dictionaries = {
  landing: { bn: landingBn, en: landingEn },
  game: { bn: gameBn, en: gameEn },
  room: { bn: roomBn, en: roomEn },
} satisfies Record<string, Record<Lang, Dict>>;

export type Namespace = keyof typeof dictionaries;

const KEY = 'lang';
const listeners = new Set<() => void>();

const inBrowser = typeof document !== 'undefined';

/** A `?lang=bn|en` link wins and is remembered; otherwise the stored choice; default Bangla. */
function readLang(): Lang {
  if (!inBrowser) return 'bn'; // build-time prerender
  const fromUrl = new URLSearchParams(location.search).get('lang');
  if (fromUrl === 'bn' || fromUrl === 'en') {
    store(fromUrl);
    return fromUrl;
  }
  try {
    return localStorage.getItem(KEY) === 'en' ? 'en' : 'bn';
  } catch {
    return 'bn';
  }
}

function store(lang: Lang): void {
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    // private mode or blocked storage: the choice lasts for this page only
  }
}

let current: Lang = readLang();
if (inBrowser) document.documentElement.lang = current;

export const getLang = (): Lang => current;

export function setLang(lang: Lang): void {
  current = lang;
  document.documentElement.lang = lang;
  store(lang);
  for (const l of listeners) l();
}

export function useLang(): Lang {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => 'bn', // prerendered HTML is Bangla
  );
}

/** `t('key', { name: 'Rakib' })` fills `{name}` in the string. Falls back to English, then the key. */
export function useT(namespace: Namespace) {
  const lang = useLang();
  const dict: Dict = dictionaries[namespace][lang];
  const fallback: Dict = dictionaries[namespace].en;
  return (key: string, vars?: Record<string, string | number>): string => {
    const text = dict[key] ?? fallback[key] ?? key;
    return vars ? text.replace(/\{(\w+)\}/g, (m, k: string) => String(vars[k] ?? m)) : text;
  };
}
