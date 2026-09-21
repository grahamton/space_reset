/**
 * Space Reset mission worker.
 *
 * Holds the Anthropic API key server-side and turns a room photo into a set of
 * cleaning missions. The client never sees a key and never needs one.
 */

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';

import { PERSONAS, DEFAULT_PERSONA } from '../../shared/personas.js';
import { MISSION_TYPES, DEFAULT_DIFFICULTY } from '../../shared/roomTypes.js';
import { buildMissionPrompt } from '../../shared/prompt.js';

const MODEL = 'claude-opus-5';

// Mirrors the 5MB client-side file cap, plus base64's ~33% overhead and headroom.
const MAX_IMAGE_BYTES = 7 * 1024 * 1024;

const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * The mission contract the UI renders against.
 *
 * `id` is deliberately absent — models are unreliable at inventing unique ids,
 * so the worker assigns them after parsing.
 */
const MissionsSchema = z.object({
  missions: z
    .array(
      // Field order is generation order: pick the category first, write the card,
      // then size the time box to what was described. Ending on a number rather
      // than free text also stopped stray characters trailing the last string.
      z.object({
        type: z
          .enum(MISSION_TYPES)
          .describe('Which of the "5 Things" categories this mission clears'),
        title: z.string().describe('Mission name in the persona voice, 2 to 6 words'),
        description: z
          .string()
          .describe(
            'The physical action, naming items and locations visible in the photo. 1 or 2 short sentences, about 25 words max'
          ),
        strategy: z
          .string()
          .describe(
            'One concrete tactic for starting this specific mission. 1 or 2 short sentences, about 25 words max'
          ),
        time: z
          .number()
          .int()
          .describe('Time box in seconds, a multiple of 30, sized to the visible amount')
      })
    )
    .min(1)
    .max(8)
});

const corsHeaders = (origin) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400'
});

const json = (body, { status = 200, origin = '*' } = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
  });

/**
 * Map an SDK failure to something the UI can show a person.
 *
 * Anything the user can act on gets its own message; everything else collapses
 * to a generic failure so we never surface internals to the client.
 */
const errorResponse = (error, origin) => {
  if (error instanceof Anthropic.AuthenticationError) {
    console.error('Anthropic auth failed — check the ANTHROPIC_API_KEY secret');
    return json(
      { error: 'Server is misconfigured. The API key was rejected.' },
      { status: 502, origin }
    );
  }
  if (error instanceof Anthropic.RateLimitError) {
    return json(
      { error: 'Too many requests right now. Give it a minute.' },
      { status: 429, origin }
    );
  }
  if (error instanceof Anthropic.BadRequestError) {
    console.error('Bad request to Anthropic:', error.message);
    return json(
      { error: "That photo couldn't be analyzed. Try another one." },
      { status: 400, origin }
    );
  }

  console.error('Mission generation failed:', error);
  return json({ error: 'Analysis failed. Try again?' }, { status: 502, origin });
};

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || '*';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const { pathname } = new URL(request.url);
    if (pathname !== '/api/missions') {
      return json({ error: 'Not found' }, { status: 404, origin });
    }
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, { status: 405, origin });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Expected a JSON body.' }, { status: 400, origin });
    }

    const { image, mimeType, personaId, roomType, difficulty = DEFAULT_DIFFICULTY } = body ?? {};

    if (typeof image !== 'string' || image.length === 0) {
      return json({ error: 'No image provided.' }, { status: 400, origin });
    }
    if (image.length > MAX_IMAGE_BYTES) {
      return json(
        { error: 'That photo is too large. Keep it under 5MB.' },
        { status: 413, origin }
      );
    }
    if (!ACCEPTED_MIME_TYPES.includes(mimeType)) {
      return json({ error: 'Unsupported image format.' }, { status: 400, origin });
    }

    const persona = PERSONAS[personaId] || PERSONAS[DEFAULT_PERSONA];

    try {
      const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

      const response = await client.messages.parse({
        model: MODEL,
        // A full mission set is well under 2k output tokens. Adaptive thinking is on
        // by default for this model and shares this budget, so leave real headroom,
        // but not 16k: a rare runaway string then burned ~2 minutes before failing.
        max_tokens: 8000,
        // The persona is a real system prompt here. Gemini had no system slot,
        // so the old code glued it to the front of the user turn instead.
        system: persona.systemInstruction,
        // Vision + short structured output doesn't need deep reasoning, and this
        // request sits behind a spinner someone is staring at. Raise if the
        // mission quality disappoints.
        output_config: {
          effort: 'medium',
          format: zodOutputFormat(MissionsSchema)
        },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mimeType, data: image } },
              { type: 'text', text: buildMissionPrompt({ roomType, difficulty }) }
            ]
          }
        ]
      });

      if (response.stop_reason === 'refusal') {
        return json(
          { error: "That photo couldn't be analyzed. Try another one." },
          { status: 422, origin }
        );
      }

      // parsed_output is null when the model's output didn't satisfy the schema.
      if (!response.parsed_output) {
        console.error('Structured output did not parse; stop_reason:', response.stop_reason);
        return json({ error: 'Analysis came back garbled. Try again?' }, { status: 502, origin });
      }

      const missions = response.parsed_output.missions.map((mission, index) => ({
        ...mission,
        id: `m${index + 1}`
      }));

      return json({ missions }, { origin });
    } catch (error) {
      return errorResponse(error, origin);
    }
  }
};
