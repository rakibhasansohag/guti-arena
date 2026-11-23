import { useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Dialog, Slider } from 'radix-ui';
import { Settings as Gear, Volume2, VolumeX, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';
import { Pebble } from '@/share/board-art';
import { HIT, SEGMENT } from './game-header.tsx';
import { setSettings, useSettings, type Settings } from './settings.ts';
import { play, type Sound } from './sound.ts';
import { useNum } from './use-num.ts';

type Channel = 'master' | 'effects';
/** What each slider plays when you let go of it. */
const SAMPLE: Record<Channel, Sound> = {
  master: 'capture',
  effects: 'move',
};
const LONG_PRESS_MS = 550;

/**
 * The gear on every game page. A tap opens the settings; holding it mutes or unmutes at once.
 * On phones the panel rises from the bottom, on wider screens it slides in from the right.
 */
export function SettingsButton() {
  const t = useT('game');
  const s = useSettings();
  const [open, setOpen] = useState(false);
  const held = useRef<{ timer: ReturnType<typeof setTimeout>; fired: boolean } | null>(null);

  const press = () => {
    const h = {
      fired: false,
      timer: setTimeout(() => {
        h.fired = true;
        setSettings({ muted: !s.muted });
        navigator.vibrate?.(15);
      }, LONG_PRESS_MS),
    };
    held.current = h;
  };
  const release = () => held.current && clearTimeout(held.current.timer);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button
          variant="ghost"
          size="icon-lg"
          className={cn('rounded-full', HIT)}
          aria-label={t('settings.open')}
          title={t('settings.open')}
          onPointerDown={press}
          onPointerUp={release}
          onPointerLeave={release}
          onContextMenu={(e) => e.preventDefault()}
          onClick={(e) => {
            // A long press already muted: don't open the panel too.
            if (held.current?.fired) e.preventDefault();
            held.current = null;
          }}
        >
          <Gear className="size-5" />
          {s.muted && (
            <span className="absolute -right-0.5 -bottom-0.5 grid size-5 place-items-center rounded-full bg-clay-deep text-chalk shadow-clay">
              <VolumeX aria-hidden="true" className="size-3" />
            </span>
          )}
        </Button>
      </Dialog.Trigger>
      <AnimatePresence>{open && <Panel key="panel" settings={s} />}</AnimatePresence>
    </Dialog.Root>
  );
}

