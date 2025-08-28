import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { dynamicElement } from "../../../../common/dom/dynamic-element-directive";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-yaml-editor";
import type { HaYamlEditor } from "../../../../components/ha-yaml-editor";
import type { Condition } from "../../../../data/automation";
import { expandConditionWithShorthand } from "../../../../data/automation";
import { COLLAPSIBLE_CONDITION_ELEMENTS } from "../../../../data/condition";
import type { HomeAssistant } from "../../../../types";
import "../ha-automation-editor-warning";
import { editorStyles, indentStyle } from "../styles";
import type { ConditionElement } from "./ha-automation-condition-row";

@customElement("ha-automation-condition-editor")
export default class HaAutomationConditionEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) condition!: Condition;

  @property({ type: Boolean }) public disabled = false;

  @property({ attribute: false }) public yamlMode = false;

  @property({ type: Boolean }) public indent = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean, attribute: "sidebar" }) public inSidebar = false;

  @property({ type: Boolean, reflect: true }) public selected = false;

  @property({ type: Boolean, attribute: "supported" }) public uiSupported =
    false;

  @query("ha-yaml-editor") public yamlEditor?: HaYamlEditor;

  @query(COLLAPSIBLE_CONDITION_ELEMENTS.join(", "))
  private _collapsibleElement?: ConditionElement;

  private _processedCondition = memoizeOne((condition) =>
    expandConditionWithShorthand(condition)
  );

  protected render() {
    const condition = this._processedCondition(this.condition);
    const yamlMode = this.yamlMode || !this.uiSupported;

    return html`
      <div
        class=${classMap({
          "card-content": true,
          disabled:
            this.disabled ||
            (this.condition.enabled === false && !this.yamlMode),
          yaml: yamlMode,
          indent: this.indent,
          card: !this.inSidebar,
        })}
      >
        ${yamlMode
          ? html`
              ${!this.uiSupported
                ? html`
                    <ha-automation-editor-warning
                      .alertTitle=${this.hass.localize(
                        "ui.panel.config.automation.editor.conditions.unsupported_condition",
                        { condition: condition.condition }
                      )}
                      .localize=${this.hass.localize}
                    ></ha-automation-editor-warning>
                  `
                : nothing}
              <ha-yaml-editor
                .hass=${this.hass}
                .defaultValue=${this.condition}
                @value-changed=${this._onYamlChange}
                .readOnly=${this.disabled}
              ></ha-yaml-editor>
            `
          : html`
              <div @value-changed=${this._onUiChanged}>
                ${dynamicElement(
                  `ha-automation-condition-${condition.condition}`,
                  {
                    hass: this.hass,
                    condition: condition,
                    disabled: this.disabled,
                    optionsInSidebar: this.indent,
                    narrow: this.narrow,
                  }
                )}
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
    // @ts-ignore
    fireEvent(this, "value-changed", { value: ev.detail.value, yaml: true });
  }

  private _onUiChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = {
      ...(this.condition.alias ? { alias: this.condition.alias } : {}),
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

  static styles = [
    editorStyles,
    indentStyle,
    css`
      :host([action]) .card-content {
        padding: 0;
      }
      :host([action]) .card-content.indent {
        margin-left: 0;
        margin-right: 0;
        padding: 0;
        border-left: none;
        border-bottom: none;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-editor": HaAutomationConditionEditor;
  }
}
