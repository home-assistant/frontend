import { mdiMinus, mdiPlus, mdiRestore } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { TemplateResult } from "lit";
import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import "../../../components/ha-control-select";
import { UNAVAILABLE } from "../../../data/entity";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import {
  COUNTER_ACTIONS,
  type CounterActionsCardFeatureConfig,
  type LovelaceCardFeatureContext,
} from "./types";

export const supportsCounterActionsCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  const domain = computeDomain(stateObj.entity_id);
  return domain === "counter";
};

interface CounterButton {
  translationKey: string;
  icon: string;
  serviceName: string;
  disabled: boolean;
}

export const COUNTER_ACTIONS_BUTTON: Record<
  string,
  (stateObj: HassEntity) => CounterButton
> = {
  increment: (stateObj) => ({
    translationKey: "increment",
    icon: mdiPlus,
    serviceName: "increment",
    disabled: parseInt(stateObj.state) === stateObj.attributes.maximum,
  }),
  reset: () => ({
    translationKey: "reset",
    icon: mdiRestore,
    serviceName: "reset",
    disabled: false,
  }),
  decrement: (stateObj) => ({
    translationKey: "decrement",
    icon: mdiMinus,
    serviceName: "decrement",
    disabled: parseInt(stateObj.state) === stateObj.attributes.minimum,
  }),
};

@customElement("hui-counter-actions-card-feature")
class HuiCounterActionsCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public context!: LovelaceCardFeatureContext;

  @state() private _config?: CounterActionsCardFeatureConfig;

  private get _stateObj(): HassEntity | undefined {
    return this.hass.states[this.context.entity_id!] as HassEntity | undefined;
  }

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import(
      "../editor/config-elements/hui-counter-actions-card-feature-editor"
    );
    return document.createElement("hui-counter-actions-card-feature-editor");
  }

  static getStubConfig(): CounterActionsCardFeatureConfig {
    return {
      type: "counter-actions",
      actions: COUNTER_ACTIONS.map((action) => action),
    };
  }

  public setConfig(config: CounterActionsCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected render(): TemplateResult | null {
    if (
      !this._config ||
      !this.hass ||
      !this._stateObj ||
      !supportsCounterActionsCardFeature(this.hass, this.context)
    ) {
      return null;
    }

    return html`
      <ha-control-button-group>
        ${this._config?.actions
          ?.filter((action) => COUNTER_ACTIONS.includes(action))
          .map((action) => {
            const button = COUNTER_ACTIONS_BUTTON[action](this._stateObj!);
            return html`
              <ha-control-button
                .entry=${button}
                .label=${this.hass!.localize(
                  // @ts-ignore
                  `ui.card.counter.actions.${button.translationKey}`
                )}
                @click=${this._onActionTap}
                .disabled=${button.disabled ||
                this._stateObj?.state === UNAVAILABLE}
              >
                <ha-svg-icon .path=${button.icon}></ha-svg-icon>
              </ha-control-button>
            `;
          })}
      </ha-control-button-group>
    `;
  }

  private _onActionTap(ev): void {
    ev.stopPropagation();
    const entry = (ev.target! as any).entry as CounterButton;
    this.hass!.callService("counter", entry.serviceName, {
      entity_id: this._stateObj!.entity_id,
    });
  }

  static styles = cardFeatureStyles;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-counter-actions-card-feature": HuiCounterActionsCardFeature;
  }
}
