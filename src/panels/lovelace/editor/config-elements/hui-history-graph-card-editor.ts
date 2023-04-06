import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
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
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import type { HistoryGraphCardConfig } from "../../cards/types";
import "../../components/hui-entity-editor";
import type { EntityConfig } from "../../entity-rows/types";
import type { LovelaceCardEditor } from "../../types";
import { processEditorEntities } from "../process-editor-entities";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { entitiesConfigStruct } from "../structs/entities-struct";
import { DEFAULT_HOURS_TO_SHOW } from "../../cards/hui-history-graph-card";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    entities: array(entitiesConfigStruct),
    title: optional(string()),
    hours_to_show: optional(number()),
    refresh_interval: optional(number()), // deprecated
    show_names: optional(boolean()),
  })
);

const SCHEMA = [
  { name: "title", selector: { text: {} } },
  {
    name: "",
    type: "grid",
    schema: [
      {
        name: "hours_to_show",
        default: DEFAULT_HOURS_TO_SHOW,
        selector: { number: { min: 1, mode: "box" } },
      },
    ],
  },
] as const;

@customElement("hui-history-graph-card-editor")
export class HuiHistoryGraphCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: HistoryGraphCardConfig;

  @state() private _configEntities?: EntityConfig[];

  public setConfig(config: HistoryGraphCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
    this._configEntities = processEditorEntities(config.entities);
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${SCHEMA}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
      <hui-entity-editor
        .hass=${this.hass}
        .entities=${this._configEntities}
        @entities-changed=${this._entitiesChanged}
      ></hui-entity-editor>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  private _entitiesChanged(ev: CustomEvent): void {
    let config = this._config!;

    config = { ...config, entities: ev.detail.entities };
    this._configEntities = processEditorEntities(config.entities);

    fireEvent(this, "config-changed", { config });
  }

  private _computeLabelCallback = (schema: SchemaUnion<typeof SCHEMA>) =>
    this.hass!.localize(`ui.panel.lovelace.editor.card.generic.${schema.name}`);

  static styles: CSSResultGroup = css`
    ha-form {
      margin-bottom: 24px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-history-graph-card-editor": HuiHistoryGraphCardEditor;
  }
}
