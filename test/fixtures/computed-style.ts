/**
 * Fake CSSStyleDeclaration for code that resolves theme colors via
 * `getComputedStyle(this)` (e.g. getGraphColorByIndex). Returns a fixed,
 * deterministic palette so series colors are stable in tests and benches
 * without a DOM.
 */
const FIXED_THEME: Record<string, string> = {
  "--graph-color-1": "#4269d0",
  "--graph-color-2": "#f4bd4a",
  "--graph-color-3": "#ff725c",
  "--graph-color-4": "#6cc5b0",
  "--graph-color-5": "#a463f2",
  "--graph-color-6": "#ff8ab7",
  "--graph-color-7": "#9c6b4e",
  "--graph-color-8": "#97bbf5",
  "--primary-color": "#03a9f4",
  "--accent-color": "#ff9800",
  "--primary-text-color": "#212121",
  "--secondary-text-color": "#727272",
  "--disabled-text-color": "#bdbdbd",
  "--error-color": "#db4437",
  "--warning-color": "#ffa600",
  "--success-color": "#43a047",
  "--info-color": "#039be5",
  "--state-climate-heat-color": "#ff8100",
  "--state-climate-cool-color": "#2b9af9",
  "--state-climate-idle-color": "#7f848e",
  "--state-climate-off-color": "#80868b",
};

export const createMockComputedStyle = (
  overrides: Record<string, string> = {}
): CSSStyleDeclaration => {
  const theme = { ...FIXED_THEME, ...overrides };
  return {
    getPropertyValue: (property: string) => theme[property] ?? "",
  } as CSSStyleDeclaration;
};
