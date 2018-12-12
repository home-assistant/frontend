import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";
import "@polymer/paper-input/paper-textarea";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";

import "../../../components/ha-service-picker";

import { HomeAssistant } from "../../../types";
import { fireEvent, HASSDomEvent } from "../../../common/dom/fire_event";
import { EditorTarget } from "../editor/types";
import {
  ActionConfig,
  NavigateActionConfig,
  CallServiceActionConfig,
} from "../../../data/lovelace";
import { configElementStyle } from "../editor/config-elements/config-elements-style";
import { PaperInputElement } from "@polymer/paper-input/paper-input";

declare global {
  // for fire event
  interface HASSDomEvents {
    "action-changed": undefined;
  }
  // for add event listener
  interface HTMLElementEventMap {
    "action-changed": HASSDomEvent<undefined>;
  }
}

export class HuiActionEditor extends LitElement {
  public config?: ActionConfig;
  public label?: string;
  protected hass?: HomeAssistant;

  static get properties(): PropertyDeclarations {
    return { hass: {}, config: {} };
  }

  get _action(): string {
    return this.config!.action || "";
  }

  get _navigation_path(): string {
    const config = this.config! as NavigateActionConfig;
    return config.navigation_path || "";
  }

  get _service(): string {
    const config = this.config! as CallServiceActionConfig;
    return config.service || "";
  }

  get _service_data(): { [key: string]: any } {
    const config = this.config! as CallServiceActionConfig;
    return config.service_data || {};
  }

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }
    const actions = ["more-info", "toggle", "navigate", "call-service", "none"];
    return html`
      ${configElementStyle} ${this.renderStyle()}
      <paper-dropdown-menu
        .label="${this.label}"
        .configValue="${"action"}"
        @value-changed="${this._valueChanged}"
      >
        <paper-listbox
          slot="dropdown-content"
          .selected="${actions.indexOf(this._action)}"
        >
          ${
            actions.map((action) => {
              return html`
                <paper-item>${action}</paper-item>
              `;
            })
          }
        </paper-listbox>
      </paper-dropdown-menu>
      ${
        this._action === "navigate"
          ? html`
              <paper-input
                label="Navigation Path"
                .value="${this._navigation_path}"
                .configValue="${"navigation_path"}"
                @value-changed="${this._valueChanged}"
              ></paper-input>
            `
          : ""
      }
      ${
        this.config && this.config.action === "call-service"
          ? html`
              <ha-service-picker
                .hass="${this.hass}"
                .value="${this._service}"
                .configValue="${"service"}"
                @change="${this._valueChanged}"
              ></ha-service-picker>
              <h3>Service Data</h3>
              <div class="side-by-side">
                <paper-input id="keyInput" label="Key"></paper-input>
                <paper-input id="valueInput" label="Value"></paper-input>
              </div>
              <paper-button
                @click="${this._addData}"
                .configValue="${"service_data"}"
                >Add Data
              </paper-button>
            `
          : ""
      }
    `;
  }

  private _key(): PaperInputElement {
    return this.shadowRoot!.getElementById("keyInput") as PaperInputElement;
  }

  private _value(): PaperInputElement {
    return this.shadowRoot!.getElementById("valueInput") as PaperInputElement;
  }

  private _addData(ev: Event): void {
    if (!this.hass) {
      return;
    }
    const target = ev.target! as EditorTarget;
    if (!this._key().value || !this._value().value) {
      return;
    }
    const data = this._service_data;
    data[this._key().value!] = this._value().value;
    if (this.config && this.config[this[`${target.configValue}`]] === data) {
      return;
    }
    if (target.configValue) {
      this.config = { ...this.config!, [target.configValue]: data };
      fireEvent(this, "action-changed");
    }
    this._key().value = "";
    this._value().value = "";
  }

  private _valueChanged(ev: Event): void {
    if (!this.hass) {
      return;
    }
    const target = ev.target! as EditorTarget;
    if (
      this.config &&
      this.config[this[`${target.configValue}`]] === target.value
    ) {
      return;
    }
    if (target.configValue) {
      this.config = { ...this.config!, [target.configValue]: target.value };
      fireEvent(this, "action-changed");
    }
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        paper-textarea {
          --paper-input-container-shared-input-style_-_font-family: monospace;
        }
      </style>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-action-editor": HuiActionEditor;
  }
}

customElements.define("hui-action-editor", HuiActionEditor);
