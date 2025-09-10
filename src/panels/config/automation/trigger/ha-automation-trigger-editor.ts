import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { dynamicElement } from "../../../../common/dom/dynamic-element-directive";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-textfield";
import "../../../../components/ha-yaml-editor";
import type { HaYamlEditor } from "../../../../components/ha-yaml-editor";
import type { Trigger } from "../../../../data/automation";
import { migrateAutomationTrigger } from "../../../../data/automation";
import { isTriggerList } from "../../../../data/trigger";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import "../ha-automation-editor-warning";

@customElement("ha-automation-trigger-editor")
export default class HaAutomationTriggerEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trigger!: Trigger;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean, attribute: "yaml" }) public yamlMode = false;

  @property({ type: Boolean, attribute: "supported" }) public uiSupported =
    false;

  @property({ type: Boolean, attribute: "show-id" }) public showId = false;

  @property({ type: Boolean, attribute: "sidebar" }) public inSidebar = false;

  @query("ha-yaml-editor") public yamlEditor?: HaYamlEditor;

  protected render() {
    const type = isTriggerList(this.trigger) ? "list" : this.trigger.trigger;

    const yamlMode = this.yamlMode || !this.uiSupported;
    const showId = "id" in this.trigger || this.showId;

    return html`
      <div
        class=${classMap({
          "card-content": true,
          disabled:
            this.disabled ||
            ("enabled" in this.trigger &&
              this.trigger.enabled === false &&
              !this.yamlMode),
          yaml: yamlMode,
          card: !this.inSidebar,
        })}
      >
        ${yamlMode
          ? html`
              ${!this.uiSupported
                ? html`
                    <ha-automation-editor-warning
                      .alertTitle=${this.hass.localize(
                        "ui.panel.config.automation.editor.triggers.unsupported_platform",
                        { platform: type }
                      )}
                      .localize=${this.hass.localize}
                    ></ha-automation-editor-warning>
                  `
                : nothing}
              <ha-yaml-editor
                .hass=${this.hass}
                .defaultValue=${this.trigger}
                .readOnly=${this.disabled}
                @value-changed=${this._onYamlChange}
              ></ha-yaml-editor>
            `
          : html`
              ${showId && !isTriggerList(this.trigger)
                ? html`
                    <ha-textfield
                      .label=${this.hass.localize(
                        "ui.panel.config.automation.editor.triggers.id"
                      )}
                      .value=${this.trigger.id || ""}
                      .disabled=${this.disabled}
                      @change=${this._idChanged}
                    >
                    </ha-textfield>
                  `
                : ""}
              <div @value-changed=${this._onUiChanged}>
                ${dynamicElement(`ha-automation-trigger-${type}`, {
                  hass: this.hass,
                  trigger: this.trigger,
                  disabled: this.disabled,
                })}
              </div>
            `}
      </div>
    `;
  }

  private _idChanged(ev: CustomEvent) {
    if (isTriggerList(this.trigger)) return;
    const newId = (ev.target as any).value;

    if (newId === (this.trigger.id ?? "")) {
      return;
    }
    const value = { ...this.trigger };
    if (!newId) {
      delete value.id;
    } else {
      value.id = newId;
    }
    fireEvent(this, "value-changed", {
      value,
    });
  }

  private _onYamlChange(ev: CustomEvent) {
    ev.stopPropagation();
    if (!ev.detail.isValid) {
      return;
    }
    fireEvent(this, this.inSidebar ? "yaml-changed" : "value-changed", {
      value: migrateAutomationTrigger(ev.detail.value),
    });
  }

  private _onUiChanged(ev: CustomEvent) {
    if (isTriggerList(this.trigger)) return;
    ev.stopPropagation();
    const value = {
      ...(this.trigger.alias ? { alias: this.trigger.alias } : {}),
      ...ev.detail.value,
    };
    fireEvent(this, "value-changed", { value });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .disabled {
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
        ha-textfield {
          display: block;
          margin-bottom: 24px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-editor": HaAutomationTriggerEditor;
  }
}
