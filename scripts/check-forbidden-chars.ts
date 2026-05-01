import { readFile } from 'node:fs/promises';
import { glob } from 'tinyglobby';
import { findForbiddenChars } from '../lib/text/forbidden';

const PATTERNS = ['**/*.ts', '**/*.tsx', '**/*.md', '**/*.mdx', '**/*.json', '**/*.css'];

const IGNORE = [
  'node_modules/**',
  '.next/**',
  '.vercel/**',
  '.turbo/**',
  'dist/**',
  'build/**',
  'coverage/**',
  'pnpm-lock.yaml',
  'cv/**',
  'design_handoff_portfolio/**',
];

function formatCodepoint(char: string): string {
  const cp = char.codePointAt(0);
  if (cp === undefined) {
    return 'U+????';
  }
  return `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
}

async function main(): Promise<number> {
  const files = await glob(PATTERNS, { ignore: IGNORE });
  let totalOffenders = 0;
  let filesWithOffenders = 0;

  for (const file of files) {
    const text = await readFile(file, 'utf8');
    const matches = findForbiddenChars(text);
    if (matches.length === 0) {
      continue;
    }
    filesWithOffenders += 1;
    totalOffenders += matches.length;
    for (const m of matches) {
      process.stdout.write(
        `${file}:${m.line}:${m.column} forbidden character ${formatCodepoint(m.char)}\n`,
      );
    }
  }

  if (totalOffenders === 0) {
    process.stdout.write('clean\n');
    return 0;
  }
  process.stdout.write(
    `${totalOffenders} forbidden character(s) in ${filesWithOffenders} file(s)\n`,
  );
  return 1;
}

main()
  .then((code) => {
    process.exit(code);
  })
  .catch((err) => {
    process.stderr.write(`check-forbidden-chars failed: ${(err as Error).message}\n`);
    process.exit(2);
  });
