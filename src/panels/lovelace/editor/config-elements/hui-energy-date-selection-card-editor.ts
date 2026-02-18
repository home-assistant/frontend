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
import {
  createEnergyCollectionKey,
  stripEnergyCollectionKeyPrefix,
  validateEnergyCollectionKey,
} from "../../../../data/energy";

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
    if (config.collection_key) {
      validateEnergyCollectionKey(config.collection_key, true);
    }
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
            type: "string",
            name: "collection_group",
            required: false,
          },
          {
            name: "disable_compare",
            required: false,
            selector: { boolean: {} },
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

    if (data.collection_key) {
      data.collection_group = stripEnergyCollectionKeyPrefix(
        data.collection_key
      );
    }

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
    const config = { ...ev.detail.value };
    if (config.collection_group) {
      config.collection_key = createEnergyCollectionKey(
        config.collection_group
      );
    } else {
      config.collection_key = undefined;
    }
    delete config.collection_group;
    fireEvent(this, "config-changed", { config: config });
  }

  private _computeHelperCallback = (schema) => {
    switch (schema.name) {
      case "collection_group":
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
      case "collection_group":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.energy-date-selection.collection_key`
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
