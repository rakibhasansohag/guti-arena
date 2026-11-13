import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { setLang, useLang } from '@/i18n';

const PIECES = ['bg-piece-blue', 'bg-piece-yellow', 'bg-piece-white', 'bg-piece-red'];

/** Placeholder shared by the wave-0 stub pages; owners replace their page and this goes away. */
export function StubPage({ title }: { title: string }) {
  const lang = useLang();
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 py-10 3xl:max-w-4xl 4xl:max-w-5xl">
      <nav className="flex flex-wrap gap-4 text-sm font-medium">
        <Link to="/">/</Link>
        <Link to="/how-to-play">/how-to-play</Link>
        <Link to="/play">/play</Link>
        <Link to="/r/BCDFG">/r/BCDFG</Link>
      </nav>
      <section className="rounded-clay bg-card p-6 shadow-clay">
        <h1 className="text-4xl font-extrabold">{title}</h1>
        <p className="mt-2 text-lg">ষোলো গুটি · Guti Arena</p>
        <div className="mt-4 flex gap-3">
          {PIECES.map((c) => (
            <span key={c} className={`size-8 rounded-full ring-2 ring-charcoal shadow-clay ${c}`} />
          ))}
        </div>
        <Button className="mt-6" onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}>
          {lang === 'bn' ? 'English' : 'বাংলা'}
        </Button>
      </section>
    </main>
  );
}
