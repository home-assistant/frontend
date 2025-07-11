export function getDuplicates(array: string[]): Set<string> {
  const duplicates = new Set<string>();
  const seen = new Set<string>();

  for (const item of array) {
    if (seen.has(item)) {
      duplicates.add(item);
    } else {
      seen.add(item);
    }
  }

  return duplicates;
}
