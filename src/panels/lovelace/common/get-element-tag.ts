const CUSTOM_TYPE_PREFIX = "custom:";

export function getElementTag(type: string): string {
  return type.startsWith(CUSTOM_TYPE_PREFIX)
    ? type.substr(CUSTOM_TYPE_PREFIX.length)
    : `hui-${type}-card`;
}
