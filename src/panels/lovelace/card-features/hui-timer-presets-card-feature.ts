import { consume } from "@lit/context";
import { mdiTimerOutline } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { createDurationData } from "../../../common/datetime/create_duration_data";
import { durationDataToSeconds } from "../../../common/datetime/duration_to_seconds";
import { formatNumericDuration } from "../../../common/datetime/format_duration";
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
import { apiContext, internationalizationContext } from "../../../data/context";
import { UNAVAILABLE } from "../../../data/entity/entity";
import { normalizeTimerDuration } from "../../../data/timer";
import type { FrontendLocaleData } from "../../../data/translation";
import type {
  HomeAssistant,
  HomeAssistantApi,
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

interface TimerPreset {
  duration: string | number;
  label: string;
}

// Presets with an unparseable or zero duration are dropped. Labels are
// normalized to hours/minutes/seconds so numeric presets ("90") render the
// same as their string form ("0:01:30").
export const computeTimerPresets = (
  presets: (string | number)[],
  locale: FrontendLocaleData
): TimerPreset[] =>
  presets.reduce<TimerPreset[]>((result, preset) => {
    const durationData = createDurationData(preset);
    if (durationData && durationDataToSeconds(durationData) > 0) {
      const label = formatNumericDuration(
        locale,
        normalizeTimerDuration(durationData)
      );
      if (label) {
        result.push({ duration: preset, label });
      }
    }
    return result;
  }, []);

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
  @consume({ context: internationalizationContext, subscribe: true })
  @transform<HomeAssistantInternationalization, FrontendLocaleData>({
    transformer: ({ locale }) => locale,
  })
  private _locale?: FrontendLocaleData;

  @state() private _config?: TimerPresetsCardFeatureConfig;

  private _presets = memoizeOne(
    (presets: (string | number)[] | undefined, locale: FrontendLocaleData) =>
      computeTimerPresets(presets ?? [], locale)
  );

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import("../editor/config-elements/hui-timer-presets-card-feature-editor");
    return document.createElement("hui-timer-presets-card-feature-editor");
  }

  static getStubConfig(): TimerPresetsCardFeatureConfig {
    return {
      type: "timer-presets",
      presets: ["0:01:00", "0:05:00", "0:10:00"],
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

    const presets = this._presets(this._config.presets, this._locale);

    if (!presets.length) {
      return nothing;
    }

    if (this._config.style === "dropdown") {
      return html`
        <ha-control-select-menu
          show-arrow
          .label=${this._localize("ui.card.timer.presets")}
          .options=${presets.map((preset) => ({
            value: String(preset.duration),
            label: preset.label,
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
        ${presets.map(
          (preset) => html`
            <ha-control-button
              .preset=${preset}
              .label=${this._localize("ui.card.timer.start_preset", {
                duration: preset.label,
              })}
              .disabled=${this._stateObj!.state === UNAVAILABLE}
              @click=${this._onPresetTap}
            >
              ${preset.label}
            </ha-control-button>
          `
        )}
      </ha-control-button-group>
    `;
  }

  private _onPresetTap(
    ev: MouseEvent &
      HASSDomCurrentTargetEvent<HaControlButton & { preset: TimerPreset }>
  ): void {
    ev.stopPropagation();
    this._startPreset(ev.currentTarget.preset);
  }

  private _onPresetSelect(ev: CustomEvent<{ item?: { value: string } }>): void {
    ev.stopPropagation();
    const value = ev.detail.item?.value;
    if (value === undefined || !this._config || !this._locale) {
      return;
    }
    const presets = this._presets(this._config.presets, this._locale);
    const preset = presets.find((p) => String(p.duration) === value);
    if (preset) {
      this._startPreset(preset);
    }
  }

  private _startPreset(preset: TimerPreset): void {
    this._api.callService("timer", "start", {
      entity_id: this._stateObj!.entity_id,
      duration: preset.duration,
    });
  }

  static styles = cardFeatureStyles;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-timer-presets-card-feature": HuiTimerPresetsCardFeature;
  }
}
