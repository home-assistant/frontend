export const atLeastVersion = (
  version: string,
  major: number,
  minor: number,
  patch?: number
): boolean => {
  const [haMajor, haMinor, haPatch] = version.split(".", 3);

  return (
    Number(haMajor) > major ||
    (Number(haMajor) === major &&
      (patch === undefined
        ? Number(haMinor) >= minor
        : Number(haMinor) > minor)) ||
    (patch !== undefined &&
      Number(haMajor) === major &&
      Number(haMinor) === minor &&
      Number(haPatch) >= patch)
  );
};
