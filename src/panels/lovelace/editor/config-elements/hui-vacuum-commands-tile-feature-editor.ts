import { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import { supportsVacuumCommand } from "../../tile-features/hui-vacuum-commands-tile-feature";
import {
  LovelaceTileFeatureContext,
  VacuumCommandsTileFeatureConfig,
  VACUUM_COMMANDS,
} from "../../tile-features/types";
import type { LovelaceTileFeatureEditor } from "../../types";

@customElement("hui-vacuum-commands-tile-feature-editor")
export class HuiVacuumCommandsTileFeatureEditor
  extends LitElement
  implements LovelaceTileFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceTileFeatureContext;

  @state() private _config?: VacuumCommandsTileFeatureConfig;

  public setConfig(config: VacuumCommandsTileFeatureConfig): void {
    this._config = config;
  }

  private _schema = memoizeOne(
    (localize: LocalizeFunc, stateObj?: HassEntity) =>
      [
        {
          name: "commands",
          selector: {
            select: {
              multiple: true,
              mode: "list",
              options: VACUUM_COMMANDS.filter(
                (command) =>
                  stateObj && supportsVacuumCommand(stateObj, command)
              ).map((command) => ({
                value: command,
                label: `${localize(
                  `ui.panel.lovelace.editor.card.tile.features.types.vacuum-commands.commands_list.${command}`
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
      case "commands":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.tile.features.types.vacuum-commands.${schema.name}`
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
    "hui-vacuum-commands-tile-feature-editor": HuiVacuumCommandsTileFeatureEditor;
  }
}
