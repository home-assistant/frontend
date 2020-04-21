let curVersion: string | undefined;

export const setHAVersion = (version: string) => {
  curVersion = version;
};

export const atLeastCachedVersion = (major: number, minor: number) =>
  curVersion !== undefined && atLeastVersion(curVersion, major, minor);

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
