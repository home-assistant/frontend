import { html, nothing } from "lit";
import { customElement } from "lit/decorators";
import {
  any,
  array,
  assert,
  assign,
  boolean,
  number,
  object,
  optional,
  string,
} from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { GridCardConfig } from "../../cards/types";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { HuiStackCardEditor } from "./hui-stack-card-editor";
import { DEFAULT_COLUMNS } from "../../cards/hui-grid-card";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    cards: array(any()),
    title: optional(string()),
    square: optional(boolean()),
    columns: optional(number()),
  })
);

const SCHEMA = [
  {
    type: "grid",
    name: "",
    schema: [
      {
        name: "columns",
        default: DEFAULT_COLUMNS,
        selector: { number: { min: 1, mode: "box" } },
      },
      { name: "square", selector: { boolean: {} } },
    ],
  },
] as const;

@customElement("hui-grid-card-editor")
export class HuiGridCardEditor extends HuiStackCardEditor {
  public setConfig(config: Readonly<GridCardConfig>): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const data = { square: true, ...this._config };

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${SCHEMA}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
      ${super.render()}
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  private _computeLabelCallback = (schema: SchemaUnion<typeof SCHEMA>) =>
    this.hass!.localize(`ui.panel.lovelace.editor.card.grid.${schema.name}`);
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-grid-card-editor": HuiGridCardEditor;
  }
}
