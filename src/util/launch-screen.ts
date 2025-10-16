import type { TemplateResult } from "lit";
import { render } from "lit";

export const removeLaunchScreen = () => {
  const launchScreenElement = document.getElementById("ha-launch-screen");
  if (!launchScreenElement) {
    return;
  }

  // Use View Transition API if available and user doesn't prefer reduced motion
  if (
    document.startViewTransition &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    document.startViewTransition(() => {
      launchScreenElement.parentElement!.removeChild(launchScreenElement);
    });
  } else {
    // Fallback: Direct removal without transition
    launchScreenElement.parentElement!.removeChild(launchScreenElement);
  }
};

export const renderLaunchScreenInfoBox = (content: TemplateResult) => {
  const infoBoxElement = document.getElementById("ha-launch-screen-info-box");
  if (infoBoxElement) {
    render(content, infoBoxElement);
  }
};
