import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { dynamicElement } from "../../../../common/dom/dynamic-element-directive";
import { fireEvent } from "../../../../common/dom/fire_event";
import { handleStructError } from "../../../../common/structs/handle-errors";
import "../../../../components/ha-yaml-editor";
import type { HaYamlEditor } from "../../../../components/ha-yaml-editor";
import type { Condition } from "../../../../data/automation";
import { expandConditionWithShorthand } from "../../../../data/automation";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";

@customElement("ha-automation-condition-editor")
export default class HaAutomationConditionEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) condition!: Condition;

  @property({ type: Boolean }) public disabled = false;

  @property({ attribute: false }) public yamlMode = false;

  @property({ type: Boolean, attribute: "supported" }) public uiSupported =
    false;

  @state() private _warnings?: string[];

  @query("ha-yaml-editor") public yamlEditor?: HaYamlEditor;

  private _processedCondition = memoizeOne((condition) =>
    expandConditionWithShorthand(condition)
  );

  protected willUpdate(changedProperties) {
    // on yaml toggle --> clear warnings
    if (changedProperties.has("yamlMode")) {
      this._warnings = undefined;
    }
  }

  protected render() {
    const condition = this._processedCondition(this.condition);
    const yamlMode = this.yamlMode || !this.uiSupported;

    return html`
      <div
        class=${classMap({
          "card-content": true,
          disabled: this.condition.enabled === false && !this.yamlMode,
          yaml: yamlMode,
        })}
      >
        ${this._warnings
          ? html`<ha-alert
              alert-type="warning"
              .title=${this.hass.localize(
                "ui.errors.config.editor_not_supported"
              )}
            >
              ${this._warnings!.length > 0 && this._warnings![0] !== undefined
                ? html` <ul>
                    ${this._warnings!.map(
                      (warning) => html`<li>${warning}</li>`
                    )}
                  </ul>`
                : ""}
              ${this.hass.localize("ui.errors.config.edit_in_yaml_supported")}
            </ha-alert>`
          : nothing}
        ${yamlMode
          ? html`
              ${!this.uiSupported
                ? html`
                    ${this.hass.localize(
                      "ui.panel.config.automation.editor.conditions.unsupported_condition",
                      { condition: condition.condition }
                    )}
                  `
                : ""}
              <ha-yaml-editor
                .hass=${this.hass}
                .defaultValue=${this.condition}
                @value-changed=${this._onYamlChange}
                .readOnly=${this.disabled}
              ></ha-yaml-editor>
            `
          : html`
              <div
                @ui-mode-not-available=${this._handleUiModeNotAvailable}
                @value-changed=${this._onUiChanged}
              >
                ${dynamicElement(
                  `ha-automation-condition-${condition.condition}`,
                  {
                    hass: this.hass,
                    condition: condition,
                    disabled: this.disabled,
                  }
                )}
              </div>
            `}
      </div>
    `;
  }

  private _handleUiModeNotAvailable(ev: CustomEvent) {
    // Prevent possible parent action-row from switching to yamlMode
    ev.stopPropagation();
    this._warnings = handleStructError(this.hass, ev.detail).warnings;
    if (!this.yamlMode) {
      this.yamlMode = true;
    }
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

  static styles = [
    haStyle,
    css`
      .disabled {
        opacity: 0.5;
        pointer-events: none;
      }

      .card-content {
        padding: 16px;
      }
      .card-content.yaml {
        padding: 0 1px;
        border-top: 1px solid var(--divider-color);
        border-bottom: 1px solid var(--divider-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-editor": HaAutomationConditionEditor;
  }
}
