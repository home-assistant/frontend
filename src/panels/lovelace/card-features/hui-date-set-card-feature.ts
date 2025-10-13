import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import "../../../components/ha-control-slider";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  LovelaceCardFeatureContext,
  DateSetCardFeatureConfig,
} from "./types";
import { fireEvent } from "../../../common/dom/fire_event";
import type { DatePickerDialogParams } from "../../../components/ha-date-input";
import { firstWeekdayIndex } from "../../../common/datetime/first_weekday";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";

const loadDatePickerDialog = () =>
  import("../../../components/ha-dialog-date-picker");

export const supportsDateSetCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  const domain = computeDomain(stateObj.entity_id);
  return (
    (domain === "input_datetime" && stateObj.attributes.has_date) ||
    ["datetime", "date"].includes(domain)
  );
};

@customElement("hui-date-set-card-feature")
class HuiDateSetCardFeature extends LitElement implements LovelaceCardFeature {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @property({ attribute: false }) public color?: string;

  @state() private _config?: DateSetCardFeatureConfig;

  private get _stateObj() {
    if (!this.hass || !this.context || !this.context.entity_id) {
      return undefined;
    }
    return this.hass.states[this.context.entity_id!] ?? undefined;
  }

  private _pressButton() {
    if (!this.hass || !this._stateObj) return;

    const dialogParams: DatePickerDialogParams = {
      min: "1970-01-01",
      value: this._stateObj.state,
      onChange: (value) => this._dateChanged(value),
      locale: this.hass.locale.language,
      firstWeekday: firstWeekdayIndex(this.hass.locale),
    };

    fireEvent(this, "show-dialog", {
      dialogTag: "ha-dialog-date-picker",
      dialogImport: loadDatePickerDialog,
      dialogParams,
    });
  }

  private _dateChanged(value: string | undefined) {
    if (!this.hass || !this._stateObj || !value) return;

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

      this.hass.callService(domain, service, {
        entity_id: this._stateObj.entity_id,
        datetime: dateObj.toISOString(),
      });
    } else {
      this.hass.callService(domain, service, {
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
      !this.hass ||
      !this.context ||
      !this._stateObj ||
      !supportsDateSetCardFeature(this.hass, this.context)
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
          ${this.hass.localize("ui.card.date.set_date")}
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
