import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import "../../../components/ha-help-tooltip";
import "../../../components/ha-service-control";
import {
  ActionConfig,
  CallServiceActionConfig,
  NavigateActionConfig,
  UrlActionConfig,
} from "../../../data/lovelace";
import { ServiceAction } from "../../../data/script";
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
    const config = this.config as NavigateActionConfig | undefined;
    return config?.navigation_path || "";
  }

  get _url_path(): string {
    const config = this.config as UrlActionConfig | undefined;
    return config?.url_path || "";
  }

  get _service(): string {
    const config = this.config as CallServiceActionConfig;
    return config?.service || "";
  }

  private _serviceAction = memoizeOne(
    (config: CallServiceActionConfig): ServiceAction => ({
      service: this._service,
      data: config.data ?? config.service_data,
      target: config.target,
    })
  );

  protected render(): TemplateResult {
    if (!this.hass || !this.actions) {
      return html``;
    }

    return html`
      <div class="dropdown">
        <ha-select
          .label=${this.label}
          .configValue=${"action"}
          @selected=${this._actionPicked}
          .value=${this.config?.action ?? "default"}
          @closed=${stopPropagation}
          fixedMenuPosition
          naturalMenuWidt
        >
          <mwc-list-item value="default">
            ${this.hass!.localize(
              "ui.panel.lovelace.editor.action-editor.actions.default_action"
            )}
          </mwc-list-item>
          ${this.actions.map(
            (action) => html`
              <mwc-list-item .value=${action}>
                ${this.hass!.localize(
                  `ui.panel.lovelace.editor.action-editor.actions.${action}`
                )}
              </mwc-list-item>
            `
          )}
        </ha-select>
        ${this.tooltipText
          ? html`
              <ha-help-tooltip .label=${this.tooltipText}></ha-help-tooltip>
            `
          : ""}
      </div>
      ${this.config?.action === "navigate"
        ? html`
            <ha-textfield
              label=${this.hass!.localize(
                "ui.panel.lovelace.editor.action-editor.navigation_path"
              )}
              .value=${this._navigation_path}
              .configValue=${"navigation_path"}
              @input=${this._valueChanged}
            ></ha-textfield>
          `
        : ""}
      ${this.config?.action === "url"
        ? html`
            <ha-textfield
              .label=${this.hass!.localize(
                "ui.panel.lovelace.editor.action-editor.url_path"
              )}
              .value=${this._url_path}
              .configValue=${"url_path"}
              @input=${this._valueChanged}
            ></ha-textfield>
          `
        : ""}
      ${this.config?.action === "call-service"
        ? html`
            <ha-service-control
              .hass=${this.hass}
              .value=${this._serviceAction(this.config)}
              .showAdvanced=${this.hass.userData?.showAdvanced}
              narrow
              @value-changed=${this._serviceValueChanged}
            ></ha-service-control>
          `
        : ""}
    `;
  }

  private _actionPicked(ev): void {
    ev.stopPropagation();
    if (!this.hass) {
      return;
    }
    const value = ev.target.value;
    if (this.config?.action === value) {
      return;
    }
    if (value === "default") {
      fireEvent(this, "value-changed", { value: undefined });
      return;
    }

    let data;
    switch (value) {
      case "url": {
        data = { url_path: this._url_path };
        break;
      }
      case "call-service": {
        data = { service: this._service };
        break;
      }
      case "navigate": {
        data = { navigation_path: this._navigation_path };
        break;
      }
    }

    fireEvent(this, "value-changed", {
      value: { action: value, ...data },
    });
  }

  private _valueChanged(ev): void {
    ev.stopPropagation();
    if (!this.hass) {
      return;
    }
    const target = ev.target! as EditorTarget;
    const value = ev.target.value;
    if (this[`_${target.configValue}`] === value) {
      return;
    }
    if (target.configValue) {
      fireEvent(this, "value-changed", {
        value: { ...this.config!, [target.configValue!]: value },
      });
    }
  }

  private _serviceValueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = {
      ...this.config!,
      service: ev.detail.value.service || "",
      data: ev.detail.value.data || {},
      target: ev.detail.value.target || {},
    };
    // "service_data" is allowed for backwards compatibility but replaced with "data" on write
    if ("service_data" in value) {
      delete value.service_data;
    }

    fireEvent(this, "value-changed", { value });
  }

  static get styles(): CSSResultGroup {
    return css`
      .dropdown {
        position: relative;
      }
      ha-help-tooltip {
        position: absolute;
        right: 40px;
        top: 16px;
        inset-inline-start: initial;
        inset-inline-end: 40px;
        direction: var(--direction);
      }
      ha-select,
      ha-textfield {
        width: 100%;
      }
      ha-textfield {
        margin-top: 8px;
      }
      ha-service-control {
        --service-control-padding: 0;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-action-editor": HuiActionEditor;
  }
}
