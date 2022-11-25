import { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import { supportsVacuumCommand } from "../../tile-extra/hui-vacuum-commands-tile-extra";
import {
  LovelaceTileExtraContext,
  VacuumCommandsTileExtraConfig,
  VACUUM_COMMANDS,
} from "../../tile-extra/types";
import type { LovelaceTileExtraEditor } from "../../types";

@customElement("hui-vacuum-commands-tile-extra-editor")
export class HuiVacuumCommandsTileExtraEditor
  extends LitElement
  implements LovelaceTileExtraEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceTileExtraContext;

  @state() private _config?: VacuumCommandsTileExtraConfig;

  public setConfig(config: VacuumCommandsTileExtraConfig): void {
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
              options: VACUUM_COMMANDS.filter(
                (command) =>
                  stateObj && supportsVacuumCommand(stateObj, command)
              ).map((command) => ({
                value: command,
                label: `${localize(
                  `ui.panel.lovelace.editor.card.tile.extras.types.vacuum-commands.commands_list.${command}`
                )}`,
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
          `ui.panel.lovelace.editor.card.tile.extras.types.vacuum-commands.${schema.name}`
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
    "hui-vacuum-commands-tile-extra-editor": HuiVacuumCommandsTileExtraEditor;
  }
}
