import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { VacuumEntity } from "../../../../data/vacuum";
import type { HomeAssistant, ValueChangedEvent } from "../../../../types";
import type {
  LovelaceCardFeatureContext,
  VacuumFanSpeedCardFeatureConfig,
} from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../../types";
import {
  customizableListData,
  customizableListSchema,
  processCustomizableListValue,
} from "./customizable-list-feature";

@customElement("hui-vacuum-fan-speed-card-feature-editor")
export class HuiVacuumFanSpeedCardFeatureEditor
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: VacuumFanSpeedCardFeatureConfig;

  public setConfig(config: VacuumFanSpeedCardFeatureConfig): void {
    this._config = config;
  }

  private _schema = memoizeOne((stateObj: VacuumEntity | undefined) =>
    customizableListSchema({
      field: "fan_speeds",
      options:
        stateObj?.attributes.fan_speed_list?.map((speed) => ({
          value: speed,
          label: this.hass!.formatEntityAttributeValue(
            stateObj,
            "fan_speed",
            speed
          ),
        })) ?? [],
    })
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const stateObj = this.context?.entity_id
      ? (this.hass.states[this.context.entity_id] as VacuumEntity | undefined)
      : undefined;

    const data = customizableListData(this._config, "fan_speeds");
    const schema = this._schema(stateObj);

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(
    ev: ValueChangedEvent<VacuumFanSpeedCardFeatureConfig>
  ): void {
    const stateObj = this.context?.entity_id
      ? (this.hass!.states[this.context.entity_id] as VacuumEntity | undefined)
      : undefined;
    const defaults = stateObj?.attributes.fan_speed_list ?? [];
    const config =
      processCustomizableListValue<VacuumFanSpeedCardFeatureConfig>(
        ev.detail.value,
        "fan_speeds",
        defaults
      );
    fireEvent(this, "config-changed", { config });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) =>
    this.hass!.localize(
      `ui.panel.lovelace.editor.features.types.vacuum-fan-speed.${schema.name}`
    );
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-vacuum-fan-speed-card-feature-editor": HuiVacuumFanSpeedCardFeatureEditor;
  }
}
