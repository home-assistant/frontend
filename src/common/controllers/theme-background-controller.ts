import { css } from "lit";
import type { ReactiveControllerHost } from "lit";
import { uiContext } from "../../data/context";
import { ContextSubscriptionController } from "../decorators/consume";

export class ThemeBackgroundController {
  private _themes?: unknown;

  private _selectedTheme?: unknown;

  constructor(private _host: ReactiveControllerHost & HTMLElement) {
    new ContextSubscriptionController(
      _host,
      uiContext,
      ({ themes, selectedTheme }) => {
        if (themes === this._themes && selectedTheme === this._selectedTheme) {
          return;
        }
        this._themes = themes;
        this._selectedTheme = selectedTheme;
        this._host.requestUpdate();
        this._host.updateComplete.then(() => this._apply());
      }
    );
  }

  private _apply() {
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
    display: block;
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
