import { render, TemplateResult } from "lit";

export const removeLaunchScreen = () => {
  const launchScreenElement = document.getElementById("ha-launch-screen");
  if (launchScreenElement) {
    launchScreenElement.parentElement!.removeChild(launchScreenElement);
  }
};

export const renderLaunchScreenInfoBox = (element: TemplateResult) => {
  const infoBoxElement = document.getElementById("ha-launch-screen-info-box");
  if (infoBoxElement) {
    render(element, infoBoxElement);
  }
};
