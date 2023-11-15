import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import { OriginalStatesDashboardStrategyConfig } from "../../strategies/original-states-dashboard-strategy";
import { LovelaceStrategyEditor } from "../../strategies/types";

const SCHEMA = [
  {
    name: "hidden_areas",
    selector: {
      area: {
        multiple: true,
        entity: {},
      },
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
export class HuiOriginalStatesDashboarStrategyEditor
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

    const data = this._config;

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
    const config = ev.detail.value;
    fireEvent(this, "config-changed", { config });
  }

  private _computeLabelCallback = (schema: SchemaUnion<typeof SCHEMA>) => {
    switch (schema.name) {
      case "hidden_areas":
        return "Hiddens areas";
      case "hide_energy":
        return "Hide energy overview";
      case "hide_entities_without_area":
        return "Hide entities without area";
      default:
        return "";
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-original-states-dashboard-strategy-editor": HuiOriginalStatesDashboarStrategyEditor;
  }
}
