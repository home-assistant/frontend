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

  get _service_data(): string {
    const config = this.config! as CallServiceActionConfig;
    return JSON.stringify(config.service_data) || "{}";
  }

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }
    const actions = ["more-info", "toggle", "navigate", "call-service", "none"];
    return html`
      ${this.renderStyle()}
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
              <paper-textarea
                max-rows="10"
                .value="${this._service_data}"
                .configValue="${"service_data"}"
                @value-changed="${this._valueChanged}"
              ></paper-textarea>
            `
          : ""
      }
    `;
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
      let value: any = target.value;
      if (target.configValue === "service_data") {
        value = JSON.parse(value);
      }
      this.config = { ...this.config!, [target.configValue!]: target.value };
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
