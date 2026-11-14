import type { AiLevel, GameState, Move } from '@guti-arena/engine';
import type { AiRequest } from './ai-worker.ts';

type Choice = Move | 'end-chain';

let worker: Worker | null = null;
let nextId = 0;
const waiting = new Map<number, (c: Choice) => void>();

/** Ask the AI worker for a move. Created on first use, shared by every game on the page. */
export function askAi(state: GameState, level: AiLevel): Promise<Choice> {
  if (!worker) {
    worker = new Worker(new URL('./ai-worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<{ id: number; choice: Choice }>) => {
      waiting.get(e.data.id)?.(e.data.choice);
      waiting.delete(e.data.id);
    };
  }
  const id = nextId++;
  return new Promise((resolve) => {
    waiting.set(id, resolve);
    worker!.postMessage({ id, state, level } satisfies AiRequest);
  });
}
