const SUFFIXES = [" ", ": ", " - "];

/**
 * Strips a device name from an entity name.
 * @param entityName the entity name (can be undefined for entities without names)
 * @param prefix the prefix to strip
 * @returns the entity name with prefix stripped, or undefined if no valid result
 */
export const stripPrefixFromEntityName = (
  entityName: string | undefined,
  prefix: string
) => {
  if (entityName == null) {
    return undefined;
  }

  if (prefix == null || prefix === "") {
    return entityName;
  }

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
