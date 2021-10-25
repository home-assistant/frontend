/**
 * Strips a device name from an entity name.
 * @param entityName the entity name
 * @param lowerCasedDeviceNameWithSpaceSuffix the device name, lower cased with a space suffix
 * @returns
 */
export const stripPrefixFromEntityName = (
  entityName: string,
  lowerCasedDeviceNameWithSpaceSuffix: string
) => {
  if (
    !entityName.toLowerCase().startsWith(lowerCasedDeviceNameWithSpaceSuffix)
  ) {
    return undefined;
  }

  const newName = entityName.substring(
    lowerCasedDeviceNameWithSpaceSuffix.length
  );

  // If first word already has an upper case letter (e.g. from brand name)
  // leave as-is, otherwise capitalize the first word.
  return hasUpperCase(newName.substr(0, newName.indexOf(" ")))
    ? newName
    : newName[0].toUpperCase() + newName.slice(1);
};

const hasUpperCase = (str: string): boolean => str.toLowerCase() !== str;
