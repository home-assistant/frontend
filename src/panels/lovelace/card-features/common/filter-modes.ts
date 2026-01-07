export const filterModes = <T extends string = string>(
  supportedModes: T[] | undefined,
  selectedModes: T[] | undefined
): T[] =>
  selectedModes
    ? (supportedModes || []).filter((mode) => selectedModes.includes(mode))
    : supportedModes || [];
