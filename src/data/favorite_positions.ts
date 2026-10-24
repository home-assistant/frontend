export const normalizeFavoritePositions = (
  positions?: number[],
  { min = 0 }: { min?: number } = {}
): number[] => {
  if (!positions) {
    return [];
  }

  const unique = new Set<number>();
  const normalized: number[] = [];

  for (const position of positions) {
    const value = Number(position);

    if (isNaN(value)) {
      continue;
    }

    const clamped = Math.max(min, Math.min(100, value));

    if (unique.has(clamped)) {
      continue;
    }

    unique.add(clamped);
    normalized.push(clamped);
  }

  return normalized;
};
