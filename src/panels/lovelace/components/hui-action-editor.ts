import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-input/paper-textarea";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import type { PaperListboxElement } from "@polymer/paper-listbox/paper-listbox";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-help-tooltip";
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

  @property() public tooltipText?: string;

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
      <div class="dropdown">
        <paper-dropdown-menu
          .label=${this.label}
          .configValue=${"action"}
          @iron-select=${this._actionPicked}
        >
          <paper-listbox
            slot="dropdown-content"
            attr-for-selected="value"
            .selected=${this.config?.action ?? "default"}
          >
            <paper-item .value=${"default"}
              >${this.hass!.localize(
                "ui.panel.lovelace.editor.action-editor.actions.default_action"
              )}</paper-item
            >
            ${this.actions.map((action) => {
              return html`
                <paper-item .value=${action}
                  >${this.hass!.localize(
                    `ui.panel.lovelace.editor.action-editor.actions.${action}`
                  )}</paper-item
                >
              `;
            })}
          </paper-listbox>
        </paper-dropdown-menu>
        ${this.tooltipText
          ? html`
              <ha-help-tooltip .label=${this.tooltipText}></ha-help-tooltip>
            `
          : ""}
      </div>
      ${this.config?.action === "navigate"
        ? html`
            <paper-input
              label=${this.hass!.localize(
                "ui.panel.lovelace.editor.action-editor.navigation_path"
              )}
              .value=${this._navigation_path}
              .configValue=${"navigation_path"}
              @value-changed=${this._valueChanged}
            ></paper-input>
          `
        : ""}
      ${this.config?.action === "url"
        ? html`
            <paper-input
              label=${this.hass!.localize(
                "ui.panel.lovelace.editor.action-editor.url_path"
              )}
              .value=${this._url_path}
              .configValue=${"url_path"}
              @value-changed=${this._valueChanged}
            ></paper-input>
          `
        : ""}
      ${this.config?.action === "call-service"
        ? html`
            <ha-service-picker
              .hass=${this.hass}
              .value=${this._service}
              .configValue=${"service"}
              @value-changed=${this._valueChanged}
            ></ha-service-picker>
            <b>
              ${this.hass!.localize(
                "ui.panel.lovelace.editor.action-editor.editor_service_data"
              )}
            </b>
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

  static get styles(): CSSResult {
    return css`
      .dropdown {
        display: flex;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-action-editor": HuiActionEditor;
  }
}
