export const atLeastVersion = (
  version: string,
  major: number,
  minor: number,
  patch?: number
): boolean => {
  if (__DEMO__) {
    return true;
  }

  const [haMajor, haMinor, haPatch] = version.split(".", 3);

  const cleanHaPatch =
    haPatch.indexOf("dev") === -1
      ? haPatch
      : haPatch.substring(0, haPatch.indexOf("dev"));

  return (
    Number(haMajor) > major ||
    (Number(haMajor) === major &&
      (patch === undefined
        ? Number(haMinor) >= minor
        : Number(haMinor) > minor)) ||
    (patch !== undefined &&
      Number(haMajor) === major &&
      Number(haMinor) === minor &&
      Number(cleanHaPatch) >= patch)
  );
};

export const isDevVersion = (version: string): boolean => {
  if (__DEMO__) {
    return false;
  }

  return version.includes("dev");
};
