import { dump } from "js-yaml";

/** How many lines of YAML a change added and removed, like a git diff. */
export interface LineChanges {
  added: number;
  removed: number;
}

// Beyond this many line pairs only the lines that differ are counted, which
// counts a moved line as unchanged
const MAX_LCS_CELLS = 4_000_000;

const lines = (text: string) =>
  text ? text.replace(/\n$/, "").split("\n") : [];

/** Counts the added and removed lines between two texts. */
export const countLineChanges = (
  before: string,
  after: string
): LineChanges => {
  const a = lines(before);
  const b = lines(after);
  if (a.length * b.length > MAX_LCS_CELLS) {
    const left = new Map<string, number>();
    a.forEach((line) => left.set(line, (left.get(line) ?? 0) + 1));
    let kept = 0;
    b.forEach((line) => {
      const count = left.get(line) ?? 0;
      if (count) {
        left.set(line, count - 1);
        kept++;
      }
    });
    return { added: b.length - kept, removed: a.length - kept };
  }
  // The longest common subsequence of lines, one row at a time
  let previous = new Uint32Array(b.length + 1);
  let current = new Uint32Array(b.length + 1);
  for (const line of a) {
    for (let j = 0; j < b.length; j++) {
      current[j + 1] =
        line === b[j] ? previous[j] + 1 : Math.max(previous[j + 1], current[j]);
    }
    [previous, current] = [current, previous];
  }
  const kept = previous[b.length];
  return { added: b.length - kept, removed: a.length - kept };
};

/** Counts the changed lines of two configs, in YAML as the editor shows it. */
export const countConfigLineChanges = (
  before: unknown,
  after: unknown
): LineChanges =>
  countLineChanges(
    dump(before ?? {}, { noRefs: true }),
    dump(after ?? {}, { noRefs: true })
  );
