import { render, TemplateResult } from "lit";

export const removeLaunchScreen = () => {
  const launchScreenElement = document.getElementById("ha-launch-screen");
  if (launchScreenElement) {
    launchScreenElement.parentElement!.removeChild(launchScreenElement);
  }
};

export const renderLaunchScreen = (content: TemplateResult) => {
  const launchScreen = document.getElementById("ha-launch-screen");
  if (launchScreen) {
    render(content, launchScreen);
  }
};
