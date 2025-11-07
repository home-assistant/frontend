import type { TemplateResult } from "lit";
import { render } from "lit";

const removeElement = (
  launchScreenElement: HTMLElement,
  skipAnimation: boolean
) => {
  launchScreenElement.classList.add("removing");

  if (skipAnimation) {
    launchScreenElement.parentElement?.removeChild(launchScreenElement);
    return;
  }

  const durationFromCss = getComputedStyle(document.documentElement)
    .getPropertyValue("--ha-animation-base-duration")
    .trim();
  let timeout = parseFloat(durationFromCss);
  if (isNaN(timeout)) {
    if (durationFromCss.endsWith("ms")) {
      timeout = parseFloat(durationFromCss.slice(0, -2));
    } else if (durationFromCss.endsWith("s")) {
      timeout = parseFloat(durationFromCss.slice(0, -1)) * 1000;
    }
  }
  if (!isFinite(timeout) || timeout < 0) {
    timeout = 0;
  }

  setTimeout(() => {
    launchScreenElement.parentElement?.removeChild(launchScreenElement);
  }, timeout);
};

export const removeLaunchScreen = () => {
  const launchScreenElement = document.getElementById("ha-launch-screen");
  if (!launchScreenElement?.parentElement) {
    return;
  }

  if (document.startViewTransition) {
    document.startViewTransition(() => {
      removeElement(launchScreenElement, false);
    });
  } else {
    // Fallback: Direct removal without transition
    removeElement(launchScreenElement, true);
  }
};

export const renderLaunchScreenInfoBox = (content: TemplateResult) => {
  const infoBoxElement = document.getElementById("ha-launch-screen-info-box");
  if (infoBoxElement) {
    render(content, infoBoxElement);
  }
};
