import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import { DEFAULT_HOURS_TO_SHOW } from "../../card-features/hui-trend-graph-card-feature";
import type {
  LovelaceCardFeatureContext,
  TrendGraphCardFeatureConfig,
} from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../../types";

const SCHEMA = [
  {
    name: "hours_to_show",
    default: DEFAULT_HOURS_TO_SHOW,
    selector: { number: { min: 1, mode: "box" } },
  },
] as const satisfies HaFormSchema[];

@customElement("hui-trend-graph-card-feature-editor")
export class HuiTrendGraphCardFeatureEditor
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: TrendGraphCardFeatureConfig;

  public setConfig(config: TrendGraphCardFeatureConfig): void {
    this._config = config;
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const data = { ...this._config };

    if (!this._config.hours_to_show) {
      data.hours_to_show = DEFAULT_HOURS_TO_SHOW;
    }

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${SCHEMA}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  private _computeLabelCallback = (schema: SchemaUnion<typeof SCHEMA>) => {
    switch (schema.name) {
      case "hours_to_show":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        );
      default:
        return "";
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-trend-graph-card-feature-editor": HuiTrendGraphCardFeatureEditor;
  }
}
