import type { CSSResultGroup } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { assert, assign, boolean, object, optional, string } from "superstruct";
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
import {
  SORT_ALPHA,
  SORT_DUEDATE,
  SORT_NONE,
} from "../../cards/hui-todo-list-card";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    title: optional(string()),
    theme: optional(string()),
    entity: optional(string()),
    hide_completed: optional(boolean()),
    sort: optional(string()),
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
    (localize: LocalizeFunc) =>
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
        {
          name: "sort",
          selector: {
            select: {
              options: [SORT_NONE, SORT_ALPHA, SORT_DUEDATE].map((sort) => ({
                value: sort,
                label: localize(
                  `ui.panel.lovelace.editor.card.todo-list.sort_modes.${sort}`
                ),
              })),
            },
          },
        },
      ] as const
  );

  private _data = memoizeOne((config) => ({ sort: "none", ...config }));

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
          .schema=${this._schema(this.hass.localize)}
          .computeLabel=${this._computeLabelCallback}
          @value-changed=${this._valueChanged}
        ></ha-form>
      </div>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    const config = ev.detail.value;
    fireEvent(this, "config-changed", { config });
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
      case "sort":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.todo-list.${schema.name}`
        );
      default:
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        );
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
