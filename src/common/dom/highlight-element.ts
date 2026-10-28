const HIGHLIGHT_DURATION = 1500;

export const highlightElement = (element: HTMLElement): void => {
  const style = getComputedStyle(element);
  const outline = `${style.getPropertyValue("--ha-border-width-md") || "2px"} solid`;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  element.getAnimations().forEach((animation) => animation.cancel());
  element.animate(
    [
      { outline: `${outline} ${style.getPropertyValue("--primary-color")}` },
      { outline: `${outline} transparent` },
    ],
    {
      duration: HIGHLIGHT_DURATION,
      easing: reducedMotion ? "steps(1, end)" : "ease-out",
    }
  );
};
