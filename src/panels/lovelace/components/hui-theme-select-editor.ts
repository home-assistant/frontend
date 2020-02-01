import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
  css,
  CSSResult,
} from "lit-element";
import "@material/mwc-button";

import { HomeAssistant } from "../../../types";
import { fireEvent, HASSDomEvent } from "../../../common/dom/fire_event";

declare global {
  // for fire event
  interface HASSDomEvents {
    "theme-changed": undefined;
  }
  // for add event listener
  interface HTMLElementEventMap {
    "theme-changed": HASSDomEvent<undefined>;
  }
}

@customElement("hui-theme-select-editor")
export class HuiThemeSelectEditor extends LitElement {
  @property() public value?: string;
  @property() public label?: string;
  @property() public hass?: HomeAssistant;

  protected render(): TemplateResult {
    const themes = ["Backend-selected", "default"].concat(
      Object.keys(this.hass!.themes.themes).sort()
    );

    return html`
      <paper-dropdown-menu
        .label=${this.label ||
          this.hass!.localize("ui.panel.lovelace.editor.card.generic.theme") +
            " (" +
            this.hass!.localize(
              "ui.panel.lovelace.editor.card.config.optional"
            ) +
            ")"}
        dynamic-align
        @value-changed="${this._changed}"
      >
        <paper-listbox
          slot="dropdown-content"
          .selected="${this.value}"
          attr-for-selected="theme"
        >
          ${themes.map((theme) => {
            return html`
              <paper-item theme="${theme}">${theme}</paper-item>
            `;
          })}
        </paper-listbox>
      </paper-dropdown-menu>
    `;
  }

  static get styles(): CSSResult {
    return css`
      paper-dropdown-menu {
        width: 100%;
      }
    `;
  }

  private _changed(ev): void {
    if (!this.hass || ev.target.value === "") {
      return;
    }
    this.value = ev.target.value;
    fireEvent(this, "theme-changed");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-theme-select-editor": HuiThemeSelectEditor;
  }
}
