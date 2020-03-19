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
import { fireEvent } from "../../../common/dom/fire_event";

@customElement("hui-theme-select-editor")
export class HuiThemeSelectEditor extends LitElement {
  @property() public value?: string;
  @property() public label?: string;
  @property() public hass?: HomeAssistant;

  protected render(): TemplateResult {
    return html`
      <paper-dropdown-menu
        .label=${this.label ||
          `${this.hass!.localize(
            "ui.panel.lovelace.editor.card.generic.theme"
          )} (${this.hass!.localize(
            "ui.panel.lovelace.editor.card.config.optional"
          )})`}
        dynamic-align
      >
        <paper-listbox
          slot="dropdown-content"
          .selected=${this.value}
          attr-for-selected="theme"
          @iron-select=${this._changed}
        >
          <paper-item theme="remove"
            >${this.hass!.localize(
              "ui.panel.lovelace.editor.card.generic.no_theme"
            )}</paper-item
          >
          ${Object.keys(this.hass!.themes.themes)
            .sort()
            .map((theme) => {
              return html`
                <paper-item theme=${theme}>${theme}</paper-item>
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
    if (!this.hass || ev.target.selected === "") {
      return;
    }
    this.value = ev.target.selected === "remove" ? "" : ev.target.selected;
    fireEvent(this, "value-changed", { value: this.value });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-theme-select-editor": HuiThemeSelectEditor;
  }
}
