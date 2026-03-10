import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import {
  assert,
  assign,
  boolean,
  literal,
  object,
  optional,
  string,
  union,
} from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-form/ha-form";
import type { HaFormSchema } from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import type { EnergyDateSelectorCardConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    disable_compare: optional(boolean()),
    collection_key: optional(string()),
    vertical_opening_direction: optional(
      union([literal("auto"), literal("up"), literal("down")])
    ),
  })
);

const verticalOpeningDirections = ["auto", "up", "down"] as const;

@customElement("hui-energy-date-selection-card-editor")
export class HuiEnergyDateSelectionCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EnergyDateSelectorCardConfig;

  public setConfig(config: EnergyDateSelectorCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  private _schema = memoizeOne((localize: LocalizeFunc) => {
    const schema: HaFormSchema[] = [
      {
        name: "",
        type: "grid",
        schema: [
          {
            name: "vertical_opening_direction",
            required: false,
            selector: {
              select: {
                options: verticalOpeningDirections.map((direction) => ({
                  value: direction,
                  label: localize(
                    `ui.panel.lovelace.editor.card.energy-date-selection.vertical_opening_directions.${direction}`
                  ),
                })),
              },
            },
          },
          {
            name: "disable_compare",
            required: false,
            selector: { boolean: {} },
          },
          {
            type: "string",
            name: "collection_key",
            required: false,
          },
        ],
      },
    ];
    return schema;
  });

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const data = {
      ...this._config,
    };

    const schema = this._schema(this.hass.localize);

    return html` <ha-form
      .hass=${this.hass}
      .data=${data}
      .schema=${schema}
      .computeLabel=${this._computeLabelCallback}
      .computeHelper=${this._computeHelperCallback}
      @value-changed=${this._valueChanged}
    ></ha-form>`;
  }

  private _valueChanged(ev: CustomEvent): void {
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  private _computeHelperCallback = (schema) => {
    switch (schema.name) {
      case "collection_key":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.collection_key_description`
        );
      default:
        return undefined;
    }
  };

  private _computeLabelCallback = (schema) => {
    switch (schema.name) {
      case "vertical_opening_direction":
      case "disable_compare":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.energy-date-selection.${schema.name}`
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
    "hui-energy-date-selection-card-editor": HuiEnergyDateSelectionCardEditor;
  }
}
