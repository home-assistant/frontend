export function computeCssVariable(
  props: string | string[]
): string | undefined {
  if (Array.isArray(props)) {
    return props
      .reverse()
      .reduce<string | undefined>(
        (str, variable) => `var(${variable}${str ? `, ${str}` : ""})`,
        undefined
      );
  }
  return `var(${props})`;
}

export function computeCssValue(
  prop: string | string[],
  computedStyles: CSSStyleDeclaration
): string | undefined {
  if (Array.isArray(prop)) {
    for (const property of prop) {
      const value = computeCssValue(property, computedStyles);
      if (value) return value;
    }
    return undefined;
  }

  if (!prop.endsWith("-color")) {
    return undefined;
  }
  return computedStyles.getPropertyValue(prop).trim() || undefined;
}
