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
    name: "no_area_group",
    selector: {
      boolean: {},
    },
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
      case "no_area_group":
        return "Do not group by area";
      default:
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        );
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-original-states-dashboard-strategy-editor": HuiOriginalStatesDashboarStrategyEditor;
  }
}
