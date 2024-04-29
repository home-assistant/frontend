export const filterModes = (
  supportedModes: string[] | undefined,
  selectedModes: string[] | undefined
): string[] =>
  (selectedModes || []).length
    ? selectedModes!.filter((mode) => (supportedModes || []).includes(mode))
    : supportedModes || [];
