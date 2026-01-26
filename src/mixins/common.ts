import type { CSSResultGroup, LitElement } from "lit";

// prettier-ignore
const stylesArray = (styles?: CSSResultGroup | CSSResultGroup[]) =>
  styles === undefined
    ? []
    : Array.isArray(styles)
      ? styles : [styles];

export const getInheritedStyles = (thisElement) => {
  const superCtor = Object.getPrototypeOf(thisElement) as
    | typeof LitElement
    | undefined;
  return stylesArray(
    (superCtor?.styles ?? []) as CSSResultGroup | CSSResultGroup[]
  );
};
