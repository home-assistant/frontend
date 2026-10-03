const SI_PREFIX_MULTIPLIERS: Record<string, number> = {
  T: 1e12,
  G: 1e9,
  M: 1e6,
  k: 1e3,
  m: 1e-3,
  "\u00B5": 1e-6, // µ (micro sign)
  "\u03BC": 1e-6, // μ (greek small letter mu)
};

/**
 * Normalize a numeric value by detecting SI unit prefixes (T, G, M, k, m, µ).
 * Only applies when the unit is longer than 1 character and starts with a
 * recognized prefix, avoiding false positives on standalone units like "m" (meters).
 */
export const normalizeValueBySIPrefix = (
  value: number,
  unit: string | undefined
): number => {
  if (!unit || unit.length <= 1) {
    return value;
  }
  const prefix = unit[0];
  if (prefix in SI_PREFIX_MULTIPLIERS) {
    return value * SI_PREFIX_MULTIPLIERS[prefix];
  }
  return value;
};
