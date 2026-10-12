const SUFFIXES = [" ", ": ", " - "];

export const stripNamePrefix = (name: string, prefix: string) => {
  const lowerCasedName = name.toLowerCase();
  const lowerCasedPrefix = prefix.toLowerCase();
  for (const suffix of SUFFIXES) {
    const lowerCasedPrefixWithSuffix = `${lowerCasedPrefix}${suffix}`;

    if (lowerCasedName.startsWith(lowerCasedPrefixWithSuffix)) {
      const newName = name.substring(lowerCasedPrefixWithSuffix.length);
      if (newName.length) {
        // If first word already has an upper case letter (e.g. from brand name)
        // leave as-is, otherwise capitalize the first word.
        return hasUpperCase(newName.substring(0, newName.indexOf(" ")))
          ? newName
          : newName[0].toUpperCase() + newName.slice(1);
      }
    }
  }

  return undefined;
};

const hasUpperCase = (str: string): boolean => str.toLowerCase() !== str;
