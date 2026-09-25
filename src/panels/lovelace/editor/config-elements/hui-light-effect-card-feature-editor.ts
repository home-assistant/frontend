import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { LightEntity } from "../../../../data/light";
import type { HomeAssistant, ValueChangedEvent } from "../../../../types";
import type {
  LightEffectCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../../types";
import {
  customizableListData,
  customizableListSchema,
  processCustomizableListValue,
} from "./customizable-list-feature";

@customElement("hui-light-effect-card-feature-editor")
export class HuiLightEffectCardFeatureEditor
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: LightEffectCardFeatureConfig;

  public setConfig(config: LightEffectCardFeatureConfig): void {
    this._config = config;
  }

  private _schema = memoizeOne((stateObj: LightEntity | undefined) =>
    customizableListSchema({
      field: "effects",
      options:
        stateObj?.attributes.effect_list?.map((effect) => ({
          value: effect,
          label: this.hass!.formatEntityAttributeValue(
            stateObj,
            "effect",
            effect
          ),
        })) ?? [],
    })
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const stateObj = this.context?.entity_id
      ? (this.hass.states[this.context.entity_id] as LightEntity | undefined)
      : undefined;

    const data = customizableListData(this._config, "effects");
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
    ev: ValueChangedEvent<LightEffectCardFeatureConfig>
  ): void {
    const stateObj = this.context?.entity_id
      ? (this.hass!.states[this.context.entity_id] as LightEntity | undefined)
      : undefined;
    const defaults = stateObj?.attributes.effect_list ?? [];
    const config = processCustomizableListValue<LightEffectCardFeatureConfig>(
      ev.detail.value,
      "effects",
      defaults
    );
    fireEvent(this, "config-changed", { config });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) =>
    this.hass!.localize(
      `ui.panel.lovelace.editor.features.types.light-effect.${schema.name}`
    );
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-light-effect-card-feature-editor": HuiLightEffectCardFeatureEditor;
  }
}
