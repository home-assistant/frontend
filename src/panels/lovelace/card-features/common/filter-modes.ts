export const filterModes = (
  supportedModes: string[] | undefined,
  selectedModes: string[] | undefined
): string[] =>
  selectedModes
    ? selectedModes.filter((mode) => (supportedModes || []).includes(mode))
    : supportedModes || [];
