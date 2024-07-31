import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { any, assert, enums, object, optional, string } from "superstruct";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../../components/ha-form/types";
import "../../../../../components/ha-service-control";
import { ServiceAction } from "../../../../../data/script";
import type { HomeAssistant } from "../../../../../types";
import { ServiceButtonElementConfig } from "../../../elements/types";
import { LovelacePictureElementEditor } from "../../../types";

const serviceButtonElementConfigStruct = object({
  type: enums(["service-button", "action-button"]),
  style: optional(any()),
  title: optional(string()),
  action: optional(string()),
  service: optional(string()),
  service_data: optional(any()),
  data: optional(any()),
  target: optional(any()),
});

const SCHEMA = [
  { name: "title", required: true, selector: { text: {} } },
  { name: "style", selector: { object: {} } },
] as const;

@customElement("hui-service-button-element-editor")
export class HuiServiceButtonElementEditor
  extends LitElement
  implements LovelacePictureElementEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: ServiceButtonElementConfig;

  public setConfig(config: ServiceButtonElementConfig): void {
    assert(config, serviceButtonElementConfigStruct);
    this._config = config;
  }

  private _serviceData = memoizeOne(
    (config: ServiceButtonElementConfig): ServiceAction => ({
      action: config?.action ?? config?.service,
      data: config?.data ?? config?.service_data,
      target: config?.target,
    })
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${SCHEMA}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
      <ha-service-control
        .hass=${this.hass}
        .value=${this._serviceData(this._config)}
        .showAdvanced=${this.hass.userData?.showAdvanced}
        narrow
        @value-changed=${this._serviceDataChanged}
      ></ha-service-control>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    fireEvent(this, "config-changed", {
      config: { ...this._config, ...ev.detail.value },
    });
  }

  private _serviceDataChanged(ev: CustomEvent<{ value: ServiceAction }>): void {
    const config: ServiceButtonElementConfig = {
      ...this._config!,
      action: ev.detail.value.action,
      data: ev.detail.value.data,
      target: ev.detail.value.target,
    };

    if ("service" in config) {
      delete config.service;
    }

    if ("service_data" in config) {
      delete config.service_data;
    }

    fireEvent(this, "config-changed", {
      config,
    });
  }

  private _computeLabelCallback = (schema: SchemaUnion<typeof SCHEMA>) =>
    this.hass!.localize(
      `ui.panel.lovelace.editor.card.generic.${schema.name}`
    ) ||
    this.hass!.localize(`ui.panel.lovelace.editor.elements.${schema.name}`) ||
    schema.name;

  static get styles() {
    return css`
      ha-service-control {
        display: block;
        margin-top: 16px;
        --service-control-padding: 0;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-service-button-element-editor": HuiServiceButtonElementEditor;
  }
}
