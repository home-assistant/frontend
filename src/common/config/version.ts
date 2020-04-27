export const atLeastVersion = (
  version: string,
  major: number,
  minor: number
): boolean => {
  const [haMajor, haMinor] = version.split(".", 2);
  return (
    Number(haMajor) > major ||
    (Number(haMajor) === major && Number(haMinor) >= minor)
  );
};
