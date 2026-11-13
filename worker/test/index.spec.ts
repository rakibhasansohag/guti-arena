import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

describe('worker scaffold', () => {
  it('answers /api/* with 501 until chat B implements it', async () => {
    const response = await SELF.fetch('https://example.com/api/rooms', { method: 'POST' });
    expect(response.status).toBe(501);
  });
});
