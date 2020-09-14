import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-input/paper-textarea";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import { PaperListboxElement } from "@polymer/paper-listbox/paper-listbox";
import {
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-service-picker";
import {
  ActionConfig,
  CallServiceActionConfig,
  NavigateActionConfig,
  UrlActionConfig,
} from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";
import { EditorTarget } from "../editor/types";

@customElement("hui-action-editor")
export class HuiActionEditor extends LitElement {
  @property() public config?: ActionConfig;

  @property() public label?: string;

  @property() public actions?: string[];

  @property() protected hass?: HomeAssistant;

  get _navigation_path(): string {
    const config = this.config as NavigateActionConfig;
    return config.navigation_path || "";
  }

  get _url_path(): string {
    const config = this.config as UrlActionConfig;
    return config.url_path || "";
  }

  get _service(): string {
    const config = this.config as CallServiceActionConfig;
    return config.service || "";
  }

  protected render(): TemplateResult {
    if (!this.hass || !this.actions) {
      return html``;
    }

    return html`
      <paper-dropdown-menu
        .label="${this.label}"
        .configValue="${"action"}"
        @iron-select="${this._actionPicked}"
      >
        <paper-listbox
          slot="dropdown-content"
          attr-for-selected="value"
          .selected=${this.config?.action ?? "default"}
        >
          <paper-item .value=${"default"}>Default action</paper-item>
          ${this.actions.map((action) => {
            return html`<paper-item .value=${action}>${action}</paper-item>`;
          })}
        </paper-listbox>
      </paper-dropdown-menu>
      ${this.config?.action === "navigate"
        ? html`
            <paper-input
              label="Navigation Path"
              .value="${this._navigation_path}"
              .configValue="${"navigation_path"}"
              @value-changed="${this._valueChanged}"
            ></paper-input>
          `
        : ""}
      ${this.config?.action === "url"
        ? html`
            <paper-input
              label="Url Path"
              .value="${this._url_path}"
              .configValue="${"url_path"}"
              @value-changed="${this._valueChanged}"
            ></paper-input>
          `
        : ""}
      ${this.config?.action === "call-service"
        ? html`
            <ha-service-picker
              .hass=${this.hass}
              .value="${this._service}"
              .configValue="${"service"}"
              @value-changed="${this._valueChanged}"
            ></ha-service-picker>
            <b>Service data can only be entered in the code editor</b>
          `
        : ""}
    `;
  }

  private _actionPicked(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this.hass) {
      return;
    }
    const item = ev.detail.item;
    const value = item.value;
    if (this.config?.action === value) {
      return;
    }
    if (value === "default") {
      fireEvent(this, "value-changed", { value: undefined });
      if (this.config?.action) {
        (this.shadowRoot!.querySelector(
          "paper-listbox"
        ) as PaperListboxElement).select(this.config.action);
      }
      return;
    }
    fireEvent(this, "value-changed", {
      value: { action: value },
    });
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this.hass) {
      return;
    }
    const target = ev.target! as EditorTarget;
    const value = ev.detail.value;
    if (this[`_${target.configValue}`] === value) {
      return;
    }
    if (target.configValue) {
      fireEvent(this, "value-changed", {
        value: { ...this.config!, [target.configValue!]: value },
      });
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-action-editor": HuiActionEditor;
  }
}
