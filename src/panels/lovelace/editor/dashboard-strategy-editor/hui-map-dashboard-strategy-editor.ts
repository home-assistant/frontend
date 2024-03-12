import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import { getMapEntities } from "../../strategies/map/map-view-strategy";
import { LovelaceStrategyEditor } from "../../strategies/types";
import { MapDashboardStrategyConfig } from "../../strategies/map/map-dashboard-strategy";

@customElement("hui-map-dashboard-strategy-editor")
export class HuiMapDashboardStrategyEditor
  extends LitElement
  implements LovelaceStrategyEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state()
  private _config?: MapDashboardStrategyConfig;

  public setConfig(config: MapDashboardStrategyConfig): void {
    this._config = config;
  }

  private _schema = memoizeOne(
    () =>
      [
        {
          name: "hidden_entities",
          required: false,
          selector: {
            entity: {
              include_entities: getMapEntities(this.hass!),
              multiple: true,
            },
          },
        },
      ] as const satisfies readonly HaFormSchema[]
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const schema = this._schema();

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${schema}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    const data = ev.detail.value;
    fireEvent(this, "config-changed", { config: data });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "hidden_entities":
        return this.hass?.localize(
          `ui.panel.lovelace.editor.strategy.map.${schema.name}`
        );
      default:
        return "";
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-map-dashboard-strategy-editor": HuiMapDashboardStrategyEditor;
  }
}
