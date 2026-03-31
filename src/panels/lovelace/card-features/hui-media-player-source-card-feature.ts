import type { PropertyValues } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import type { HaDropdownSelectEvent } from "../../../components/ha-dropdown";
import "../../../components/ha-control-select-menu";
import { UNAVAILABLE } from "../../../data/entity/entity";
import {
  MediaPlayerEntityFeature,
  type MediaPlayerEntity,
} from "../../../data/media-player";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  LovelaceCardFeatureContext,
  MediaPlayerSourceCardFeatureConfig,
} from "./types";

export const supportsMediaPlayerSourceCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  const domain = computeDomain(stateObj.entity_id);
  return (
    domain === "media_player" &&
    supportsFeature(stateObj, MediaPlayerEntityFeature.SELECT_SOURCE) &&
    !!stateObj.attributes.source_list?.length
  );
};

@customElement("hui-media-player-source-card-feature")
class HuiMediaPlayerSourceCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: MediaPlayerSourceCardFeatureConfig;

  @state() private _currentSource?: string;

  private get _stateObj() {
    if (!this.hass || !this.context || !this.context.entity_id) {
      return undefined;
    }
    return this.hass.states[this.context.entity_id!] as
      | MediaPlayerEntity
      | undefined;
  }

  static getStubConfig(): MediaPlayerSourceCardFeatureConfig {
    return {
      type: "media-player-source",
    };
  }

  public setConfig(config: MediaPlayerSourceCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (
      (changedProps.has("hass") || changedProps.has("context")) &&
      this._stateObj
    ) {
      const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
      const oldStateObj = oldHass?.states[this.context!.entity_id!];
      if (oldStateObj !== this._stateObj) {
        this._currentSource = this._stateObj.attributes.source;
      }
    }
  }

  private async _valueChanged(ev: HaDropdownSelectEvent) {
    const source = ev.detail.item?.value;
    const oldSource = this._stateObj!.attributes.source;

    if (source === oldSource || !source) {
      return;
    }

    this._currentSource = source;

    try {
      await this.hass!.callService("media_player", "select_source", {
        entity_id: this._stateObj!.entity_id,
        source: source,
      });
    } catch (_err) {
      this._currentSource = oldSource;
    }
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.context ||
      !this._stateObj ||
      !supportsMediaPlayerSourceCardFeature(this.hass, this.context)
    ) {
      return nothing;
    }

    const options = this._stateObj.attributes.source_list!.map((source) => ({
      value: source,
      label: this.hass!.formatEntityAttributeValue(
        this._stateObj!,
        "source",
        source
      ),
    }));

    return html`
      <ha-control-select-menu
        show-arrow
        .label=${this.hass.localize("ui.card.media_player.source")}
        .value=${this._currentSource}
        .disabled=${this._stateObj.state === UNAVAILABLE}
        .options=${options}
        @wa-select=${this._valueChanged}
      >
      </ha-control-select-menu>
    `;
  }

  static get styles() {
    return cardFeatureStyles;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-media-player-source-card-feature": HuiMediaPlayerSourceCardFeature;
  }
}
