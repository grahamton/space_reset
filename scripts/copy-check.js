/**
 * copy-check: run eval photos through the mission worker, then check the
 * generated copy against the prompt's rules with TypeSafe.
 *
 *   npm run copy-check                              every photo x every persona
 *   npm run copy-check -- --personas roastMaster,bestie --difficulty hard
 *   npm run copy-check -- eval-results/<file>.json  re-check saved responses (no Claude calls)
 *
 * Reads ANTHROPIC_API_KEY and TYPESAFE_API_KEY from worker/.dev.vars. The
 * worker is imported and called in-process, so no `wrangler dev` is needed and
 * the request goes through exactly the code that ships. Each fresh run is saved
 * to eval-results/ so question or threshold changes can be re-checked for the
 * cost of the TypeSafe calls alone.
 */

import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

import { TypeSafeClient } from '@typesafe-ai/sdk';

import worker from '../worker/src/index.js';
import { PERSONAS } from '../shared/personas.js';
import {
  buildCopyCheckRequest,
  readCopyCheckAnswers,
  COPY_RULES,
  COPY_RULE_IDS
} from '../shared/copyChecks.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PHOTOS_DIR = path.join(ROOT, 'eval-photos');
const RESULTS_DIR = path.join(ROOT, 'eval-results');

const MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif'
};

// Opus calls are slow and rate-limited; TypeSafe calls are cheap and fast.
const WORKER_CONCURRENCY = 3;
const CHECK_CONCURRENCY = 8;

const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    personas: { type: 'string', default: Object.keys(PERSONAS).join(',') },
    difficulty: { type: 'string', default: 'medium' },
    room: { type: 'string', default: 'other' },
    count: { type: 'string', default: 'auto' },
    verbose: { type: 'boolean', short: 'v', default: false }
  }
});

process.loadEnvFile(path.join(ROOT, 'worker', '.dev.vars'));

/** Run `fn` over `items` with at most `limit` in flight, preserving order. */
const mapLimit = async (items, limit, fn) => {
  const results = new Array(items.length);
  let next = 0;
  const lanes = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(lanes);
  return results;
};

const generate = async () => {
  const personaIds = args.personas.split(',').map((id) => id.trim());
  const unknown = personaIds.filter((id) => !PERSONAS[id]);
  if (unknown.length) throw new Error(`Unknown persona(s): ${unknown.join(', ')}`);

  const photos = (await readdir(PHOTOS_DIR)).filter(
    (f) => MIME_TYPES[path.extname(f).toLowerCase()]
  );
  if (!photos.length) throw new Error(`No photos in ${PHOTOS_DIR}`);

  const jobs = photos.flatMap((photo) => personaIds.map((personaId) => ({ photo, personaId })));
  console.log(
    `Generating ${jobs.length} mission sets (${photos.length} photos x ${personaIds.length} personas)...`
  );

  return mapLimit(jobs, WORKER_CONCURRENCY, async ({ photo, personaId }) => {
    const bytes = await readFile(path.join(PHOTOS_DIR, photo));
    const request = new Request('http://localhost/api/missions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: bytes.toString('base64'),
        mimeType: MIME_TYPES[path.extname(photo).toLowerCase()],
        personaId,
        roomType: args.room,
        difficulty: args.difficulty,
        missionCount: args.count === 'auto' ? 'auto' : Number(args.count)
      })
    });
    const started = Date.now();
    const res = await worker.fetch(request, { ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY });
    const response = await res.json();
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    console.log(
      `  ${photo} / ${personaId}: ${res.ok ? response.status : `error ${res.status}`} (${seconds}s)`
    );
    return { photo, personaId, ok: res.ok, response };
  });
};

const check = async (runs) => {
  const client = new TypeSafeClient();
  let inputTokens = 0;

  const checked = await mapLimit(runs, CHECK_CONCURRENCY, async (run) => {
    if (!run.ok) return { ...run, findings: [], questionCount: 0 };
    const request = buildCopyCheckRequest(run.response);
    if (!request) return { ...run, findings: [], questionCount: 0 };
    const result = await client.systemOne(request);
    inputTokens += result.usage.input_tokens;
    return {
      ...run,
      model: result.model,
      answers: result.answers,
      questionCount: Object.keys(request.questions).length,
      findings: readCopyCheckAnswers(run.response, result.answers)
    };
  });

  return { checked, inputTokens };
};

