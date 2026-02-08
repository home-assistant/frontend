import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { assert, assign, object, optional, string } from "superstruct";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type { HaFormSchema } from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import type { EnergyCardBaseConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import {
  getActiveEnergyCollectionKeys,
  stripEnergyCollectionKeyPrefix,
  validateEnergyCollectionKey,
} from "../../../../data/energy";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    title: optional(string()),
    collection_key: optional(string()),
  })
);

@customElement("hui-energy-graph-card-editor")
export class HuiEnergyGraphCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EnergyCardBaseConfig;

  public setConfig(config: EnergyCardBaseConfig): void {
    assert(config, cardConfigStruct);
    if (config.collection_key) {
      validateEnergyCollectionKey(config.collection_key, true);
    }
    this._config = config;
  }

  private _schema = memoizeOne((collectionKeys: string[] | undefined) => {
    const schema: HaFormSchema[] = [
      { name: "title", selector: { text: {} } },
      {
        name: "collection_key",
        required: false,
        disabled: !collectionKeys?.length,
        selector: {
          select: {
            mode: "dropdown",
            options: collectionKeys
              ? collectionKeys.map((key) => ({
                  value: key,
                  label: stripEnergyCollectionKeyPrefix(key),
                }))
              : [""],
          },
        },
      },
    ];
    return schema;
  });

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const schema = this._schema(getActiveEnergyCollectionKeys(this.hass));

    const data = {
      ...this._config,
    };

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
      default:
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        );
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-graph-card-editor": HuiEnergyGraphCardEditor;
  }
}
