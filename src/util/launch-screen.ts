import type { TemplateResult } from "lit";
import { render } from "lit";
import { parseAnimationDuration } from "../common/util/parse-animation-duration";
import { withViewTransition } from "../common/util/view-transition";

const removeElement = (
  launchScreenElement: HTMLElement,
  skipAnimation: boolean
) => {
  if (skipAnimation) {
    launchScreenElement.parentElement?.removeChild(launchScreenElement);
    return;
  }

  launchScreenElement.classList.add("removing");

  const durationFromCss = getComputedStyle(document.documentElement)
    .getPropertyValue("--ha-animation-base-duration")
    .trim();

  setTimeout(() => {
    launchScreenElement.parentElement?.removeChild(launchScreenElement);
  }, parseAnimationDuration(durationFromCss));
};

export const removeLaunchScreen = () => {
  const launchScreenElement = document.getElementById("ha-launch-screen");
  if (!launchScreenElement?.parentElement) {
    return;
  }

  withViewTransition(() => {
    removeElement(launchScreenElement, false);
  });
};

export const renderLaunchScreenInfoBox = (content: TemplateResult) => {
  const infoBoxElement = document.getElementById("ha-launch-screen-info-box");
  if (infoBoxElement) {
    render(content, infoBoxElement);
  }
};
