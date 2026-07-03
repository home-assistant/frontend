import { consume } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  consumeEntityState,
  consumeLocalize,
} from "../../../common/decorators/consume-context-entry";
import { computeDomain } from "../../../common/entity/compute_domain";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import { apiContext } from "../../../data/context";
import type {
  ControlButton,
  MediaPlayerEntity,
} from "../../../data/media-player";
import type { HomeAssistant, HomeAssistantApi } from "../../../types";
import { hasConfigChanged } from "../common/has-changed";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import {
  computeMediaPlayerPlaybackButtons,
  getDefaultMediaPlayerControls,
} from "./media-player-playback-controls";
import type {
  LovelaceCardFeatureContext,
  MediaPlayerPlaybackCardFeatureConfig,
} from "./types";

const supportsMediaPlayerPlaybackCardFeatureFromState = (
  stateObj: HassEntity
) => {
  const domain = computeDomain(stateObj.entity_id);
  return domain === "media_player";
};

export const supportsMediaPlayerPlaybackCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  return supportsMediaPlayerPlaybackCardFeatureFromState(stateObj);
};

@customElement("hui-media-player-playback-card-feature")
class HuiMediaPlayerPlaybackCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @property({ attribute: false }) public color?: string;

  @state()
  @consumeEntityState({ entityIdPath: ["context", "entity_id"] })
  private _stateObj?: MediaPlayerEntity;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  @state() private _config?: MediaPlayerPlaybackCardFeatureConfig;

  @state() private _narrow?: boolean = false;

  static getStubConfig(): MediaPlayerPlaybackCardFeatureConfig {
    return {
      type: "media-player-playback",
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import("../editor/config-elements/hui-media-player-playback-card-feature-editor");
    return document.createElement(
      "hui-media-player-playback-card-feature-editor"
    );
  }

  public setConfig(config: MediaPlayerPlaybackCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  public willUpdate(): void {
    if (!this.hasUpdated) {
      this._measureCard();
    }
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return (
      hasConfigChanged(this, changedProps) || changedProps.has("_stateObj")
    );
  }

  protected render() {
    if (
      !this._config ||
      !this.context ||
      !this._stateObj ||
      !supportsMediaPlayerPlaybackCardFeatureFromState(this._stateObj)
    ) {
      return nothing;
    }

    const buttons = this._computeButtons(this._stateObj);

    return html`
      <ha-control-button-group>
        ${buttons.map(
          (button) => html`
            <ha-control-button
              key=${button.action}
              .label=${this._localize(`ui.card.media_player.${button.action}`)}
              .disabled=${button.disabled}
              @click=${this._action}
            >
              <ha-svg-icon .path=${button.icon}></ha-svg-icon>
            </ha-control-button>
          `
        )}
      </ha-control-button-group>
    `;
  }

  private _measureCard() {
    if (!this.isConnected) {
      return;
    }
    const host = (this.getRootNode() as ShadowRoot).host as
      HTMLElement | undefined;
    const width = host?.clientWidth ?? this.clientWidth ?? 0;
    this._narrow = width < 200;
  }

  private _computeButtons(stateObj: MediaPlayerEntity): ControlButton[] {
    const buttons = computeMediaPlayerPlaybackButtons(
      stateObj,
      this._config?.controls ?? getDefaultMediaPlayerControls(stateObj)
    );
    // Disabled controls are rendered greyed out, or hidden when configured to.
    return this._filterNarrow(
      this._config?.hide_disabled_controls
        ? buttons.filter((button) => !button.disabled)
        : buttons
    );
  }

  private _filterNarrow(buttons: ControlButton[]): ControlButton[] {
    if (this._narrow && buttons.length > 3) {
      return buttons.filter(
        (b) =>
          b.action !== "media_previous_track" && b.action !== "media_next_track"
      );
    }
    return buttons;
  }

  private _action(e: Event): void {
    if (!this._stateObj) return;
    const action = (e.currentTarget as HTMLElement).getAttribute("key");
    if (!action) return;

    if (action === "volume_mute") {
      this._api.callService("media_player", "volume_mute", {
        entity_id: this._stateObj.entity_id,
        is_volume_muted: !this._stateObj.attributes.is_volume_muted,
      });
      return;
    }

    if (action === "shuffle") {
      this._api.callService("media_player", "shuffle_set", {
        entity_id: this._stateObj.entity_id,
        shuffle: !this._stateObj.attributes.shuffle,
      });
      return;
    }

    if (action === "repeat") {
      const repeat = this._stateObj.attributes.repeat ?? "off";
      this._api.callService("media_player", "repeat_set", {
        entity_id: this._stateObj.entity_id,
        repeat: repeat === "off" ? "one" : repeat === "one" ? "all" : "off",
      });
      return;
    }

    this._api.callService("media_player", action, {
      entity_id: this._stateObj.entity_id,
    });
  }

  static styles = [
    cardFeatureStyles,
    css`
      ha-control-button-group {
        overflow: hidden;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-media-player-playback-card-feature": HuiMediaPlayerPlaybackCardFeature;
  }
}
