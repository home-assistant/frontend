import { consume } from "@lit/context";
import {
  mdiFlagCheckered,
  mdiPause,
  mdiPlay,
  mdiRestart,
  mdiStop,
} from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { TemplateResult } from "lit";
import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  consumeEntityState,
  consumeLocalize,
} from "../../../common/decorators/consume-context-entry";
import type { HASSDomCurrentTargetEvent } from "../../../common/dom/fire_event";
import { computeDomain } from "../../../common/entity/compute_domain";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-control-button";
import type { HaControlButton } from "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import "../../../components/ha-svg-icon";
import { apiContext } from "../../../data/context";
import { UNAVAILABLE } from "../../../data/entity/entity";
import type { HomeAssistant, HomeAssistantApi } from "../../../types";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import {
  DEFAULT_TIMER_ACTIONS,
  TIMER_ACTIONS,
  type TimerActionsCardFeatureConfig,
  type LovelaceCardFeatureContext,
} from "./types";

const supportsTimerActionsCardFeatureFromState = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return domain === "timer";
};

export const supportsTimerActionsCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  return supportsTimerActionsCardFeatureFromState(stateObj);
};

interface TimerButton {
  translationKey: string;
  icon: string;
  serviceName: string;
  disabled: boolean;
}

export const TIMER_ACTIONS_BUTTON: Record<
  string,
  (stateObj: HassEntity) => TimerButton
> = {
  // timer.start starts an idle timer, resumes a paused one, and restarts an
  // active one with its configured duration.
  start: (stateObj) =>
    stateObj.state === "active"
      ? {
          translationKey: "restart",
          icon: mdiRestart,
          serviceName: "start",
          disabled: false,
        }
      : {
          translationKey: "start",
          icon: mdiPlay,
          serviceName: "start",
          disabled: false,
        },
  pause: (stateObj) => ({
    translationKey: "pause",
    icon: mdiPause,
    serviceName: "pause",
    disabled: stateObj.state !== "active",
  }),
  cancel: (stateObj) => ({
    translationKey: "cancel",
    icon: mdiStop,
    serviceName: "cancel",
    disabled: stateObj.state === "idle",
  }),
  finish: (stateObj) => ({
    translationKey: "finish",
    icon: mdiFlagCheckered,
    serviceName: "finish",
    disabled: stateObj.state === "idle",
  }),
};

@customElement("hui-timer-actions-card-feature")
class HuiTimerActionsCardFeature
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

  @state() private _config?: TimerActionsCardFeatureConfig;

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import("../editor/config-elements/hui-timer-actions-card-feature-editor");
    return document.createElement("hui-timer-actions-card-feature-editor");
  }

  static getStubConfig(): TimerActionsCardFeatureConfig {
    return {
      type: "timer-actions",
    };
  }

  public setConfig(config: TimerActionsCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected render(): TemplateResult | null {
    if (
      !this._config ||
      !this.context ||
      !this._stateObj ||
      !supportsTimerActionsCardFeatureFromState(this._stateObj)
    ) {
      return null;
    }

    const actions = this._config?.actions ?? DEFAULT_TIMER_ACTIONS;

    return html`
      <ha-control-button-group>
        ${actions
          .filter((action) => TIMER_ACTIONS.includes(action))
          .map((action) => {
            const button = TIMER_ACTIONS_BUTTON[action](this._stateObj!);
            return html`
              <ha-control-button
                .entry=${button}
                .label=${this._localize(
                  // @ts-ignore
                  `ui.card.timer.actions.${button.translationKey}`
                )}
                @click=${this._onActionTap}
                .disabled=${
                  button.disabled || this._stateObj?.state === UNAVAILABLE
                }
              >
                <ha-svg-icon .path=${button.icon}></ha-svg-icon>
              </ha-control-button>
            `;
          })}
      </ha-control-button-group>
    `;
  }

  private _onActionTap(
    ev: MouseEvent &
      HASSDomCurrentTargetEvent<HaControlButton & { entry: TimerButton }>
  ): void {
    ev.stopPropagation();
    this._api.callService("timer", ev.currentTarget.entry.serviceName, {
      entity_id: this._stateObj!.entity_id,
    });
  }

  static styles = cardFeatureStyles;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-timer-actions-card-feature": HuiTimerActionsCardFeature;
  }
}
