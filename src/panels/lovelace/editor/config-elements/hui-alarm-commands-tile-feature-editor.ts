import { html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import {
  AlarmCommandsTileFeatureConfig,
  ALARM_COMMANDS,
} from "../../tile-features/types";
import type { LovelaceTileFeatureEditor } from "../../types";

@customElement("hui-alarm-commands-tile-feature-editor")
export class HuiAlarmCommandsTileFeatureEditor
  extends LitElement
  implements LovelaceTileFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: AlarmCommandsTileFeatureConfig;

  public setConfig(config: AlarmCommandsTileFeatureConfig): void {
    this._config = config;
  }

  private _schema = memoizeOne(
    (localize: LocalizeFunc) =>
      [
        {
          name: "commands",
          selector: {
            select: {
              multiple: true,
              options: ALARM_COMMANDS.map((command) => ({
                value: command,
                label: localize(
                  `ui.panel.lovelace.editor.card.tile.features.types.alarm-commands.commands_list.${command}`
                ),
              })),
            },
          },
        },
      ] as const
  );

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    const schema = this._schema(this.hass.localize);

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
      case "commands":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.tile.features.types.alarm-commands.${schema.name}`
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
    "hui-alarm-commands-tile-feature-editor": HuiAlarmCommandsTileFeatureEditor;
  }
}
