import type { TemplateResult } from "lit";
import { render } from "lit";
import { parseAnimationDuration } from "../common/util/parse-animation-duration";
import { withViewTransition } from "../common/util/view-transition";

let removalInitiated = false;

/**
 * Removes the launch screen with a fade-out view transition.
 *
 * @param instant - Removes the launch screen without animation. Used when the
 * external app covers the frontend with its own splash screen until the
 * `frontend/loaded` event, where the animation would play invisibly underneath.
 * @returns Whether this call initiated the removal (false when the removal
 * was already initiated, e.g. while the fade-out is still running).
 */
export const removeLaunchScreen = (instant = false): boolean => {
  const launchScreenElement = document.getElementById("ha-launch-screen");
  if (removalInitiated || !launchScreenElement?.parentElement) {
    return false;
  }
  removalInitiated = true;

  if (instant) {
    launchScreenElement.parentElement.removeChild(launchScreenElement);
    return true;
  }

  withViewTransition((viewTransitionAvailable) => {
    if (viewTransitionAvailable) {
      launchScreenElement.parentElement?.removeChild(launchScreenElement);
      return;
    }

    launchScreenElement.classList.add("removing");
    const durationFromCss = getComputedStyle(document.documentElement)
      .getPropertyValue("--ha-animation-duration-normal")
      .trim();
    setTimeout(
      () => {
        launchScreenElement.parentElement?.removeChild(launchScreenElement);
      },
      parseAnimationDuration(durationFromCss || "250ms")
    );
  });
  return true;
};

export const renderLaunchScreenContent = (
  content: TemplateResult,
  attribution: string
) => {
  const infoBoxElement = document.getElementById("ha-launch-screen-info-box");
  if (infoBoxElement) {
    render(content, infoBoxElement);
  }
  updateLaunchScreenAttribution(attribution);
};

export const updateLaunchScreenAttribution = (attribution: string) => {
  const attributionElement = document.getElementById(
    "ha-launch-screen-attribution"
  );
  if (attributionElement) {
    attributionElement.textContent = attribution;
  }
};
