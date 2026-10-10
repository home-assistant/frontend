import { css } from "lit";
import type { ReactiveController, ReactiveControllerHost } from "lit";
import type { HomeAssistant } from "../../types";

type Host = ReactiveControllerHost & HTMLElement & { hass?: HomeAssistant };

export class ThemeBackgroundController implements ReactiveController {
  private _themes?: HomeAssistant["themes"];

  private _selectedTheme?: HomeAssistant["selectedTheme"];

  constructor(private _host: Host) {
    _host.addController(this);
  }

  hostUpdate() {
    const hass = this._host.hass;
    if (
      !hass ||
      (hass.themes === this._themes &&
        hass.selectedTheme === this._selectedTheme)
    ) {
      return;
    }
    this._themes = hass.themes;
    this._selectedTheme = hass.selectedTheme;
    const background = getComputedStyle(this._host).getPropertyValue(
      "--lovelace-background"
    );
    this._host.toggleAttribute(
      "fixed-background",
      background.split(/\s+/).includes("fixed")
    );
  }
}

export const themeBackgroundStyles = css`
  :host {
    position: relative;
    isolation: isolate;
  }
  :host::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    background: var(--lovelace-background, var(--primary-background-color));
  }
  :host([fixed-background])::before {
    position: fixed;
    background-attachment: scroll !important;
  }
`;
