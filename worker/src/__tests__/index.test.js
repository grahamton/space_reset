import { describe, it, expect, vi, beforeEach } from 'vitest';

const { parse, RateLimitError, AuthenticationError } = vi.hoisted(() => ({
  parse: vi.fn(),
  RateLimitError: class RateLimitError extends Error {},
  AuthenticationError: class AuthenticationError extends Error {}
}));

vi.mock('@anthropic-ai/sdk', () => {
  class Anthropic {
    constructor() {
      this.messages = { parse };
    }
  }
  Anthropic.AuthenticationError = AuthenticationError;
  Anthropic.RateLimitError = RateLimitError;
  Anthropic.BadRequestError = class BadRequestError extends Error {};
  return { default: Anthropic };
});

const { default: worker, MissionQuota } = await import('../index.js');

const quotaObjects = new Map();
const quota = {
  getByName(name) {
    if (!quotaObjects.has(name)) {
      const values = new Map();
      quotaObjects.set(name, new MissionQuota({ storage: { kv: {
        get: (key) => values.get(key),
        put: (key, value) => values.set(key, value)
      } } }, {}));
    }
    return quotaObjects.get(name);
  }
};
const ENV = {
  ANTHROPIC_API_KEY: 'test-key', ALLOWED_ORIGIN: 'https://example.com',
  MISSION_QUOTA: quota, DAILY_MISSION_CAP: '50'
};

const missionsRequest = (body = {}) =>
  new Request('https://worker.dev/api/missions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: 'AAAA',
      mimeType: 'image/jpeg',
      personaId: 'drillSergeant',
      roomType: 'kitchen',
      difficulty: 'hard',
      ...body
    })
  });

const okResponse = (missions, status = 'ok', note = 'Let’s get this done.') => ({
  stop_reason: 'end_turn',
  parsed_output: { status, note, missions }
});

const sampleMission = {
  title: 'Dish Dash',
  description: 'Move every dish to the sink.',
  time: 300,
  type: 'dishes',
  strategy: 'Do not wash. Just relocate.'
};

