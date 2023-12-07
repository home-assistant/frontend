import { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import { FormatEntityAttributeValueFunc } from "../../../../common/translations/entity-state";
import { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import {
  HumidifierModesCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../../types";

@customElement("hui-humidifier-modes-card-feature-editor")
export class HuiHumidifierModesCardFeatureEditor
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: HumidifierModesCardFeatureConfig;

  public setConfig(config: HumidifierModesCardFeatureConfig): void {
    this._config = config;
  }

  private _schema = memoizeOne(
    (
      localize: LocalizeFunc,
      formatEntityAttributeValue: FormatEntityAttributeValueFunc,
      stateObj?: HassEntity
    ) =>
      [
        {
          name: "style",
          selector: {
            select: {
              multiple: false,
              mode: "list",
              options: ["dropdown", "icons"].map((mode) => ({
                value: mode,
                label: localize(
                  `ui.panel.lovelace.editor.features.types.humidifier-modes.style_list.${mode}`
                ),
              })),
            },
          },
        },
        {
          name: "modes",
          selector: {
            select: {
              multiple: true,
              mode: "list",
              options:
                stateObj?.attributes.available_modes?.map((mode) => ({
                  value: mode,
                  label: formatEntityAttributeValue(stateObj, "mode", mode),
                })) || [],
            },
          },
        },
      ] as const satisfies readonly HaFormSchema[]
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const stateObj = this.context?.entity_id
      ? this.hass.states[this.context?.entity_id]
      : undefined;

    const data: HumidifierModesCardFeatureConfig = {
      style: "dropdown",
      modes: [],
      ...this._config,
    };

    const schema = this._schema(
      this.hass.localize,
      this.hass.formatEntityAttributeValue,
      stateObj
    );

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

  private _valueChanged(ev: CustomEvent): void {
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "style":
      case "modes":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.features.types.humidifier-modes.${schema.name}`
        );
      default:
        return "";
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-humidifier-modes-card-feature-editor": HuiHumidifierModesCardFeatureEditor;
  }
}
