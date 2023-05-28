import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { InputSelectEntity } from "../../../data/input_select";
import { ControlSelectOption } from "../../../components/ha-control-select";
import { HomeAssistant } from "../../../types";
import { LovelaceTileFeature, LovelaceTileFeatureEditor } from "../types";
import { InputSelectOptionsFeatureConfig } from "./types";

export const supportsInputSelectOptionsTileFeature = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return domain === "input_select";
};

@customElement("hui-input_select-options-tile-feature")
class HuiInputSelectOptionsTileFeature
  extends LitElement
  implements LovelaceTileFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: InputSelectEntity;

  @state() private _config?: InputSelectOptionsFeatureConfig;

  static getStubConfig(
    _,
    stateObj?: HassEntity
  ): InputSelectOptionsFeatureConfig {
    return {
      type: "input_select-options",
      options: stateObj ? stateObj.attributes.options : [],
    };
  }

  public static async getConfigElement(): Promise<LovelaceTileFeatureEditor> {
    await import(
      "../editor/config-elements/hui-input_select-options-tile-feature-editor"
    );
    return document.createElement(
      "hui-input_select-options-tile-feature-editor"
    );
  }

  public setConfig(config: InputSelectOptionsFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.stateObj ||
      !supportsInputSelectOptionsTileFeature(this.stateObj)
    ) {
      return nothing;
    }

    const options = this.stateObj.attributes.options
      .filter(
        (option) =>
          this._config?.options?.includes(option) ||
          this._config?.options === undefined ||
          this._config?.options?.length === 0
      )
      .map<ControlSelectOption>((key) => ({
        value: key,
        label: key,
      }));
    const value = this.stateObj.state;

    return html`
      <div class="container">
        <ha-control-select
          .options=${options}
          .value=${value}
          @value-changed=${this._valueChanged}
          .ariaLabel=${options}
        ></ha-control-select>
      </div>
    `;
  }

  private async _valueChanged(ev: CustomEvent) {
    const value = (ev.detail as any).value as string;

    this.hass!.callService("input_select", "select_option", {
      entity_id: this.stateObj!.entity_id,
      option: value,
    });
  }

  static get styles() {
    return css`
      ha-control-select {
        --control-select-color: var(--tile-color);
        --control-select-padding: 0;
        --control-select-thickness: 40px;
        --control-select-border-radius: 10px;
        --control-select-button-border-radius: 10px;
      }
      .container {
        padding: 0 12px 12px 12px;
        width: auto;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-input_select-tile-feature": HuiInputSelectOptionsTileFeature;
  }
}
