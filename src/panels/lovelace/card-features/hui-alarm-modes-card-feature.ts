import { consume } from "@lit/context";
import { mdiShieldOff } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import {
  consumeEntityState,
  consumeLocalize,
} from "../../../common/decorators/consume-context-entry";
import { computeDomain } from "../../../common/entity/compute_domain";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import { stateColorCss } from "../../../common/entity/state_color";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import "../../../components/ha-control-select";
import type { ControlSelectOption } from "../../../components/ha-control-select";
import "../../../components/ha-control-slider";
import "../../../components/ha-icon";
import type {
  AlarmControlPanelEntity,
  AlarmMode,
} from "../../../data/alarm_control_panel";
import {
  ALARM_MODES,
  setProtectedAlarmControlPanelMode,
  supportedAlarmModes,
} from "../../../data/alarm_control_panel";
import { apiContext } from "../../../data/context";
import { UNAVAILABLE } from "../../../data/entity/entity";
import type { HomeAssistant, HomeAssistantApi } from "../../../types";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import { filterModes } from "./common/filter-modes";
import type {
  AlarmModesCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

const supportsAlarmModesCardFeatureFromState = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return domain === "alarm_control_panel";
};

export const supportsAlarmModesCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  return supportsAlarmModesCardFeatureFromState(stateObj);
};

@customElement("hui-alarm-modes-card-feature")
class HuiAlarmModeCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state()
  @consumeEntityState({ entityIdPath: ["context", "entity_id"] })
  private _stateObj?: AlarmControlPanelEntity;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  @state() private _config?: AlarmModesCardFeatureConfig;

  @state() _currentMode?: AlarmMode;

  static getStubConfig(): AlarmModesCardFeatureConfig {
    return {
      type: "alarm-modes",
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import("../editor/config-elements/hui-alarm-modes-card-feature-editor");
    return document.createElement("hui-alarm-modes-card-feature-editor");
  }

  public setConfig(config: AlarmModesCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected willUpdate(changedProp: PropertyValues): void {
    super.willUpdate(changedProp);
    if (changedProp.has("_stateObj") && this._stateObj) {
      this._currentMode = this._getCurrentMode(this._stateObj);
    }
  }

  private _getCurrentMode = memoizeOne((stateObj: AlarmControlPanelEntity) => {
    const supportedModes = supportedAlarmModes(stateObj);
    return supportedModes.find((mode) => mode === stateObj.state);
  });

  private async _valueChanged(
    ev: HASSDomEvent<HASSDomEvents["value-changed"]>
  ) {
    if (!this._stateObj) return;
    const mode = ev.detail.value as AlarmMode;

    if (mode === this._stateObj.state) return;

    const oldMode = this._getCurrentMode(this._stateObj);
    this._currentMode = mode;

    try {
      await this._setMode(mode);
    } catch (_err) {
      this._currentMode = oldMode;
    }
  }

  private async _disarm() {
    this._setMode("disarmed");
  }

  private async _setMode(mode: AlarmMode) {
    await setProtectedAlarmControlPanelMode(
      this,
      {
        callService: this._api.callService,
        callWS: this._api.callWS,
        localize: this._localize,
      },
      this._stateObj!,
      mode
    );
  }

  protected render(): TemplateResult | typeof nothing {
    if (
      !this._config ||
      !this.context ||
      !this._stateObj ||
      !supportsAlarmModesCardFeatureFromState(this._stateObj)
    ) {
      return nothing;
    }

    const color = stateColorCss(this._stateObj);

    const supportedModes = supportedAlarmModes(this._stateObj).reverse();

    const modeIcons = this._config.mode_icons;

    const options = filterModes(
      supportedModes,
      this._config.modes
    ).map<ControlSelectOption>((mode) => {
      const customIcon = modeIcons?.[mode];
      return {
        value: mode,
        label: this._localize(`ui.card.alarm_control_panel.modes.${mode}`),
        ...(customIcon
          ? { icon: html`<ha-icon .icon=${customIcon}></ha-icon>` }
          : { path: ALARM_MODES[mode].path }),
      };
    });

    if (["triggered", "arming", "pending"].includes(this._stateObj.state)) {
      return html`
        <ha-control-button-group>
          <ha-control-button
            .label=${this._localize("ui.card.alarm_control_panel.disarm")}
            @click=${this._disarm}
          >
            <ha-svg-icon .path=${mdiShieldOff}></ha-svg-icon>
          </ha-control-button>
        </ha-control-button-group>
      `;
    }

    return html`
      <ha-control-select
        .options=${options}
        .value=${this._currentMode}
        @value-changed=${this._valueChanged}
        hide-option-label
        .label=${this._localize("ui.card.alarm_control_panel.modes_label")}
        style=${styleMap({
          "--control-select-color": color,
          "--modes-count": options.length.toString(),
        })}
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
    "hui-alarm-modes-card-feature": HuiAlarmModeCardFeature;
  }
}
