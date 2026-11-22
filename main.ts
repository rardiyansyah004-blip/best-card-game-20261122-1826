// Ember Court — the hand-in program (Node 22, standard library only).
//
// The game is plain static files under game/ (index.html plus its CSS and ES
// modules, no network, no build step). This program hands it in: it copies
// game/ and screenshots/ from beside this file into the output directory and
// writes dossier.json there with the vendored make.fun library, so the judge
// can read the game from the dossier alone.
//
// Run it outside the grader with MAKEFUN_OUTPUT_DIR standing in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Both runs must write byte-identical output, so the copy is plain and the
// dossier is built from the files as copied, with no timestamps inside it.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The gate's own caps for game/ (RULES.txt): refuse to hand in a tree the
// scorer would refuse, instead of writing an entry that can never be valid.
const GAME_MAX_FILES = 993;
const GAME_MAX_BYTES = 50331648;

function countTree(dir) {
  let files = 0;
  let bytes = 0;
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, name.name);
    if (name.isDirectory()) {
      const sub = countTree(path);
      files += sub.files;
      bytes += sub.bytes;
    } else if (name.isFile()) {
      files += 1;
      bytes += statSync(path).size;
    }
  }
  return { files, bytes };
}

function copyTree(source, target) {
  cpSync(source, target, { recursive: true });
}

function copyIfPresent(name) {
  const source = join(repoRoot, name);
  if (!existsSync(source)) return;
  copyTree(source, join(outputDir, name));
}

mkdirSync(outputDir, { recursive: true });
const gameStats = countTree(join(repoRoot, 'game'));
if (gameStats.files > GAME_MAX_FILES || gameStats.bytes > GAME_MAX_BYTES) {
  throw new Error(
    `game/ over the gate caps: ${gameStats.files} files, ${gameStats.bytes} bytes ` +
    `(max ${GAME_MAX_FILES} files, ${GAME_MAX_BYTES} bytes)`,
  );
}
copyTree(join(repoRoot, 'game'), join(outputDir, 'game'));
copyIfPresent('screenshots');

const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);

// Sanity report for the builder: what was handed in.
const shotNames = existsSync(join(outputDir, 'screenshots'))
  ? readdirSync(join(outputDir, 'screenshots')).sort()
  : [];
if (shotNames.length < 3 || shotNames.length > 4) {
  throw new Error(`expected 3 or 4 screenshots, found ${shotNames.length}`);
}
console.log(`ember-court: game (${gameStats.files} files, ${gameStats.bytes} bytes) + ${shotNames.length} screenshot(s) written to ${outputDir}`);
for (const name of shotNames) console.log(`  shot: ${name}`);
