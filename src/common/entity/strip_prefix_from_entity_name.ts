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

/**
 * Whether an entity name is only the device name, which core treats as no name of its own.
 */
export const isDeviceName = (entityName: string, deviceName: string) => {
  if (!deviceName) {
    return false;
  }
  const lowerCasedEntityName = entityName.toLowerCase();
  const lowerCasedDeviceName = deviceName.toLowerCase();
  return (
    lowerCasedEntityName.startsWith(lowerCasedDeviceName) &&
    /^[ :-]*$/.test(lowerCasedEntityName.slice(lowerCasedDeviceName.length))
  );
};

const hasUpperCase = (str: string): boolean => str.toLowerCase() !== str;
