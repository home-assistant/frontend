import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import "../../../components/buttons/ha-call-service-button";
import { HomeAssistant } from "../../../types";
import { LovelaceElement, ServiceButtonElementConfig } from "./types";
import { LovelacePictureElementEditor } from "../types";

@customElement("hui-service-button-element")
export class HuiServiceButtonElement
  extends LitElement
  implements LovelaceElement
{
  public static async getConfigElement(): Promise<LovelacePictureElementEditor> {
    await import(
      "../editor/config-elements/elements/hui-service-button-element-editor"
    );
    return document.createElement("hui-service-button-element-editor");
  }

  public static getStubConfig(hass: HomeAssistant): ServiceButtonElementConfig {
    return {
      type: "action-button",
      action: "homeassistant.turn_on",
      title: hass.localize("ui.card.common.turn_on"),
    };
  }

  public hass?: HomeAssistant;

  @state() private _config?: ServiceButtonElementConfig;

  private _domain?: string;

  private _service?: string;

  public setConfig(config: ServiceButtonElementConfig): void {
    if (!config || (!config.action && !config.service)) {
      throw Error("Action required");
    }

    [this._domain, this._service] = (config.action ?? config.service)!.split(
      ".",
      2
    );

    if (!this._domain) {
      throw Error("Action does not have a domain");
    }

    if (!this._service) {
      throw Error("Action does not have a action name");
    }

    this._config = config;
  }

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }

    const { entity_id, label_id, floor_id, device_id, area_id } =
      this._config.service_data ?? this._config.data ?? {};
    const updatedTarget = this._config.target ?? {
      entity_id,
      label_id,
      floor_id,
      device_id,
      area_id,
    };

    return html`
      <ha-call-service-button
        .hass=${this.hass}
        .domain=${this._domain}
        .service=${this._service}
        .data=${this._config.data ?? this._config.service_data}
        .target=${updatedTarget}
      >
        ${this._config.title}
      </ha-call-service-button>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-call-service-button {
        color: var(--primary-color);
        white-space: nowrap;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-service-button-element": HuiServiceButtonElement;
  }
}
