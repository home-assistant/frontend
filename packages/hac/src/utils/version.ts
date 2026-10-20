const parse = (version: string): [number, number, number] | undefined => {
  // Pre-release and build metadata are ignored
  const parts = version.split(/[-+]/, 1)[0].split(".").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isInteger(part))) {
    return undefined;
  }
  return parts as [number, number, number];
};

/**
 * Whether a provided component version can be used where `required` is
 * expected, following semantic versioning: same major version and at least
 * the required minor and patch. In 0.x versions a minor bump is breaking.
 */
export const isCompatible = (provided: string, required: string): boolean => {
  const have = parse(provided);
  const want = parse(required);
  if (!have || !want || have[0] !== want[0]) {
    return false;
  }
  if (have[0] === 0 && have[1] !== want[1]) {
    return false;
  }
  return have[1] > want[1] || (have[1] === want[1] && have[2] >= want[2]);
};
