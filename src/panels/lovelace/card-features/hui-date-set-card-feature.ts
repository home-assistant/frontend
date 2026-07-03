import { consume } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { firstWeekdayIndex } from "../../../common/datetime/first_weekday";
import {
  consumeEntityState,
  consumeLocalize,
} from "../../../common/decorators/consume-context-entry";
import { transform } from "../../../common/decorators/transform";
import {
  fireEvent,
  type HASSDomCurrentTargetEvent,
} from "../../../common/dom/fire_event";
import { computeDomain } from "../../../common/entity/compute_domain";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import "../../../components/ha-control-slider";
import { apiContext, internationalizationContext } from "../../../data/context";
import type { FrontendLocaleData } from "../../../data/translation";
import type {
  HomeAssistant,
  HomeAssistantApi,
  HomeAssistantInternationalization,
} from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  DateSetCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

const loadDatePickerDialog = () =>
  import("../../../components/date-picker/ha-dialog-date-picker");

const supportsDateSetCardFeatureFromState = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return (
    (domain === "input_datetime" && stateObj.attributes.has_date) ||
    ["datetime", "date"].includes(domain)
  );
};

export const supportsDateSetCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  return supportsDateSetCardFeatureFromState(stateObj);
};

@customElement("hui-date-set-card-feature")
class HuiDateSetCardFeature extends LitElement implements LovelaceCardFeature {
  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @property({ attribute: false }) public color?: string;

  @state()
  @consumeEntityState({ entityIdPath: ["context", "entity_id"] })
  private _stateObj?: HassEntity;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  @transform<HomeAssistantInternationalization, FrontendLocaleData>({
    transformer: ({ locale }) => locale,
  })
  private _locale?: FrontendLocaleData;

  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  @state() private _config?: DateSetCardFeatureConfig;

  private _pressButton(ev: HASSDomCurrentTargetEvent<HTMLElement>) {
    if (!this._stateObj || !this._locale) return;

    fireEvent(this, "show-dialog", {
      dialogTag: "ha-dialog-date-picker",
      dialogImport: loadDatePickerDialog,
      dialogAnchor: ev.currentTarget,
      dialogParams: {
        min: "1970-01-01",
        value: this._stateObj.state,
        onChange: (value) => this._dateChanged(value),
        locale: this._locale.language,
        firstWeekday: firstWeekdayIndex(this._locale),
      },
    });
  }

  private _dateChanged(value: string | undefined) {
    if (!this._stateObj || !value) return;

    const domain = computeDomain(this._stateObj.entity_id);
    const service = domain === "input_datetime" ? "set_datetime" : "set_value";

    // datetime requires a full datetime string
    if (domain === "datetime") {
      const dateObj = new Date(this._stateObj.state);
      const selectedDate = new Date(`${value}T00:00:00`);
      dateObj.setFullYear(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate()
      );

      this._api.callService(domain, service, {
        entity_id: this._stateObj.entity_id,
        datetime: dateObj.toISOString(),
      });
    } else {
      this._api.callService(domain, service, {
        entity_id: this._stateObj.entity_id,
        date: value,
      });
    }
  }

  static getStubConfig(): DateSetCardFeatureConfig {
    return {
      type: "date-set",
    };
  }

  public setConfig(config: DateSetCardFeatureConfig): void {
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
      !supportsDateSetCardFeatureFromState(this._stateObj)
    ) {
      return nothing;
    }

    return html`
      <ha-control-button-group>
        <ha-control-button
          .disabled=${["unavailable", "unknown"].includes(this._stateObj.state)}
          class="press-button"
          @click=${this._pressButton}
        >
          ${this._localize("ui.card.date.set_date")}
        </ha-control-button>
      </ha-control-button-group>
    `;
  }

  static styles = cardFeatureStyles;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-date-set-card-feature": HuiDateSetCardFeature;
  }
}
