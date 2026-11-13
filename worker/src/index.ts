import { DurableObject } from 'cloudflare:workers';

/** One instance per room. Chat B implements it with the WebSocket Hibernation API. */
export class Room extends DurableObject<Env> {}

export default {
  async fetch(request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      return Response.json({ error: 'not-implemented' }, { status: 501 });
    }
    // Static assets and SPA fallback are served before the Worker runs; anything else is unknown.
    return new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
