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

const worker = (await import('../index.js')).default;

const ENV = { ANTHROPIC_API_KEY: 'test-key', ALLOWED_ORIGIN: 'https://example.com' };

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
      expect(params.model).toBe('claude-opus-5');
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
