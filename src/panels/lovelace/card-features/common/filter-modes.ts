export const filterModes = <T extends string = string>(
  supportedModes: T[] | undefined,
  selectedModes: T[] | undefined
): T[] =>
  selectedModes
    ? selectedModes.filter((mode) => (supportedModes || []).includes(mode))
    : supportedModes || [];
