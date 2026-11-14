const ID_KEY = 'playerId';
const NAME_KEY = 'name';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // blocked storage: the value lasts for this page only
  }
}

let memoryId: string | null = null;

/** A random id kept in localStorage; rejoining a room with it restores the seat. */
export function playerId(): string {
  const stored = read(ID_KEY);
  if (stored) return stored;
  memoryId ??= crypto.randomUUID();
  write(ID_KEY, memoryId);
  return memoryId;
}

export const savedName = (): string => read(NAME_KEY) ?? '';
export const saveName = (name: string): void => write(NAME_KEY, name);
