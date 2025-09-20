import type { CSSResultGroup } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { assert, assign, boolean, object, optional, string } from "superstruct";
import { mdiGestureTap } from "@mdi/js";
import {
  ITEM_TAP_ACTION_EDIT,
  ITEM_TAP_ACTION_TOGGLE,
} from "../../cards/hui-todo-list-card";
import { isComponentLoaded } from "../../../../common/config/is_component_loaded";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-alert";
import "../../../../components/ha-form/ha-form";
import type { HomeAssistant } from "../../../../types";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import type { TodoListCardConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import { configElementStyle } from "./config-elements-style";
import { TodoListEntityFeature, TodoSortMode } from "../../../../data/todo";
import { supportsFeature } from "../../../../common/entity/supports-feature";

const ITEM_TAP_ACTIONS = [ITEM_TAP_ACTION_EDIT, ITEM_TAP_ACTION_TOGGLE];

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    title: optional(string()),
    theme: optional(string()),
    entity: optional(string()),
    hide_completed: optional(boolean()),
    hide_create: optional(boolean()),
    hide_status: optional(boolean()),
    display_order: optional(string()),
    item_tap_action: optional(string()),
  })
);

@customElement("hui-todo-list-card-editor")
export class HuiTodoListEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: TodoListCardConfig;

  private _schema = memoizeOne(
    (localize: LocalizeFunc, supportsManualSort: boolean) =>
      [
        { name: "title", selector: { text: {} } },
        {
          name: "entity",
          selector: {
            entity: { domain: "todo" },
          },
        },
        { name: "theme", selector: { theme: {} } },
        { name: "hide_completed", selector: { boolean: {} } },
        { name: "hide_create", selector: { boolean: {} } },
        { name: "hide_status", selector: { boolean: {} } },
        {
          name: "display_order",
          selector: {
            select: {
              options: Object.values(TodoSortMode).map((sort) => ({
                value: sort,
                label: localize(
                  `ui.panel.lovelace.editor.card.todo-list.sort_modes.${sort === TodoSortMode.NONE && supportsManualSort ? "manual" : sort}`
                ),
              })),
            },
          },
        },
        {
          name: "interactions",
          type: "expandable",
          flatten: true,
          iconPath: mdiGestureTap,
          schema: [
            {
              name: "item_tap_action",
              required: true,
              selector: {
                select: {
                  mode: "dropdown",
                  options: Object.values(ITEM_TAP_ACTIONS).map((action) => ({
                    value: action,
                    label: localize(
                      `ui.panel.lovelace.editor.card.todo-list.actions.${action}`
                    ),
                  })),
                },
              },
            },
          ],
        },
      ] as const
  );

  private _data = memoizeOne((config) => ({
    display_order: "none",
    item_tap_action: "edit",
    ...config,
  }));

  public setConfig(config: TodoListCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    return html`
        ${
          !isComponentLoaded(this.hass, "todo")
            ? html`
                <ha-alert alert-type="error">
                  ${this.hass.localize(
                    "ui.panel.lovelace.editor.card.shopping-list.integration_not_loaded"
                  )}
                </ha-alert>
              `
            : ""
        }
        <ha-form
          .hass=${this.hass}
          .data=${this._data(this._config)}
          .schema=${this._schema(this.hass.localize, this._todoListSupportsFeature(TodoListEntityFeature.MOVE_TODO_ITEM))}
          .computeLabel=${this._computeLabelCallback}
          .computeHelper=${this._computeHelperCallback}
          @value-changed=${this._valueChanged}
        ></ha-form>
      </div>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    const config = { ...ev.detail.value };
    if (config.item_tap_action === ITEM_TAP_ACTION_EDIT) {
      delete config.item_tap_action;
    }
    fireEvent(this, "config-changed", { config });
  }

  private _todoListSupportsFeature(feature: number): boolean {
    const entityStateObj = this._config?.entity
      ? this.hass!.states[this._config?.entity]
      : undefined;
    return !!entityStateObj && supportsFeature(entityStateObj, feature);
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "theme":
        return `${this.hass!.localize(
          "ui.panel.lovelace.editor.card.generic.theme"
        )} (${this.hass!.localize(
          "ui.panel.lovelace.editor.card.config.optional"
        )})`;
      case "hide_completed":
      case "hide_create":
      case "hide_status":
      case "display_order":
      case "item_tap_action":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.todo-list.${schema.name}`
        );
      default:
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        );
    }
  };

  private _computeHelperCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "hide_status":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.todo-list.${schema.name}_helper`
        );
      default:
        return undefined;
    }
  };

  static get styles(): CSSResultGroup {
    return configElementStyle;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-todo-list-card-editor": HuiTodoListEditor;
  }
}
