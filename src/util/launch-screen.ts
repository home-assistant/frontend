import type { TemplateResult } from "lit";
import { render } from "lit";

const removeElement = (launchScreenElement: HTMLElement) => {
  launchScreenElement.classList.add("removing");
  setTimeout(() => {
    launchScreenElement.parentElement?.removeChild(launchScreenElement);
  }, 500);
};

export const removeLaunchScreen = () => {
  const launchScreenElement = document.getElementById("ha-launch-screen");
  if (!launchScreenElement?.parentElement) {
    return;
  }

  if (document.startViewTransition) {
    document.startViewTransition(() => {
      removeElement(launchScreenElement);
    });
  } else {
    // Fallback: Direct removal without transition
    removeElement(launchScreenElement);
  }
};

export const renderLaunchScreenInfoBox = (content: TemplateResult) => {
  const infoBoxElement = document.getElementById("ha-launch-screen-info-box");
  if (infoBoxElement) {
    render(content, infoBoxElement);
  }
};
