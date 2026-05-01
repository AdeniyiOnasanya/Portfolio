export type ForbiddenMatch = {
  char: string;
  index: number;
  line: number;
  column: number;
};

const FORBIDDEN_PATTERN = /\u2014|\p{Extended_Pictographic}/gu;

export function findForbiddenChars(text: string): ForbiddenMatch[] {
  const matches: ForbiddenMatch[] = [];
  for (const match of text.matchAll(FORBIDDEN_PATTERN)) {
    const index = match.index ?? 0;
    const before = text.slice(0, index);
    const lastNewline = before.lastIndexOf('\n');
    const line = 1 + (before.match(/\n/g)?.length ?? 0);
    const column = index - lastNewline;
    matches.push({
      char: match[0],
      index,
      line,
      column,
    });
  }
  return matches;
}
