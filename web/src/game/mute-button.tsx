import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n';
import { setMuted, useMuted } from './sound.ts';

export function MuteButton() {
  const t = useT('game');
  const muted = useMuted();
  return (
    <Button
      variant="ghost"
      size="icon-lg"
      className="rounded-full"
      aria-pressed={muted}
      aria-label={t(muted ? 'sound.on' : 'sound.off')}
      title={t(muted ? 'sound.on' : 'sound.off')}
      onClick={() => setMuted(!muted)}
    >
      {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
    </Button>
  );
}
