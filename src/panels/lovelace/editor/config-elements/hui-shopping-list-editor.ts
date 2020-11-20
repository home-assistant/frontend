import "@polymer/paper-input/paper-input";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { assert, object, optional, string } from "superstruct";
import { isComponentLoaded } from "../../../../common/config/is_component_loaded";
import { fireEvent } from "../../../../common/dom/fire_event";
import { HomeAssistant } from "../../../../types";
import { ShoppingListCardConfig } from "../../cards/types";
import "../../components/hui-theme-select-editor";
import { LovelaceCardEditor } from "../../types";
import "../hui-config-element-template";
import { EditorTarget, EntitiesEditorEvent } from "../types";

const cardConfigStruct = object({
  type: string(),
  title: optional(string()),
  theme: optional(string()),
});

@customElement("hui-shopping-list-card-editor")
export class HuiShoppingListEditor extends LitElement
  implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Boolean }) public isAdvanced?: boolean;

  @internalProperty() private _config?: ShoppingListCardConfig;

  public setConfig(config: ShoppingListCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  get _title(): string {
    return this._config!.title || "";
  }

  get _theme(): string {
    return this._config!.theme || "";
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    return html`
      <hui-config-element-template
        .hass=${this.hass}
        .isAdvanced=${this.isAdvanced}
      >
        <div class="card-config">
          ${!isComponentLoaded(this.hass, "shopping_list")
            ? html`
                <div class="error">
                  ${this.hass.localize(
                    "ui.panel.lovelace.editor.card.shopping-list.integration_not_loaded"
                  )}
                </div>
              `
            : ""}
          <paper-input
            .label=${this.hass.localize(
              "ui.panel.lovelace.editor.card.generic.title"
            )}
            .value=${this._title}
            .configValue=${"title"}
            @value-changed=${this._valueChanged}
          ></paper-input>
        </div>
        <div slot="advanced" class="card-config">
          <hui-theme-select-editor
            .hass=${this.hass}
            .value=${this._theme}
            .configValue=${"theme"}
            @value-changed=${this._valueChanged}
          ></hui-theme-select-editor>
        </div>
      </hui-config-element-template>
    `;
  }

  private _valueChanged(ev: EntitiesEditorEvent): void {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target! as EditorTarget;

    if (this[`_${target.configValue}`] === target.value) {
      return;
    }
    if (target.configValue) {
      if (target.value === "") {
        this._config = { ...this._config };
        delete this._config[target.configValue!];
      } else {
        this._config = {
          ...this._config,
          [target.configValue!]: target.value,
        };
      }
    }
    fireEvent(this, "config-changed", { config: this._config });
  }

  static get styles(): CSSResult {
    return css`
      .error {
        color: var(--error-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-shopping-list-card-editor": HuiShoppingListEditor;
  }
}
