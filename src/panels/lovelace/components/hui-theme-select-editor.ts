import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import "@polymer/paper-button/paper-button";
import { TemplateResult } from "lit-html";

import { HomeAssistant } from "../../../types";
import { fireEvent } from "../../../common/dom/fire_event";
import { hassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";

export class HuiThemeSelectionEditor extends hassLocalizeLitMixin(LitElement) {
  protected hass?: HomeAssistant;
  private value?: string;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      value: {},
    };
  }

  protected render(): TemplateResult {
    const themes = ["Backend-selected", "default"].concat(
      Object.keys(this.hass!.themes.themes).sort()
    );
    return html`
      ${this.renderStyle()}
      <paper-dropdown-menu
        dynamic-align
        @value-changed=${this._changed}
      >
        <paper-listbox
          slot="dropdown-content"
          selected=${this.value || "Backend-selected"}
          attr-for-selected="theme"
        >
          ${themes.map((theme) => {
            return html`<paper-item .theme=${theme}>${theme}</paper-item>`;
          })}
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
    this.value = ev.target.value;
    fireEvent(this, "change");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-theme-select-editor": HuiThemeSelectionEditor;
  }
}

customElements.define("hui-theme-select-editor", HuiThemeSelectionEditor);
