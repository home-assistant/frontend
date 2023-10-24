import { CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { assert, assign, object, optional, string } from "superstruct";
import { isComponentLoaded } from "../../../../common/config/is_component_loaded";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-alert";
import "../../../../components/ha-form/ha-form";
import { HomeAssistant } from "../../../../types";
import { TodoListCardConfig } from "../../cards/types";
import { LovelaceCardEditor } from "../../types";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { SchemaUnion } from "../../../../components/ha-form/types";
import { configElementStyle } from "./config-elements-style";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    title: optional(string()),
    theme: optional(string()),
    entity: optional(string()),
  })
);

const SCHEMA = [
  { name: "title", selector: { text: {} } },
  {
    name: "entity",
    selector: {
      entity: { domain: "todo" },
    },
  },
  { name: "theme", selector: { theme: {} } },
] as const;

@customElement("hui-todo-list-card-editor")
export class HuiTodoListEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: TodoListCardConfig;

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
          .data=${this._config}
          .schema=${SCHEMA}
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

  private _computeLabelCallback = (schema: SchemaUnion<typeof SCHEMA>) => {
    switch (schema.name) {
      case "theme":
        return `${this.hass!.localize(
          "ui.panel.lovelace.editor.card.generic.theme"
        )} (${this.hass!.localize(
          "ui.panel.lovelace.editor.card.config.optional"
        )})`;
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
