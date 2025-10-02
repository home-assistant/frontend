import { html, LitElement, nothing } from "lit";
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
  union,
} from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import "../hui-sub-element-editor";
import type { EditDetailElementEvent, SubElementEditorConfig } from "../types";
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import type { ConfigEntity, GlanceCardConfig } from "../../cards/types";
import "../../components/hui-entity-editor";
import type { LovelaceCardEditor } from "../../types";
import { processEditorEntities } from "../process-editor-entities";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { entitiesConfigStruct } from "../structs/entities-struct";
import type { EntityConfig } from "../../entity-rows/types";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    title: optional(union([string(), number()])),
    theme: optional(string()),
    columns: optional(number()),
    show_name: optional(boolean()),
    show_state: optional(boolean()),
    show_icon: optional(boolean()),
    state_color: optional(boolean()),
    entities: array(entitiesConfigStruct),
  })
);

const SUB_SCHEMA = [
  { name: "entity", selector: { entity: {} }, required: true },
  {
    type: "grid",
    name: "",
    schema: [
      { name: "name", selector: { text: {} } },
      {
        name: "icon",
        selector: {
          icon: {},
        },
        context: {
          icon_entity: "entity",
        },
      },
      { name: "show_last_changed", selector: { boolean: {} } },
      { name: "show_state", selector: { boolean: {} }, default: true },
    ],
  },
  {
    name: "tap_action",
    selector: {
      ui_action: {
        default_action: "more-info",
      },
    },
  },
  {
    name: "",
    type: "optional_actions",
    flatten: true,
    schema: (["hold_action", "double_tap_action"] as const).map((action) => ({
      name: action,
      selector: {
        ui_action: {
          default_action: "none" as const,
        },
      },
    })),
  },
] as const;

const SCHEMA = [
  { name: "title", selector: { text: {} } },
  {
    name: "",
    type: "grid",
    schema: [
      { name: "columns", selector: { number: { min: 1, mode: "box" } } },
      { name: "theme", selector: { theme: {} } },
    ],
  },
  {
    name: "",
    type: "grid",
    column_min_width: "100px",
    schema: [
      { name: "show_name", selector: { boolean: {} } },
      { name: "show_icon", selector: { boolean: {} } },
      { name: "show_state", selector: { boolean: {} } },
    ],
  },
  { name: "state_color", selector: { boolean: {} } },
] as const;

@customElement("hui-glance-card-editor")
export class HuiGlanceCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: GlanceCardConfig;

  @state() private _subElementEditorConfig?: SubElementEditorConfig;

  @state() private _configEntities?: ConfigEntity[];

  public setConfig(config: GlanceCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
    this._configEntities = processEditorEntities(config.entities);
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    if (this._subElementEditorConfig) {
      return html`
        <hui-sub-element-editor
          .hass=${this.hass}
          .config=${this._subElementEditorConfig}
          .schema=${SUB_SCHEMA}
          @go-back=${this._goBack}
          @config-changed=${this._handleSubEntityChanged}
        >
        </hui-sub-element-editor>
      `;
    }

    const data = {
      show_name: true,
      show_icon: true,
      show_state: true,
      ...this._config,
    };

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${SCHEMA}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
      <hui-entity-editor
        .hass=${this.hass}
        can-edit
        .entities=${this._configEntities}
        @entities-changed=${this._entitiesChanged}
        @edit-detail-element=${this._editDetailElement}
      ></hui-entity-editor>
    `;
  }

  private _goBack(): void {
    this._subElementEditorConfig = undefined;
  }

  private _editDetailElement(ev: HASSDomEvent<EditDetailElementEvent>): void {
    this._subElementEditorConfig = ev.detail.subElementConfig;
  }

  private _handleSubEntityChanged(ev: CustomEvent): void {
    ev.stopPropagation();

    const index = this._subElementEditorConfig!.index!;

    const newEntities = this._configEntities!.concat();
    const newConfig = ev.detail.config as EntityConfig;
    this._subElementEditorConfig = {
      ...this._subElementEditorConfig!,
      elementConfig: newConfig,
    };
    newEntities[index] = newConfig;
    let config = this._config!;
    config = { ...config, entities: newEntities };
    this._config = config;
    this._configEntities = processEditorEntities(config.entities);

    fireEvent(this, "config-changed", { config });
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

  private _computeLabelCallback = (schema: SchemaUnion<typeof SCHEMA>) => {
    switch (schema.name) {
      case "theme":
        return `${this.hass!.localize(
          "ui.panel.lovelace.editor.card.generic.theme"
        )} (${this.hass!.localize(
          "ui.panel.lovelace.editor.card.config.optional"
        )})`;
      case "columns":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.glance.${schema.name}`
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
    "hui-glance-card-editor": HuiGlanceCardEditor;
  }
}
