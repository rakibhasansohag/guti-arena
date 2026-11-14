// Runs the engine's AI off the main thread so the board never freezes.
import { chooseMove, type AiLevel, type GameState } from '@guti-arena/engine';

export interface AiRequest {
  id: number;
  state: GameState;
  level: AiLevel;
}

self.onmessage = (e: MessageEvent<AiRequest>) => {
  const { id, state, level } = e.data;
  self.postMessage({ id, choice: chooseMove(state, level) });
};
