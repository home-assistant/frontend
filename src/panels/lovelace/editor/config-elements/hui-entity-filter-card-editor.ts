import "@material/mwc-tab-bar/mwc-tab-bar";
import "@material/mwc-tab/mwc-tab";
import { LitElement, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import {
  any,
  array,
  assert,
  assign,
  literal,
  number,
  object,
  optional,
  string,
  union,
} from "superstruct";
import { storage } from "../../../../common/decorators/storage";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-list-item";
import "../../../../components/ha-svg-icon";
import { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import { LovelaceConfig } from "../../../../data/lovelace/config/types";
import type { HomeAssistant } from "../../../../types";
import type { EntityFilterCardConfig } from "../../cards/types";
import type { EntityFilterEntityConfig } from "../../entity-rows/types";
import type { LovelaceCardEditor } from "../../types";
import "../card-editor/hui-card-element-editor";
import type { HuiCardElementEditor } from "../card-editor/hui-card-element-editor";
import "../card-editor/hui-card-picker";
import "../conditions/ha-card-conditions-editor";
import "../hui-element-editor";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { entitiesConfigStruct } from "../structs/entities-struct";
import { SchemaUnion } from "../../../../components/ha-form/types";
import { processEditorEntities } from "../process-editor-entities";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    card: optional(
      object({
        title: optional(union([string(), number()])),
        type: optional(union([literal("entities"), literal("glance")])),
      })
    ),
    entities: array(entitiesConfigStruct),
    conditions: optional(array(any())),
  })
);

const SCHEMA = [
  { name: "title", selector: { text: {} } },
  { name: "type", selector: { text: {} } },
] as const;

@customElement("hui-entity-filter-card-editor")
export class HuiEntityFilterCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public lovelace?: LovelaceConfig;

  @storage({
    key: "lovelaceClipboard",
    state: false,
    subscribe: false,
    storage: "sessionStorage",
  })
  protected _clipboard?: LovelaceCardConfig;

  @state() private _config?: EntityFilterCardConfig;

  @state() private _configEntities?: EntityFilterEntityConfig[];

  @query("hui-card-element-editor")
  private _cardEditorEl?: HuiCardElementEditor;

  public setConfig(config: EntityFilterCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  public focusYamlEditor() {
    this._cardEditorEl?.focusYamlEditor();
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
      <ha-card-conditions-editor
        .hass=${this.hass}
        .conditions=${this._config.conditions}
        @value-changed=${this._conditionChanged}
      >
      </ha-card-conditions-editor>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    const config = ev.detail.value;
    fireEvent(this, "config-changed", { config });
  }

  private _entitiesChanged(ev: CustomEvent): void {
    let config = this._config!;
    config = { ...config, entities: ev.detail.entities! };

    this._configEntities = processEditorEntities(this._config!.entities);
    fireEvent(this, "config-changed", { config });
  }

  private _conditionChanged(ev: CustomEvent) {
    ev.stopPropagation();
    if (!this._config) {
      return;
    }
    const conditions = ev.detail.value;
    this._config = { ...this._config, conditions };
    fireEvent(this, "config-changed", { config: this._config });
  }

  private _computeLabelCallback = (schema: SchemaUnion<typeof SCHEMA>) => {
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
    "hui-entity-filter-card-editor": HuiEntityFilterCardEditor;
  }
}
