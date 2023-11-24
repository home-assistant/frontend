import { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { FormatEntityStateFunc } from "../../../../common/translations/entity-state";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import { HVAC_MODES } from "../../../../data/climate";
import type { HomeAssistant } from "../../../../types";
import {
  ClimateHvacModesCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../../types";

@customElement("hui-climate-hvac-modes-card-feature-editor")
export class HuiClimateHvacModesCardFeatureEditor
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: ClimateHvacModesCardFeatureConfig;

  public setConfig(config: ClimateHvacModesCardFeatureConfig): void {
    this._config = config;
  }

  private _schema = memoizeOne(
    (formatEntityState: FormatEntityStateFunc, stateObj?: HassEntity) =>
      [
        {
          name: "hvac_modes",
          selector: {
            select: {
              multiple: true,
              mode: "list",
              options: HVAC_MODES.filter(
                (mode) => stateObj?.attributes.hvac_modes?.includes(mode)
              ).map((mode) => ({
                value: mode,
                label: stateObj ? formatEntityState(stateObj, mode) : mode,
              })),
            },
          },
        },
      ] as const
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const stateObj = this.context?.entity_id
      ? this.hass.states[this.context?.entity_id]
      : undefined;

    const schema = this._schema(this.hass.formatEntityState, stateObj);

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
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "hvac_modes":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.features.types.climate-hvac-modes.${schema.name}`
        );
      default:
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        );
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-climate-hvac-modes-card-feature-editor": HuiClimateHvacModesCardFeatureEditor;
  }
}
