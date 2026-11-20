// make docs-check: the documentation's own tests (AGENTS.md, "Dónde va cada
// información"). It only reads. Errors fail (and stop a commit through the
// pre-commit hook); notes are reminders and never fail.
//
//   - relative links and images point to files that exist;
//   - CLAUDE.md is only `@AGENTS.md`;
//   - AGENTS.md and docs/estado.md stay within their size;
//   - each routine in docs/agentes/ has the same command in the three tools;
//   - docs/estado.md has its dates, and its "Lo abierto" matches the TODO cards;
//   - every TODO(N) in the code has an open card;
//   - ADRs are numbered in order, with their status, and listed in their index;
//   - the logbook has one file per day.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  TODO_STATES,
  daysBetween,
  extractLinks,
  isTodoState,
  labelledDate,
  localTarget,
  section,
  todoMarkers,
  todoState,
} from './lib.ts';

const root = process.cwd();
const errors: string[] = [];
const notes: string[] = [];

const SKIP = new Set([
  '.git',
  'node_modules',
  '.cache',
  'dist',
  'dev-dist',
  'coverage',
  'playwright-report',
  'test-results',
]);
const AGENTS_MAX = 30_000;
const ESTADO_MAX = 15_000;
const REVIEW_EVERY_DAYS = 7;
const TOOLS = ['.claude/commands', '.opencode/command', '.qwen/commands'];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(join(root, dir))) {
    if (SKIP.has(name)) continue;
    const path = dir ? `${dir}/${name}` : name;
    if (statSync(join(root, path)).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

const read = (path: string) => readFileSync(join(root, path), 'utf8');
const exists = (path: string) => existsSync(join(root, path));
const list = (dir: string) => (exists(dir) ? readdirSync(join(root, dir)).sort() : []);

const files = walk('');
const markdown = files.filter((file) => file.endsWith('.md'));

// Links and images.
for (const file of markdown) {
  for (const link of extractLinks(read(file))) {
    const target = localTarget(link);
    if (target === null) continue;
    const path = target.startsWith('/') ? target.slice(1) : join(dirname(file), target);
    if (!exists(path)) errors.push(`${file}: enlace roto a ${link}`);
  }
}

// CLAUDE.md and sizes.
if (!exists('CLAUDE.md') || read('CLAUDE.md') !== '@AGENTS.md\n') {
  errors.push('CLAUDE.md: tiene que ser solo "@AGENTS.md"');
}
for (const [file, max] of [
  ['AGENTS.md', AGENTS_MAX],
  ['docs/estado.md', ESTADO_MAX],
] as const) {
  if (!exists(file)) errors.push(`${file}: no existe`);
  else if (statSync(join(root, file)).size > max) {
    errors.push(`${file}: pasa de ${max} bytes; compáctalo`);
  }
}

// Routines: one procedure in docs/agentes/, the same command in each tool.
const routines = list('docs/agentes').filter((f) => f.endsWith('.md') && f !== 'README.md');
const routinesIndex = exists('docs/agentes/README.md') ? read('docs/agentes/README.md') : '';
for (const routine of routines) {
  const name = routine.replace(/\.md$/, '');
  if (!routinesIndex.includes(`/${name}`)) {
    errors.push(`docs/agentes/README.md: falta la rutina /${name}`);
  }
  const contents = TOOLS.map((tool) => {
    const path = `${tool}/${routine}`;
    if (!exists(path)) {
      errors.push(`${path}: falta el comando de la rutina ${name}`);
      return null;
    }
    const text = read(path);
    if (!text.includes(`docs/agentes/${routine}`)) {
      errors.push(`${path}: tiene que apuntar a docs/agentes/${routine}`);
    }
    return text;
  });
  if (new Set(contents.filter((c) => c !== null)).size > 1) {
    errors.push(`${routine}: el comando no es igual en ${TOOLS.join(', ')}`);
  }
}
for (const tool of TOOLS) {
  for (const command of list(tool)) {
    if (!routines.includes(command)) {
      errors.push(`${tool}/${command}: comando sin rutina en docs/agentes/`);
    }
  }
}

// docs/estado.md: its dates.
const estado = exists('docs/estado.md') ? read('docs/estado.md') : '';
const today = new Date().toISOString().slice(0, 10);
if (!labelledDate(estado, 'Al día')) errors.push('docs/estado.md: falta "**Al día:** AAAA-MM-DD"');
const reviewed = labelledDate(estado, 'Revisada');
if (!reviewed) errors.push('docs/estado.md: falta "**Revisada:** AAAA-MM-DD"');
else if (daysBetween(reviewed, today) > REVIEW_EVERY_DAYS) {
  notes.push(
    `la última /revisar-docs fue el ${reviewed}: toca otra (docs/agentes/revisar-docs.md)`,
  );
}

// TODO cards against "Lo abierto".
const open = section(estado, 'Lo abierto') ?? '';
if (!section(estado, 'Lo abierto')) errors.push('docs/estado.md: falta la sección "Lo abierto"');
const openCards = new Set<number>();
const allCards = new Set<number>();
for (const card of list('docs/todo').filter((f) => f !== 'README.md')) {
  const path = `docs/todo/${card}`;
  const number = /^(\d+)-[a-z0-9-]+\.md$/.exec(card)?.[1];
  if (!number) {
    errors.push(`${path}: el nombre tiene que ser NN-slug.md`);
    continue;
  }
  const n = Number(number);
  allCards.add(n);
  const text = read(path);
  if (!text.startsWith(`# TODO ${n} — `)) errors.push(`${path}: el título es "# TODO ${n} — …"`);
  const state = todoState(text);
  if (!state || !isTodoState(state)) {
    errors.push(`${path}: "**Estado:**" tiene que ser uno de: ${TODO_STATES.join(', ')}`);
    continue;
  }
  const row = open.split('\n').find((line) => line.includes(`todo/${card}`));
  if (state === 'cerrado') {
    if (row) errors.push(`docs/estado.md: el TODO ${n} está cerrado y sigue en "Lo abierto"`);
  } else {
    openCards.add(n);
    if (!row) errors.push(`docs/estado.md: falta la fila del TODO ${n} en "Lo abierto"`);
    else if (!row.includes(`| ${state} |`)) {
      errors.push(`docs/estado.md: la fila del TODO ${n} no dice "${state}", como su ficha`);
    }
  }
}

// TODO(N) in the code: an open card for each.
const code = files.filter(
  (file) => /\.(ts|js|css|html|json|ya?ml)$/.test(file) && file !== 'package-lock.json',
);
for (const file of code) {
  if (file.startsWith('scripts/docs/') || file.startsWith('tests/unit/docs')) continue;
  for (const n of todoMarkers(read(file))) {
    if (!allCards.has(n)) errors.push(`${file}: TODO(${n}) sin ficha en docs/todo/`);
    else if (!openCards.has(n)) errors.push(`${file}: TODO(${n}) apunta a una ficha cerrada`);
  }
}

// ADRs.
const adrIndex = exists('docs/decisions/README.md') ? read('docs/decisions/README.md') : '';
const adrs = list('docs/decisions').filter((f) => f !== 'README.md');
adrs.forEach((adr, i) => {
  const path = `docs/decisions/${adr}`;
  const number = /^(\d{4})-[a-z0-9-]+\.md$/.exec(adr)?.[1];
  if (!number) return void errors.push(`${path}: el nombre tiene que ser NNNN-slug.md`);
  if (Number(number) !== i + 1) errors.push(`${path}: falta el ADR ${i + 1} o sobra este`);
  const text = read(path);
  if (!text.startsWith(`# ADR ${number} — `))
    errors.push(`${path}: el título es "# ADR ${number} — …"`);
  if (!/^Estado: /m.test(text)) errors.push(`${path}: falta la línea "Estado: …"`);
  if (!adrIndex.includes(`(${adr})`))
    errors.push(`docs/decisions/README.md: falta el ADR ${number}`);
});

// Logbook.
for (const day of list('docs/bitacora')) {
  const path = `docs/bitacora/${day}`;
  const date = /^(\d{4}-\d{2}-\d{2})\.md$/.exec(day)?.[1];
  if (!date) errors.push(`${path}: el nombre tiene que ser AAAA-MM-DD.md`);
  else if (!read(path).startsWith(`# ${date}\n`)) errors.push(`${path}: el título es "# ${date}"`);
}

for (const note of notes) console.log(`nota: ${note}`);
if (errors.length > 0) {
  for (const error of errors) console.error(`error: ${error}`);
  console.error(`docs-check: ${errors.length} error(es)`);
  process.exit(1);
}
console.log(`docs-check: ok (${markdown.length} documentos)`);