const pct = (n, d) => (d ? `${Math.round((100 * n) / d)}%` : '-');

const report = ({ checked, inputTokens }) => {
  const scored = checked.filter((run) => run.questionCount > 0);
  const cards = scored.reduce((sum, run) => sum + run.response.missions.length, 0);
  const notes = scored.filter((run) => run.response.note?.trim()).length;

  const labels = Object.fromEntries(COPY_RULES.map((rule) => [rule.id, rule.label]));
  labels.type_fit = 'Type does not match the card';
  const denominator = (id) => {
    if (id === 'type_fit') return cards;
    const rule = COPY_RULES.find((r) => r.id === id);
    return (
      (rule.appliesTo.includes('card') ? cards : 0) + (rule.appliesTo.includes('note') ? notes : 0)
    );
  };

  console.log(
    `\nChecked ${scored.length} responses: ${cards} cards, ${notes} notes (model ${scored[0]?.model ?? '-'}, ${inputTokens} input tokens)`
  );
  const failed = checked.filter((run) => !run.ok);
  if (failed.length) console.log(`${failed.length} worker call(s) failed and were skipped.`);

  console.log('\nrule                      flag   review   of');
  for (const id of COPY_RULE_IDS) {
    const all = scored.flatMap((run) => run.findings.filter((f) => f.rule === id));
    const flags = all.filter((f) => f.level === 'flag').length;
    const reviews = all.length - flags;
    const d = denominator(id);
    console.log(
      `${id.padEnd(24)} ${String(flags).padStart(5)} ${String(reviews).padStart(8)} ${String(d).padStart(5)}   ${labels[id]} (${pct(flags, d)} flagged)`
    );
  }

  // Canary runs carry `expect`: the rule@location findings that should flag.
  const canaries = scored.filter((run) => Array.isArray(run.expect));
  if (canaries.length) {
    const misses = [];
    const falsePositives = [];
    let expected = 0;
    for (const run of canaries) {
      const flagged = new Set(
        run.findings.filter((f) => f.level === 'flag').map((f) => `${f.rule}@${f.where}`)
      );
      expected += run.expect.length;
      misses.push(
        ...run.expect.filter((key) => !flagged.has(key)).map((k) => `${run.photo}: ${k}`)
      );
      falsePositives.push(
        ...[...flagged].filter((key) => !run.expect.includes(key)).map((k) => `${run.photo}: ${k}`)
      );
    }
    console.log(
      `\nCanaries: caught ${expected - misses.length}/${expected} seeded problems, ${falsePositives.length} false positive flag(s)`
    );
    for (const miss of misses) console.log(`  MISSED ${miss}`);
    for (const fp of falsePositives) console.log(`  EXTRA  ${fp}`);
  }

  const withFindings = scored.filter((run) =>
    run.findings.some((f) => args.verbose || f.level === 'flag')
  );
  if (withFindings.length)
    console.log(args.verbose ? '\nFlags and reviews:' : '\nFlags (use -v to include reviews):');
  for (const run of withFindings) {
    console.log(`\n${run.photo} / ${run.personaId} [${run.response.status}]`);
    for (const f of run.findings) {
      if (!args.verbose && f.level !== 'flag') continue;
      const detail = f.detail ? ` (${f.detail})` : '';
      console.log(
        `  ${f.level.toUpperCase().padEnd(6)} ${f.probability.toFixed(2)} ${f.rule} @ ${f.where}${detail}`
      );
      console.log(`         "${f.text}"`);
    }
  }
};

const main = async () => {
  let runs;
  if (positionals[0]) {
    ({ runs } = JSON.parse(await readFile(positionals[0], 'utf8')));
    console.log(`Re-checking ${runs.length} saved responses from ${positionals[0]}`);
  } else {
    runs = await generate();
    await mkdir(RESULTS_DIR, { recursive: true });
    const file = path.join(RESULTS_DIR, `${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    await writeFile(file, JSON.stringify({ args, runs }, null, 2));
    console.log(`Saved responses to ${path.relative(ROOT, file)}`);
  }
  report(await check(runs));
};

main().catch((error) => {
  console.error(error.message ?? error);
  process.exitCode = 1;
});
