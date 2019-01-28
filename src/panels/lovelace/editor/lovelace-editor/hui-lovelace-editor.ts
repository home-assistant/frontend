import {
  html,
  LitElement,
  PropertyDeclarations,
  TemplateResult,
} from "lit-element";
import "@polymer/paper-input/paper-input";

import { EditorTarget } from "../types";
import { HomeAssistant } from "../../../../types";
import { fireEvent } from "../../../../common/dom/fire_event";
import { configElementStyle } from "../config-elements/config-elements-style";

import { LovelaceConfig } from "../../../../data/lovelace";

declare global {
  interface HASSDomEvents {
    "lovelace-config-changed": {
      config: LovelaceConfig;
    };
  }
}

export class HuiLovelaceEditor extends LitElement {
  static get properties(): PropertyDeclarations {
    return { hass: {}, config: {} };
  }

  public hass?: HomeAssistant;
  public config?: LovelaceConfig;

  get _title(): string {
    if (!this.config) {
      return "";
    }
    return this.config.title || "";
  }

  protected render(): TemplateResult | void {
    return html`
      ${configElementStyle}
      <div class="card-config">
        <paper-input
          label="Title"
          .value="${this._title}"
          .configValue="${"title"}"
          @value-changed="${this._valueChanged}"
        ></paper-input>
      </div>
    `;
  }

  private _valueChanged(ev: Event): void {
    if (!this.config) {
      return;
    }

    const target = ev.currentTarget! as EditorTarget;

    if (this[`_${target.configValue}`] === target.value) {
      return;
    }

    let newConfig;

    if (target.configValue) {
      newConfig = {
        ...this.config,
        [target.configValue]: target.value,
      };
    }

    fireEvent(this, "lovelace-config-changed", { config: newConfig });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-lovelace-editor": HuiLovelaceEditor;
  }
}

customElements.define("hui-lovelace-editor", HuiLovelaceEditor);
