import { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import { supportsFeature } from "../../../../common/entity/supports-feature";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import { AlarmMode, ALARM_MODES } from "../../../../data/alarm_control_panel";
import type { HomeAssistant } from "../../../../types";
import {
  LovelaceTileFeatureContext,
  AlarmModesTileFeatureConfig,
} from "../../tile-features/types";
import type { LovelaceTileFeatureEditor } from "../../types";
import "../../../../components/ha-form/ha-form";

@customElement("hui-alarm-modes-tile-feature-editor")
export class HuiAlarmModesTileFeatureEditor
  extends LitElement
  implements LovelaceTileFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceTileFeatureContext;

  @state() private _config?: AlarmModesTileFeatureConfig;

  public setConfig(config: AlarmModesTileFeatureConfig): void {
    this._config = config;
  }

  private _schema = memoizeOne(
    (localize: LocalizeFunc, stateObj?: HassEntity) =>
      [
        {
          name: "modes",
          selector: {
            select: {
              multiple: true,
              mode: "list",
              options: Object.keys(ALARM_MODES)
                .filter((mode) => {
                  const feature = ALARM_MODES[mode as AlarmMode].feature;
                  return (
                    stateObj && (!feature || supportsFeature(stateObj, feature))
                  );
                })
                .map((mode) => ({
                  value: mode,
                  label: `${localize(
                    `ui.panel.lovelace.editor.card.tile.features.types.alarm-modes.modes_list.${mode}`
                  )}`,
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

    const schema = this._schema(this.hass.localize, stateObj);

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
      case "modes":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.tile.features.types.alarm-modes.${schema.name}`
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
    "hui-alarm-modes-tile-feature-editor": HuiAlarmModesTileFeatureEditor;
  }
}
