import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { dynamicElement } from "../../../../common/dom/dynamic-element-directive";
import { fireEvent } from "../../../../common/dom/fire_event";
import { handleStructError } from "../../../../common/structs/handle-errors";
import "../../../../components/ha-yaml-editor";
import type { HaYamlEditor } from "../../../../components/ha-yaml-editor";
import { migrateAutomationAction, type Action } from "../../../../data/script";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { getAutomationActionType } from "./ha-automation-action-row";

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

  @state() private _warnings?: string[];

  @query("ha-yaml-editor") public yamlEditor?: HaYamlEditor;

  protected willUpdate(changedProperties) {
    // on yaml toggle --> clear warnings
    if (changedProperties.has("yamlMode")) {
      this._warnings = undefined;
    }
  }

  protected render() {
    const yamlMode = this.yamlMode || !this.uiSupported;
    const type = getAutomationActionType(this.action);

    return html`
      <div
        class=${classMap({
          "card-content": true,
          disabled: this.action.enabled === false && !this.yamlMode,
          yaml: yamlMode,
          indent: this.indent,
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
                ? html`<ul>
                    ${this._warnings!.map(
                      (warning) => html`<li>${warning}</li>`
                    )}
                  </ul>`
                : nothing}
              ${this.hass.localize("ui.errors.config.edit_in_yaml_supported")}
            </ha-alert>`
          : nothing}
        ${yamlMode
          ? html`
              ${!this.uiSupported
                ? html`
                    ${this.hass.localize(
                      "ui.panel.config.automation.editor.actions.unsupported_action"
                    )}
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
              <div
                @ui-mode-not-available=${this._handleUiModeNotAvailable}
                @value-changed=${this._onUiChanged}
              >
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
      .card-content.indent {
        margin-top: 0;
        margin-right: 8px;
        margin-left: 12px;
        padding: 12px 16px 16px;
        border-left: 2px solid var(--color-border-neutral-normal);
        background: transparent;
        border-bottom-right-radius: 12px;
      }
      :host([selected]) .card-content.indent {
        background-color: var(--color-fill-neutral-quiet-resting);
        border-color: var(--primary-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-editor": HaAutomationActionEditor;
  }
}
