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
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
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
        name: "title",
        selector: { text: {} },
      },
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
  protected _schema: readonly HaFormSchema[] = SCHEMA;

  public setConfig(config: Readonly<GridCardConfig>): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  protected formData(): object {
    return { square: true, ...this._config };
  }

  protected _computeLabelCallback = (schema: SchemaUnion<typeof SCHEMA>) =>
    this.hass!.localize(`ui.panel.lovelace.editor.card.grid.${schema.name}`);
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-grid-card-editor": HuiGridCardEditor;
  }
}
