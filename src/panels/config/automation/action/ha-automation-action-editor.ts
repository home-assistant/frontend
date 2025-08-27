import { html, LitElement, nothing } from "lit";
import { customElement, property, query } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { dynamicElement } from "../../../../common/dom/dynamic-element-directive";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-yaml-editor";
import type { HaYamlEditor } from "../../../../components/ha-yaml-editor";
import { COLLAPSIBLE_ACTION_ELEMENTS } from "../../../../data/action";
import { migrateAutomationAction, type Action } from "../../../../data/script";
import type { HomeAssistant } from "../../../../types";
import "../ha-automation-editor-warning";
import { editorStyles, indentStyle } from "../styles";
import {
  getAutomationActionType,
  type ActionElement,
} from "./ha-automation-action-row";

@customElement("ha-automation-action-editor")
export default class HaAutomationActionEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) action!: Action;

  @property({ type: Boolean }) public disabled = false;

  @property({ attribute: false }) public yamlMode = false;

  @property({ type: Boolean }) public indent = false;

  @property({ type: Boolean, reflect: true }) public selected = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean, attribute: "sidebar" }) public inSidebar = false;

  @property({ type: Boolean, attribute: "supported" }) public uiSupported =
    false;

  @query("ha-yaml-editor") public yamlEditor?: HaYamlEditor;

  @query(COLLAPSIBLE_ACTION_ELEMENTS.join(", "))
  private _collapsibleElement?: ActionElement;

  protected render() {
    const yamlMode = this.yamlMode || !this.uiSupported;
    const type = getAutomationActionType(this.action);

    return html`
      <div
        class=${classMap({
          "card-content": true,
          disabled:
            this.disabled || (this.action.enabled === false && !this.yamlMode),
          yaml: yamlMode,
          indent: this.indent,
        })}
      >
        ${yamlMode
          ? html`
              ${!this.uiSupported
                ? html`
                    <ha-automation-editor-warning
                      .alertTitle=${this.hass.localize(
                        "ui.panel.config.automation.editor.actions.unsupported_action"
                      )}
                      .localize=${this.hass.localize}
                    ></ha-automation-editor-warning>
                  `
                : nothing}
              <ha-yaml-editor
                .hass=${this.hass}
                .defaultValue=${this.action}
                @value-changed=${this._onYamlChange}
                .readOnly=${this.disabled}
              ></ha-yaml-editor>
            `
          : html`
              <div @value-changed=${this._onUiChanged}>
                ${dynamicElement(`ha-automation-action-${type}`, {
                  hass: this.hass,
                  action: this.action,
                  disabled: this.disabled,
                  narrow: this.narrow,
                  optionsInSidebar: this.indent,
                  indent: this.indent,
                  inSidebar: this.inSidebar,
                })}
              </div>
            `}
      </div>
    `;
  }

  private _onYamlChange(ev: CustomEvent) {
    ev.stopPropagation();
    if (!ev.detail.isValid) {
      return;
    }
    fireEvent(this, "value-changed", {
      value: migrateAutomationAction(ev.detail.value),
    });
  }

  private _onUiChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = {
      ...(this.action.alias ? { alias: this.action.alias } : {}),
      ...ev.detail.value,
    };
    fireEvent(this, "value-changed", { value });
  }

  public expandAll() {
    this._collapsibleElement?.expandAll?.();
  }

  public collapseAll() {
    this._collapsibleElement?.collapseAll?.();
  }

  static styles = [editorStyles, indentStyle];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-editor": HaAutomationActionEditor;
  }
}
