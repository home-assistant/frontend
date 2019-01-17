import {
  html,
  LitElement,
  PropertyDeclarations,
  TemplateResult,
} from "lit-element";
import "@polymer/paper-button/paper-button";

import { HomeAssistant } from "../../../types";
import { fireEvent, HASSDomEvent } from "../../../common/dom/fire_event";
import { hassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";

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

export class HuiThemeSelectionEditor extends hassLocalizeLitMixin(LitElement) {
  public value?: string;
  public hass?: HomeAssistant;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      value: {},
    };
  }

  protected render(): TemplateResult | void {
    const themes = ["Backend-selected", "default"].concat(
      Object.keys(this.hass!.themes.themes).sort()
    );

    return html`
      ${this.renderStyle()}
      <paper-dropdown-menu
        label="Theme"
        dynamic-align
        @value-changed="${this._changed}"
      >
        <paper-listbox
          slot="dropdown-content"
          .selected="${this.value}"
          attr-for-selected="theme"
        >
          ${
            themes.map((theme) => {
              return html`
                <paper-item theme="${theme}">${theme}</paper-item>
              `;
            })
          }
        </paper-listbox>
      </paper-dropdown-menu>
    `;
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        paper-dropdown-menu {
          width: 100%;
        }
      </style>
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
    "hui-theme-select-editor": HuiThemeSelectionEditor;
  }
}

customElements.define("hui-theme-select-editor", HuiThemeSelectionEditor);
