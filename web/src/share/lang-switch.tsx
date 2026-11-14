import { setLang, useLang } from '@/i18n';
import { cn } from '@/lib/utils';

/** Bangla / English toggle. Each label is written in its own language. */
export function LangSwitch({ className }: { className?: string }) {
  const lang = useLang();
  return (
    <div
      role="group"
      aria-label="ভাষা / Language"
      className={cn('inline-flex rounded-full bg-chalk/70 p-1 shadow-clay', className)}
    >
      {(['bn', 'en'] as const).map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={lang === l}
          onClick={() => setLang(l)}
          className="rounded-full px-3 py-1 text-sm font-display font-extrabold transition-[background-color,color,scale] duration-[200ms,200ms,300ms] ease-clay hover:bg-chalk active:scale-95 aria-pressed:bg-charcoal aria-pressed:text-chalk"
        >
          {l === 'bn' ? 'বাংলা' : 'English'}
        </button>
      ))}
    </div>
  );
}