function Panel({ settings: s }: { settings: Settings }) {
  const t = useT('game');
  const num = useNum();
  // Decided once when the panel opens (client only): which edge it comes from.
  const [wide] = useState(() => matchMedia('(min-width: 40rem)').matches);
  const canVibrate = typeof navigator.vibrate === 'function';
  const from = wide ? { x: '100%' } : { y: '100%' };

  const row = (channel: Channel, icon: ReactNode, label: string, hint?: string) => (
    <li className="flex flex-col gap-1.5">
      <span className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-chalk shadow-clay">
          {icon}
        </span>
        <span className="flex-1 font-display text-base font-extrabold leading-tight">
          {label}
          {hint && <span className="block font-sans text-xs font-normal">{hint}</span>}
        </span>
        <span
          aria-hidden="true"
          className="min-w-10 text-right font-display text-lg font-extrabold tabular-nums"
        >
          {num(s[channel])}
        </span>
      </span>
      <ClaySlider
        label={label}
        value={s[channel]}
        disabled={s.muted}
        onChange={(v) => setSettings({ [channel]: v })}
        onCommit={() => {
          play(SAMPLE[channel]);
        }}
      />
    </li>
  );

  return (
    <Dialog.Portal forceMount>
      <Dialog.Overlay forceMount asChild>
        <motion.div
          className="fixed inset-0 z-40 bg-charcoal/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        />
      </Dialog.Overlay>
      <Dialog.Content forceMount asChild aria-describedby={undefined}>
        <motion.div
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col overflow-y-auto rounded-t-clay bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-card-foreground shadow-clay-lift outline-none',
            'sm:inset-y-0 sm:right-0 sm:left-auto sm:max-h-none sm:w-[26rem] sm:rounded-none sm:rounded-l-clay sm:p-6 3xl:w-[30rem]',
          )}
          initial={from}
          animate={{ x: 0, y: 0 }}
          exit={from}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* A grip, so the sheet reads as something that slides. */}
          <span
            aria-hidden="true"
            className="mx-auto -mt-2 mb-3 h-1.5 w-12 rounded-full bg-charcoal/20 sm:hidden"
          />
          <div className="flex items-center justify-between gap-3">
            <Dialog.Title className="font-display text-2xl font-extrabold">
              {t('settings.title')}
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button
                variant="ghost"
                size="icon-lg"
                className="rounded-full"
                aria-label={t('settings.close')}
                onClick={() => play('click')}
              >
                <X className="size-5" />
              </Button>
            </Dialog.Close>
          </div>
          <p className="mt-1 text-sm">{t('settings.lead')}</p>

          <h3 className="mt-5 font-display text-lg font-extrabold">{t('settings.sound')}</h3>
          <Toggle
            className="mt-2"
            label={t('settings.mute')}
            checked={s.muted}
            onChange={(muted) => {
              setSettings({ muted });
              if (!muted) play('click');
            }}
          />
          <ul className={cn('mt-4 flex flex-col gap-4', s.muted && 'opacity-50')}>
            {row('master', <Volume2 aria-hidden="true" className="size-5" />, t('settings.master'))}
            {row(
              'effects',
              <svg viewBox="-0.45 -0.45 0.9 0.9" aria-hidden="true" className="size-6">
                <Pebble seat={0} />
              </svg>,
              t('settings.effects'),
            )}
          </ul>

          <h3 className="mt-6 font-display text-lg font-extrabold">{t('settings.feel')}</h3>
          <div className="mt-2 flex flex-col gap-2">
            <Toggle
              label={t('settings.bubbles')}
              checked={s.reactionBubbles}
              onChange={(reactionBubbles) => {
                setSettings({ reactionBubbles });
                play('click');
              }}
            />
            {canVibrate && (
              <Toggle
                label={t('settings.vibration')}
                checked={s.vibration}
                onChange={(vibration) => {
                  setSettings({ vibration });
                  if (vibration) navigator.vibrate?.(30);
                  play('click');
                }}
              />
            )}
          </div>
          <p id="motion-label" className="mt-4 font-display font-extrabold">
            {t('settings.motion')}
          </p>
          <div
            role="group"
            aria-labelledby="motion-label"
            className="mt-2 flex gap-1 rounded-full bg-chalk/70 p-1"
          >
            {(['system', 'on', 'off'] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={s.reduceMotion === m}
                onClick={() => {
                  setSettings({ reduceMotion: m });
                  play('click');
                }}
                className={SEGMENT}
              >
                {t(`settings.motion.${m}`)}
              </button>
            ))}
          </div>
        </motion.div>
      </Dialog.Content>
    </Dialog.Portal>
  );
}

/** A chunky clay track with a pebble for a thumb. */
function ClaySlider({
  label,
  value,
  disabled,
  onChange,
  onCommit,
}: {
  label: string;
  value: number;
  disabled: boolean;
  onChange: (v: number) => void;
  onCommit: () => void;
}) {
  return (
    <Slider.Root
      className="relative flex h-11 w-full touch-none select-none items-center data-disabled:pointer-events-none"
      value={[value]}
      max={100}
      step={1}
      disabled={disabled}
      onValueChange={([v]) => v !== undefined && onChange(v)}
      onValueCommit={onCommit}
    >
      <Slider.Track className="relative h-3.5 grow overflow-hidden rounded-full bg-charcoal/15 shadow-[inset_0_2px_3px_rgb(43_38_34/.3)]">
        <Slider.Range className="absolute h-full rounded-full bg-clay" />
      </Slider.Track>
      <Slider.Thumb
        aria-label={label}
        className="block size-8 rounded-full border-[3px] border-charcoal bg-chalk shadow-clay transition-[scale,box-shadow] duration-200 ease-clay hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay active:scale-95"
      />
    </Slider.Root>
  );
}

/** An on/off pill with a pebble knob, for one setting. */
function Toggle({
  label,
  checked,
  onChange,
  className,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'flex min-h-12 w-full items-center gap-3 rounded-2xl bg-chalk/70 px-3 py-2 text-left font-display font-extrabold transition-colors duration-200 hover:bg-clay/20',
        className,
      )}
    >
      <span className="flex-1 leading-tight">{label}</span>
      <span
        aria-hidden="true"
        className={cn(
          'relative h-8 w-14 shrink-0 rounded-full shadow-[inset_0_2px_3px_rgb(43_38_34/.3)] transition-colors duration-200',
          checked ? 'bg-clay' : 'bg-charcoal/20',
        )}
      >
        <span
          className={cn(
            'absolute top-1 left-1 size-6 rounded-full border-2 border-charcoal bg-chalk shadow-clay transition-transform duration-300 ease-clay',
            checked && 'translate-x-6',
          )}
        />
      </span>
    </button>
  );
}
