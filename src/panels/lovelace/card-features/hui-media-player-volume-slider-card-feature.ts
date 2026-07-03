import { consume } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  consumeEntityState,
  consumeLocalize,
} from "../../../common/decorators/consume-context-entry";
import { transform } from "../../../common/decorators/transform";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateActive } from "../../../common/entity/state_active";
import { supportsFeature } from "../../../common/entity/supports-feature";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-control-slider";
import { apiContext, internationalizationContext } from "../../../data/context";
import { UNAVAILABLE } from "../../../data/entity/entity";
import {
  MediaPlayerEntityFeature,
  type MediaPlayerEntity,
} from "../../../data/media-player";
import type { FrontendLocaleData } from "../../../data/translation";
import type {
  HomeAssistant,
  HomeAssistantApi,
  HomeAssistantInternationalization,
} from "../../../types";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import {
  renderMuteButton,
  toggleMediaPlayerMute,
} from "./common/media-player-mute-button";
import type {
  LovelaceCardFeatureContext,
  MediaPlayerVolumeSliderCardFeatureConfig,
} from "./types";

const supportsMediaPlayerVolumeSliderCardFeatureFromState = (
  stateObj: HassEntity
) => {
  const domain = computeDomain(stateObj.entity_id);
  return (
    domain === "media_player" &&
    supportsFeature(stateObj, MediaPlayerEntityFeature.VOLUME_SET)
  );
};

export const supportsMediaPlayerVolumeSliderCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  return supportsMediaPlayerVolumeSliderCardFeatureFromState(stateObj);
};

@customElement("hui-media-player-volume-slider-card-feature")
class HuiMediaPlayerVolumeSliderCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state()
  @consumeEntityState({ entityIdPath: ["context", "entity_id"] })
  private _stateObj?: MediaPlayerEntity;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  @transform<HomeAssistantInternationalization, FrontendLocaleData>({
    transformer: ({ locale }) => locale,
  })
  private _locale?: FrontendLocaleData;

  @state() private _config?: MediaPlayerVolumeSliderCardFeatureConfig;

  static getStubConfig(): MediaPlayerVolumeSliderCardFeatureConfig {
    return {
      type: "media-player-volume-slider",
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import("../editor/config-elements/hui-media-player-volume-slider-card-feature-editor");
    return document.createElement(
      "hui-media-player-volume-slider-card-feature-editor"
    );
  }

  public setConfig(config: MediaPlayerVolumeSliderCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected render() {
    if (
      !this._config ||
      !this.context ||
      !this._stateObj ||
      !supportsMediaPlayerVolumeSliderCardFeatureFromState(this._stateObj)
    ) {
      return nothing;
    }

    const stateObj = this._stateObj;
    const disabled = stateObj.state === UNAVAILABLE;

    const position =
      stateObj.attributes.volume_level != null
        ? Math.round(stateObj.attributes.volume_level * 100)
        : undefined;

    return html`
      <ha-control-slider
        .value=${position}
        min="0"
        max="100"
        .showHandle=${stateActive(stateObj)}
        .disabled=${disabled}
        @value-changed=${this._valueChanged}
        unit="%"
        .locale=${this._locale}
      ></ha-control-slider>
      ${renderMuteButton(
        this._localize,
        stateObj,
        this._config.show_mute_button,
        disabled,
        this._toggleMute
      )}
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value;

    this._api.callService("media_player", "volume_set", {
      entity_id: this._stateObj!.entity_id,
      volume_level: value / 100,
    });
  }

  private _toggleMute = (ev: Event) => {
    toggleMediaPlayerMute(ev, this._api!.callService, this._stateObj!, this);
  };

  static get styles() {
    return [
      cardFeatureStyles,
      css`
        :host {
          display: flex;
          flex-direction: row;
          gap: var(--feature-button-spacing);
        }
        ha-control-slider {
          flex: 1;
          min-width: 0;
        }
        .mute {
          width: var(--feature-height);
          height: var(--feature-height);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-media-player-volume-slider-card-feature": HuiMediaPlayerVolumeSliderCardFeature;
  }
}
