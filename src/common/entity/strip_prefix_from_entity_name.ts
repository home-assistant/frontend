const SUFFIXES = [" ", ": ", " - "];

/**
 * Strips a device name from an entity name.
 * @param entityName the entity name
 * @param prefix the prefix to strip
 * @returns
 */
export const stripPrefixFromEntityName = (
  entityName: string,
  prefix: string
) => {
  const lowerCasedEntityName = entityName.toLowerCase();
  const lowerCasedPrefix = prefix.toLowerCase();
  for (const suffix of SUFFIXES) {
    const lowerCasedPrefixWithSuffix = `${lowerCasedPrefix}${suffix}`;

    if (lowerCasedEntityName.startsWith(lowerCasedPrefixWithSuffix)) {
      const newName = entityName.substring(lowerCasedPrefixWithSuffix.length);
      if (newName.length) {
        // If first word already has an upper case letter (e.g. from brand name)
        // leave as-is, otherwise capitalize the first word.
        return hasUpperCase(newName.substr(0, newName.indexOf(" ")))
          ? newName
          : newName[0].toUpperCase() + newName.slice(1);
      }
    }
  }

  return undefined;
};

const hasUpperCase = (str: string): boolean => str.toLowerCase() !== str;
