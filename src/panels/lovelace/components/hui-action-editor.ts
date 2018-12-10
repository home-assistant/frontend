import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";

import "../../../components/ha-service-picker";

import { HomeAssistant } from "../../../types";
import { fireEvent, HASSDomEvent } from "../../../common/dom/fire_event";
import { EditorTarget } from "../editor/types";
import { ActionConfig } from "../../../data/lovelace";

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
    return this.config!.navigation_path || ""; // TODO Why is this only seeing ToggleActionConfig?
  }

  get _service(): string {
    return this.config!.service || ""; // TODO Why is this only seeing ToggleActionConfig?
  }

  get _service_data(): { [key: string]: any } {
    return {}; // TODO Need advice on how to handle this free-form data
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
        dynamic-align
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
                value="${this._navigation_path}"
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
                @on-change="${this._valueChanged}"
              ></ha-service-picker>
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
      this.config = { ...this.config!, [target.configValue!]: target.value };
      fireEvent(this, "action-changed");
    }
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        .entities {
          padding-left: 20px;
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