describe('mission worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    quotaObjects.clear();
  });

  describe('routing', () => {
    it('answers CORS preflight', async () => {
      const res = await worker.fetch(
        new Request('https://worker.dev/api/missions', { method: 'OPTIONS' }),
        ENV
      );

      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');
    });

    it('404s unknown paths', async () => {
      const res = await worker.fetch(new Request('https://worker.dev/nope'), ENV);
      expect(res.status).toBe(404);
    });

    it('405s non-POST on the missions route', async () => {
      const res = await worker.fetch(new Request('https://worker.dev/api/missions'), ENV);
      expect(res.status).toBe(405);
    });
  });

  describe('abuse guards', () => {
    const withOrigin = (origin) => {
      const req = missionsRequest();
      req.headers.set('Origin', origin);
      return req;
    };

    beforeEach(() => {
      parse.mockResolvedValue(okResponse([sampleMission]));
    });

    it('blocks browser calls from a page that is not allowed, before calling Claude', async () => {
      const res = await worker.fetch(withOrigin('https://evil.example'), ENV);

      expect(res.status).toBe(403);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');
      expect(parse).not.toHaveBeenCalled();
    });

    it('allows its own origin, localhost and listed origins', async () => {
      const env = { ...ENV, ALLOWED_ORIGIN: 'https://a.example, https://b.example' };
      for (const origin of [
        'https://worker.dev',
        'http://localhost:5173',
        'http://127.0.0.1:8787',
        'https://b.example'
      ]) {
        quotaObjects.clear();
        const res = await worker.fetch(withOrigin(origin), env);
        expect(res.status).toBe(200);
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe(origin);
      }
    });

    it('allows any origin when ALLOWED_ORIGIN is "*"', async () => {
      const res = await worker.fetch(withOrigin('https://anyone.example'), {
        ...ENV,
        ALLOWED_ORIGIN: '*'
      });
      expect(res.status).toBe(200);
    });

    it('rate-limits per client IP, before calling Claude', async () => {
      const limit = vi.fn().mockResolvedValue({ success: false });
      const req = missionsRequest();
      req.headers.set('CF-Connecting-IP', '203.0.113.7');

      const res = await worker.fetch(req, { ...ENV, MISSIONS_RATE_LIMIT: { limit } });

      expect(res.status).toBe(429);
      expect(limit).toHaveBeenCalledWith({ key: '203.0.113.7' });
      expect(parse).not.toHaveBeenCalled();
    });

    it('goes ahead when under the limit', async () => {
      const limit = vi.fn().mockResolvedValue({ success: true });
      const res = await worker.fetch(missionsRequest(), {
        ...ENV,
        MISSIONS_RATE_LIMIT: { limit }
      });

      expect(res.status).toBe(200);
      expect(parse).toHaveBeenCalledOnce();
    });

    it('admits exactly three analyses per IP in a rolling minute', async () => {
      const statuses = [];
      for (let index = 0; index < 22; index += 1) {
        const request = missionsRequest();
        request.headers.set('CF-Connecting-IP', '203.0.113.7');
        statuses.push((await worker.fetch(request, ENV)).status);
      }
      expect(statuses.slice(0, 3)).toEqual([200, 200, 200]);
      expect(statuses.slice(3)).toEqual(Array(19).fill(429));
      expect(parse).toHaveBeenCalledTimes(3);
    });

    it('caps total analyses across IPs for the UTC day', async () => {
      const env = { ...ENV, DAILY_MISSION_CAP: '2' };
      const statuses = [];
      for (const ip of ['203.0.113.7', '203.0.113.8', '203.0.113.9']) {
        const request = missionsRequest();
        request.headers.set('CF-Connecting-IP', ip);
        statuses.push((await worker.fetch(request, env)).status);
      }
      expect(statuses).toEqual([200, 200, 429]);
      expect(parse).toHaveBeenCalledTimes(2);
    });

    it('fails closed when the exact quota is missing or unavailable', async () => {
      const missing = await worker.fetch(missionsRequest(), { ...ENV, MISSION_QUOTA: undefined });
      const broken = await worker.fetch(missionsRequest(), {
        ...ENV,
        MISSION_QUOTA: { getByName() { throw new Error('unavailable'); } }
      });
      expect(missing.status).toBe(503);
      expect(broken.status).toBe(503);
      expect(parse).not.toHaveBeenCalled();
    });
  });

  describe('exact quota object', () => {
    it('uses a sliding minute rather than a fixed clock boundary', () => {
      const instance = quota.getByName('ip:example');
      expect(instance.consumeRecent(0, 3, 60000)).toBe(true);
      expect(instance.consumeRecent(10000, 3, 60000)).toBe(true);
      expect(instance.consumeRecent(20000, 3, 60000)).toBe(true);
      expect(instance.consumeRecent(30000, 3, 60000)).toBe(false);
      expect(instance.consumeRecent(60001, 3, 60000)).toBe(true);
    });

    it('resets the global count only when the UTC day changes', () => {
      const instance = quota.getByName('global');
      expect(instance.consumeDaily('2026-09-22', 2)).toBe(true);
      expect(instance.consumeDaily('2026-09-22', 2)).toBe(true);
      expect(instance.consumeDaily('2026-09-22', 2)).toBe(false);
      expect(instance.consumeDaily('2026-09-23', 2)).toBe(true);
    });
  });

  describe('request validation', () => {
    it('rejects a missing image', async () => {
      const res = await worker.fetch(missionsRequest({ image: '' }), ENV);

      expect(res.status).toBe(400);
      expect((await res.json()).error).toMatch(/no image/i);
      expect(parse).not.toHaveBeenCalled();
    });

    it('rejects an unsupported mime type', async () => {
      const res = await worker.fetch(missionsRequest({ mimeType: 'application/pdf' }), ENV);

      expect(res.status).toBe(400);
      expect(parse).not.toHaveBeenCalled();
    });

    it('rejects an oversized image', async () => {
      const res = await worker.fetch(missionsRequest({ image: 'A'.repeat(8 * 1024 * 1024) }), ENV);

      expect(res.status).toBe(413);
      expect(parse).not.toHaveBeenCalled();
    });
  });

  describe('mission generation', () => {
    it('returns missions with stable ids assigned server-side', async () => {
      parse.mockResolvedValue(okResponse([sampleMission, { ...sampleMission, type: 'trash' }]));

      const res = await worker.fetch(missionsRequest(), ENV);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.status).toBe('ok');
      expect(body.missions.map((m) => m.id)).toEqual(['m1', 'm2']);
      expect(body.missions[0].title).toBe('Dish Dash');
    });

    it("rounds times to 30 seconds and caps them at the difficulty's limit", async () => {
      parse.mockResolvedValue(
        okResponse([1000, 95, 10].map((time) => ({ ...sampleMission, time })))
      );

      const hard = await (await worker.fetch(missionsRequest(), ENV)).json();
      expect(hard.missions.map((m) => m.time)).toEqual([900, 90, 30]);

      const easy = await (await worker.fetch(missionsRequest({ difficulty: 'easy' }), ENV)).json();
      expect(easy.missions.map((m) => m.time)).toEqual([300, 90, 30]);
    });

    it('returns 200 for a retake with no missions, carrying the note through', async () => {
      const note = 'Too blurry to see the room. Try again from the doorway.';
      parse.mockResolvedValue(okResponse([], 'retake', note));

      const res = await worker.fetch(missionsRequest(), ENV);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.status).toBe('retake');
      expect(body.note).toBe(note);
      expect(body.missions).toEqual([]);
    });

    it('returns 200 for a tidy room with zero or a couple of small missions', async () => {
      parse.mockResolvedValue(okResponse([], 'tidy', 'Already looking good in here.'));

      const res = await worker.fetch(missionsRequest(), ENV);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.status).toBe('tidy');
      expect(body.missions).toEqual([]);
    });

    it('sends the persona as a system prompt and the photo as an image block', async () => {
      parse.mockResolvedValue(okResponse([sampleMission]));

      await worker.fetch(missionsRequest(), ENV);

      const params = parse.mock.calls[0][0];
      expect(params.model).toBe('claude-sonnet-5');
      expect(params.system).toMatch(/Drill Sergeant/i);

      const [imageBlock, textBlock] = params.messages[0].content;
      expect(imageBlock).toEqual({
        type: 'image',
        source: { type: 'base64', media_type: 'image/jpeg', data: 'AAAA' }
      });
      expect(textBlock.type).toBe('text');
    });

    it('folds room type and difficulty into the prompt', async () => {
      parse.mockResolvedValue(okResponse([sampleMission]));

      await worker.fetch(missionsRequest(), ENV);

      const prompt = parse.mock.calls[0][0].messages[0].content[1].text;
      expect(prompt).toMatch(/kitchen/i);
      expect(prompt).toMatch(/ambitious/i); // hard
      expect(prompt).toMatch(/Never exceed 900 seconds/); // hard -> 15 min cap
    });

    it('defaults an omitted mission count to auto, letting the photo decide', async () => {
      parse.mockResolvedValue(okResponse([sampleMission]));

      await worker.fetch(missionsRequest({ missionCount: undefined }), ENV);

      const prompt = parse.mock.calls[0][0].messages[0].content[1].text;
      expect(prompt).toMatch(/roughly 3 to 6/i);
    });

    it('passes a valid fixed mission count through to the prompt', async () => {
      parse.mockResolvedValue(okResponse([sampleMission]));

      await worker.fetch(missionsRequest({ missionCount: 2 }), ENV);

      const prompt = parse.mock.calls[0][0].messages[0].content[1].text;
      expect(prompt).toMatch(/up to 2 cleaning missions/i);
    });

    it('accepts a numeric string mission count', async () => {
      parse.mockResolvedValue(okResponse([sampleMission]));

      await worker.fetch(missionsRequest({ missionCount: '6' }), ENV);

      const prompt = parse.mock.calls[0][0].messages[0].content[1].text;
      expect(prompt).toMatch(/up to 6 cleaning missions/i);
    });

    it('falls back to auto for an out-of-range or malformed mission count', async () => {
      parse.mockResolvedValue(okResponse([sampleMission]));

      for (const bad of [0, 9, -1, 'banana', 2.5]) {
        parse.mockClear();
        quotaObjects.clear();
        await worker.fetch(missionsRequest({ missionCount: bad }), ENV);
        const prompt = parse.mock.calls[0][0].messages[0].content[1].text;
        expect(prompt).toMatch(/roughly 3 to 6/i);
      }
    });

    it('carries the shared guardrails in every persona system prompt', async () => {
      parse.mockResolvedValue(okResponse([sampleMission]));

      await worker.fetch(missionsRequest({ personaId: 'roastMaster' }), ENV);

      const { system, max_tokens } = parse.mock.calls[0][0];
      expect(system).toMatch(/Roast the mess, never the person/);
      expect(system).toMatch(/Never shame them for the mess existing/);
      // Bounded so a runaway generation fails fast instead of spinning for minutes.
      expect(max_tokens).toBeLessThanOrEqual(8000);
    });

    it('falls back to the default persona for an unknown id', async () => {
      parse.mockResolvedValue(okResponse([sampleMission]));

      await worker.fetch(missionsRequest({ personaId: 'nonexistent' }), ENV);

      expect(parse.mock.calls[0][0].system).toMatch(/ADHD-friendly/i);
    });
  });

  describe('failure handling', () => {
    it('maps a rate limit to 429', async () => {
      parse.mockRejectedValue(new RateLimitError('slow down'));

      const res = await worker.fetch(missionsRequest(), ENV);
      expect(res.status).toBe(429);
    });

    it('maps a rejected key to 502 without leaking the reason', async () => {
      parse.mockRejectedValue(new AuthenticationError('invalid x-api-key'));

      const res = await worker.fetch(missionsRequest(), ENV);
      const body = await res.json();

      expect(res.status).toBe(502);
      expect(body.error).not.toMatch(/x-api-key/);
    });

    it('maps a refusal to 422', async () => {
      parse.mockResolvedValue({ stop_reason: 'refusal', parsed_output: null });

      const res = await worker.fetch(missionsRequest(), ENV);
      expect(res.status).toBe(422);
    });

    it('502s when the output did not satisfy the schema', async () => {
      parse.mockResolvedValue({ stop_reason: 'end_turn', parsed_output: null });

      const res = await worker.fetch(missionsRequest(), ENV);
      expect(res.status).toBe(502);
    });

    it('502s as the old "garbled" error when status is ok but missions came back empty', async () => {
      parse.mockResolvedValue(okResponse([], 'ok', 'test'));

      const res = await worker.fetch(missionsRequest(), ENV);
      const body = await res.json();

      expect(res.status).toBe(502);
      expect(body.error).toMatch(/garbled/i);
    });
  });
});
