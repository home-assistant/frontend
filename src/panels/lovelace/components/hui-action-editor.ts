import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-input/paper-textarea";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
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
  @property({ attribute: false }) public config?: ActionConfig;

  @property({ attribute: false }) public label?: string;

  @property({ attribute: false }) public actions?: string[];

  @property({ attribute: false }) protected hass?: HomeAssistant;

  get _action(): string {
    return this.config?.action || "";
  }

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
      <paper-dropdown-menu .label=${this.label}>
        <paper-listbox
          slot="dropdown-content"
          attr-for-selected="item-value"
          .configValue=${"action"}
          .selected=${this._action}
          @iron-select=${this._valueChanged}
        >
          <paper-item></paper-item>
          ${this.actions.map((action) => {
            return html`
              <paper-item .itemValue=${action}>${action}</paper-item>
            `;
          })}
        </paper-listbox>
      </paper-dropdown-menu>
      ${this._action === "navigate"
        ? html`
            <paper-input
              label="Navigation Path"
              .value=${this._navigation_path}
              .configValue=${"navigation_path"}
              @value-changed=${this._valueChanged}
            ></paper-input>
          `
        : ""}
      ${this._action === "url"
        ? html`
            <paper-input
              label="Url Path"
              .value=${this._url_path}
              .configValue=${"url_path"}
              @value-changed=${this._valueChanged}
            ></paper-input>
          `
        : ""}
      ${this.config && this.config.action === "call-service"
        ? html`
            <ha-service-picker
              .hass=${this.hass}
              .value=${this._service}
              .configValue=${"service"}
              @value-changed=${this._valueChanged}
            ></ha-service-picker>
            <b>Service data can only be entered in the code editor</b>
          `
        : ""}
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this.hass || !ev.detail.item?.itemValue) {
      return;
    }

    const target = ev.target! as EditorTarget;

    if (this[`_${target.configValue}`] === ev.detail.item.itemValue) {
      return;
    }

    if (target.configValue) {
      const newConfig =
        target.configValue === "action"
          ? { action: ev.detail.item.itemValue }
          : {
              ...this.config!,
              [target.configValue!]: ev.detail.item.itemValue,
            };
      fireEvent(this, "value-changed", { value: newConfig });
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-action-editor": HuiActionEditor;
  }
}
