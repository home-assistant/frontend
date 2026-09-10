import { consume } from "@lit/context";
import { mdiTimerOutline } from "@mdi/js";
import type {
  Connection,
  HassEntity,
  UnsubscribeFunc,
} from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  consumeEntityState,
  consumeLocalize,
} from "../../../common/decorators/consume-context-entry";
import { transform } from "../../../common/decorators/transform";
import type { HASSDomCurrentTargetEvent } from "../../../common/dom/fire_event";
import { computeDomain } from "../../../common/entity/compute_domain";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-control-button";
import type { HaControlButton } from "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import "../../../components/ha-control-select-menu";
import "../../../components/ha-svg-icon";
import {
  apiContext,
  connectionContext,
  internationalizationContext,
} from "../../../data/context";
import { UNAVAILABLE } from "../../../data/entity/entity";
import type { EntityRegistryEntry } from "../../../data/entity/entity_registry";
import { subscribeEntityRegistry } from "../../../data/entity/entity_registry";
import { normalizeTimerPresets, timerPresetLabel } from "../../../data/timer";
import type { FrontendLocaleData } from "../../../data/translation";
import type {
  HomeAssistant,
  HomeAssistantApi,
  HomeAssistantConnection,
  HomeAssistantInternationalization,
} from "../../../types";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  LovelaceCardFeatureContext,
  TimerPresetsCardFeatureConfig,
} from "./types";

const supportsTimerPresetsCardFeatureFromState = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return domain === "timer";
};

export const supportsTimerPresetsCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  return supportsTimerPresetsCardFeatureFromState(stateObj);
};

@customElement("hui-timer-presets-card-feature")
class HuiTimerPresetsCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state()
  @consumeEntityState({ entityIdPath: ["context", "entity_id"] })
  private _stateObj?: HassEntity;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  @state()
  @consume({ context: connectionContext, subscribe: true })
  @transform<HomeAssistantConnection, Connection>({
    transformer: ({ connection }) => connection,
  })
  private _connection?: Connection;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  @transform<HomeAssistantInternationalization, FrontendLocaleData>({
    transformer: ({ locale }) => locale,
  })
  private _locale?: FrontendLocaleData;

  @state() private _config?: TimerPresetsCardFeatureConfig;

  @state() private _entry?: EntityRegistryEntry | null;

  @state() private _presets: number[] = [];

  private _unsubEntityRegistry?: UnsubscribeFunc;

  public connectedCallback() {
    super.connectedCallback();
    this._subscribeEntityEntry();
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribeEntityRegistry();
  }

  private _unsubscribeEntityRegistry() {
    if (this._unsubEntityRegistry) {
      this._unsubEntityRegistry();
      this._unsubEntityRegistry = undefined;
    }
  }

  private _subscribeEntityEntry() {
    if (this._connection && this.context?.entity_id) {
      const id = this.context.entity_id;
      try {
        this._unsubEntityRegistry = subscribeEntityRegistry(
          this._connection,
          (entries) => {
            this._entry = entries.find((e) => e.entity_id === id) ?? null;
          }
        );
      } catch (_e) {
        this._entry = null;
      }
    }
  }

  protected updated(changedProps: PropertyValues): void {
    if (changedProps.has("context") || changedProps.has("_connection")) {
      this._unsubscribeEntityRegistry();
      this._subscribeEntityEntry();
    }

    if (changedProps.has("_entry")) {
      this._presets = normalizeTimerPresets(
        this._entry?.options?.timer?.presets
      );
    }
  }

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import("../editor/config-elements/hui-timer-presets-card-feature-editor");
    return document.createElement("hui-timer-presets-card-feature-editor");
  }

  static getStubConfig(): TimerPresetsCardFeatureConfig {
    return {
      type: "timer-presets",
    };
  }

  public setConfig(config: TimerPresetsCardFeatureConfig): void {
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
      !this._locale ||
      !supportsTimerPresetsCardFeatureFromState(this._stateObj)
    ) {
      return nothing;
    }

    const presets = this._presets;

    if (!presets.length) {
      return nothing;
    }

    if (this._config.style === "dropdown") {
      return html`
        <ha-control-select-menu
          show-arrow
          .label=${this._localize("ui.card.timer.presets")}
          .options=${presets.map((preset) => ({
            value: String(preset),
            label: timerPresetLabel(this._locale!, preset),
          }))}
          .disabled=${this._stateObj.state === UNAVAILABLE}
          @wa-select=${this._onPresetSelect}
        >
          <ha-svg-icon slot="icon" .path=${mdiTimerOutline}></ha-svg-icon>
        </ha-control-select-menu>
      `;
    }

    return html`
      <ha-control-button-group>
        ${presets.map((preset) => {
          const label = timerPresetLabel(this._locale!, preset);
          return html`
            <ha-control-button
              .preset=${preset}
              .label=${this._localize(
                "ui.dialogs.more_info_control.timer.preset.set",
                { value: label }
              )}
              .disabled=${this._stateObj!.state === UNAVAILABLE}
              @click=${this._onPresetTap}
            >
              ${label}
            </ha-control-button>
          `;
        })}
      </ha-control-button-group>
    `;
  }

  private _onPresetTap(
    ev: MouseEvent &
      HASSDomCurrentTargetEvent<HaControlButton & { preset: number }>
  ): void {
    ev.stopPropagation();
    this._startPreset(ev.currentTarget.preset);
  }

  private _onPresetSelect(ev: CustomEvent<{ item?: { value: string } }>): void {
    ev.stopPropagation();
    const value = ev.detail.item?.value;
    if (value === undefined) {
      return;
    }
    const preset = this._presets.find((p) => String(p) === value);
    if (preset !== undefined) {
      this._startPreset(preset);
    }
  }

  private _startPreset(preset: number): void {
    this._api.callService("timer", "start", {
      entity_id: this._stateObj!.entity_id,
      duration: preset,
    });
  }

  static styles = cardFeatureStyles;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-timer-presets-card-feature": HuiTimerPresetsCardFeature;
  }
}
