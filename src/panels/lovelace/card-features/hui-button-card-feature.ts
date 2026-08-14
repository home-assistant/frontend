import { consume } from "@lit/context";
import { mdiAlertOctagram, mdiCheckBold } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
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
import "../../../components/ha-svg-icon";
import { apiContext, servicesContext } from "../../../data/context";
import { forwardHaptic } from "../../../data/haptics";
import {
  hasRequiredScriptFieldsForServices,
  requiredScriptFieldsFilledForServices,
} from "../../../data/script";
import { showMoreInfoDialog } from "../../../dialogs/more-info/show-ha-more-info-dialog";
import type { HomeAssistant, HomeAssistantApi } from "../../../types";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  ButtonCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

const supportsButtonCardFeatureFromState = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return ["button", "input_button", "scene", "script"].includes(domain);
};

type ActionResult = "success" | "error";

// Keep in sync with ha-progress-button
const RESULT_DURATION = 2000;

export const supportsButtonCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  return supportsButtonCardFeatureFromState(stateObj);
};

@customElement("hui-button-card-feature")
class HuiButtonCardFeature extends LitElement implements LovelaceCardFeature {
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
  @consume({ context: servicesContext, subscribe: true })
  private _services!: HomeAssistant["services"];

  @state() private _config?: ButtonCardFeatureConfig;

  @state() private _result?: ActionResult;

  private _resultTimeout?: number;

  private _pressing = false;

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    clearTimeout(this._resultTimeout);
    this._result = undefined;
  }

  private _setResult(result: ActionResult) {
    clearTimeout(this._resultTimeout);
    this._result = result;
    this._resultTimeout = window.setTimeout(() => {
      this._result = undefined;
    }, RESULT_DURATION);
  }

  private async _pressButton() {
    if (!this._stateObj || this._pressing) return;

    const domain = computeDomain(this._stateObj.entity_id);
    const service =
      domain === "button" || domain === "input_button" ? "press" : "turn_on";

    if (domain === "script") {
      const entityId = this._stateObj.entity_id;
      if (
        hasRequiredScriptFieldsForServices(this._services, entityId) &&
        !requiredScriptFieldsFilledForServices(
          this._services,
          entityId,
          this._config?.data
        )
      ) {
        showMoreInfoDialog(this, {
          entityId: entityId,
          data: this._config?.data,
        });
        return;
      }
    }

    const serviceData = {
      entity_id: this._stateObj.entity_id,
      ...(this._config?.data
        ? {
            variables: this._config.data,
          }
        : {}),
    };

    forwardHaptic(this, "light");

    this._pressing = true;
    try {
      await this._api.callService(domain, service, serviceData);
      this._setResult("success");
    } catch (_err) {
      this._setResult("error");
    } finally {
      this._pressing = false;
    }
  }

  static getStubConfig(): ButtonCardFeatureConfig {
    return {
      type: "button",
    };
  }

  public setConfig(config: ButtonCardFeatureConfig): void {
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
      !supportsButtonCardFeatureFromState(this._stateObj)
    ) {
      return nothing;
    }

    return html`
      <ha-control-button-group>
        <ha-control-button
          .disabled=${this._stateObj.state === "unavailable"}
          class="press-button"
          @click=${this._pressButton}
        >
          ${this._config.action_name ?? this._localize("ui.card.button.press")}
          ${
            this._result
              ? html`
                  <div class="result ${this._result}">
                    <ha-svg-icon
                      .path=${
                        this._result === "success"
                          ? mdiCheckBold
                          : mdiAlertOctagram
                      }
                    ></ha-svg-icon>
                  </div>
                `
              : nothing
          }
        </ha-control-button>
      </ha-control-button-group>
    `;
  }

  static styles = [
    cardFeatureStyles,
    css`
      .result {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        /* Overrides the slotted content opacity of ha-control-button */
        opacity: 1;
        animation: fade-in var(--ha-animation-duration-instant) ease-in-out;
      }
      .result.success {
        background-color: var(--ha-color-fill-success-loud-resting);
        color: var(--ha-color-on-success-loud);
      }
      .result.error {
        background-color: var(--ha-color-fill-danger-loud-resting);
        color: var(--ha-color-on-danger-loud);
      }
      .result ha-svg-icon {
        animation: scale var(--ha-animation-duration-fast) ease-in-out;
      }
    `,
  ];

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import("../editor/config-elements/hui-button-card-feature-editor");
    return document.createElement("hui-button-card-feature-editor");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-button-card-feature": HuiButtonCardFeature;
  }
}
