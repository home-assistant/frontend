import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import type { OriginalStatesDashboardStrategyConfig } from "../../strategies/original-states/original-states-dashboard-strategy";
import type { LovelaceStrategyEditor } from "../../strategies/types";

const SCHEMA = [
  {
    name: "areas",
    selector: {
      areas_display: {},
    },
  },
  {
    name: "",
    type: "grid",
    schema: [
      {
        name: "hide_entities_without_area",
        selector: {
          boolean: {},
        },
      },
      {
        name: "hide_energy",
        selector: {
          boolean: {},
        },
      },
    ],
  },
] as const satisfies readonly HaFormSchema[];

@customElement("hui-original-states-dashboard-strategy-editor")
export class HuiOriginalStatesDashboardStrategyEditor
  extends LitElement
  implements LovelaceStrategyEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state()
  private _config?: OriginalStatesDashboardStrategyConfig;

  public setConfig(config: OriginalStatesDashboardStrategyConfig): void {
    this._config = config;
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${SCHEMA}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    const data = ev.detail.value;
    fireEvent(this, "config-changed", { config: data });
  }

  private _computeLabelCallback = (schema: SchemaUnion<typeof SCHEMA>) => {
    switch (schema.name) {
      case "areas":
      case "hide_energy":
      case "hide_entities_without_area":
        return this.hass?.localize(
          `ui.panel.lovelace.editor.strategy.original-states.${schema.name}`
        );
      default:
        return "";
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-original-states-dashboard-strategy-editor": HuiOriginalStatesDashboardStrategyEditor;
  }
}
