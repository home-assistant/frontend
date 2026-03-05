import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeCssColor } from "../../../common/color/compute-color";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateColorCss } from "../../../common/entity/state_color";
import "../../../components/ha-control-select";
import type { CoverEntity } from "../../../data/cover";
import {
  DEFAULT_COVER_FAVORITE_POSITIONS,
  coverSupportsPosition,
} from "../../../data/cover";
import { UNAVAILABLE } from "../../../data/entity/entity";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  CoverPositionPresetCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

export const DEFAULT_COVER_POSITION_PRESETS = DEFAULT_COVER_FAVORITE_POSITIONS;

export const supportsCoverPositionPresetCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  const domain = computeDomain(stateObj.entity_id);
  return domain === "cover" && coverSupportsPosition(stateObj);
};

@customElement("hui-cover-position-preset-card-feature")
class HuiCoverPositionPresetCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @property({ attribute: false }) public color?: string;

  @state() private _config?: CoverPositionPresetCardFeatureConfig;

  @state() private _currentPosition?: number;

  private get _stateObj(): CoverEntity | undefined {
    if (!this.hass || !this.context || !this.context.entity_id) {
      return undefined;
    }
    return this.hass.states[this.context.entity_id!];
  }

  static getStubConfig(): CoverPositionPresetCardFeatureConfig {
    return {
      type: "cover-position-preset",
      positions: DEFAULT_COVER_POSITION_PRESETS,
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import("../editor/config-elements/hui-cover-position-preset-card-feature-editor");
    return document.createElement(
      "hui-cover-position-preset-card-feature-editor"
    );
  }

  public setConfig(config: CoverPositionPresetCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected willUpdate(changedProp: PropertyValues): void {
    super.willUpdate(changedProp);
    if (
      (changedProp.has("hass") || changedProp.has("context")) &&
      this._stateObj
    ) {
      const oldHass = changedProp.get("hass") as HomeAssistant | undefined;
      const oldStateObj = oldHass?.states[this.context!.entity_id!];
      if (oldStateObj !== this._stateObj) {
        this._currentPosition =
          this._stateObj.attributes.current_position ?? undefined;
      }
    }
  }

  private async _valueChanged(
    ev: CustomEvent<{ value?: string; item?: { value: string } }>
  ) {
    const value = ev.detail.value ?? ev.detail.item?.value;
    if (value == null) return;

    const position = Number(value);
    if (isNaN(position)) return;

    const oldPosition = this._stateObj!.attributes.current_position;
    if (position === oldPosition) return;

    this._currentPosition = position;
    try {
      await this.hass!.callService("cover", "set_cover_position", {
        entity_id: this._stateObj!.entity_id,
        position: position,
      });
    } catch (_err) {
      this._currentPosition = oldPosition ?? undefined;
    }
  }

  protected render(): TemplateResult | null {
    if (
      !this._config ||
      !this.hass ||
      !this.context ||
      !this._stateObj ||
      !supportsCoverPositionPresetCardFeature(this.hass, this.context)
    ) {
      return null;
    }

    const positions = this._config.positions ?? DEFAULT_COVER_POSITION_PRESETS;

    const options = positions.map((position) => ({
      value: String(position),
      label: `${position}%`,
    }));

    const currentValue =
      this._currentPosition != null ? String(this._currentPosition) : undefined;

    const color = this.color
      ? computeCssColor(this.color)
      : stateColorCss(this._stateObj);

    const style = {
      "--feature-color": color,
    };

    return html`
      <ha-control-select
        style=${styleMap(style)}
        .options=${options}
        .value=${currentValue}
        @value-changed=${this._valueChanged}
        .label=${this.hass.localize(
          "ui.panel.lovelace.editor.features.types.cover-position-preset.label"
        )}
        .disabled=${this._stateObj!.state === UNAVAILABLE}
      >
      </ha-control-select>
    `;
  }

  static get styles() {
    return cardFeatureStyles;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-cover-position-preset-card-feature": HuiCoverPositionPresetCardFeature;
  }
}
