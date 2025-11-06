import type { TemplateResult } from "lit";
import { render } from "lit";

export const removeLaunchScreen = () => {
  const launchScreenElement = document.getElementById("ha-launch-screen");
  if (!launchScreenElement?.parentElement) {
    return;
  }

  if (document.startViewTransition) {
    document.startViewTransition(() => {
      launchScreenElement.parentElement?.removeChild(launchScreenElement);
    });
  } else {
    // Fallback: Direct removal without transition
    launchScreenElement.parentElement.removeChild(launchScreenElement);
  }
};

export const renderLaunchScreenInfoBox = (content: TemplateResult) => {
  const infoBoxElement = document.getElementById("ha-launch-screen-info-box");
  if (infoBoxElement) {
    render(content, infoBoxElement);
  }
};
