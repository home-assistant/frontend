import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import "@polymer/paper-menu-button/paper-menu-button";
import { safeDump, safeLoad } from "js-yaml";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
} from "lit-element";
import { dynamicContentDirective } from "../../../../common/dom/dynamic-content-directive";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-card";
import { HomeAssistant } from "../../../../types";
import "./types/ha-automation-trigger-device";
import "./types/ha-automation-trigger-state";

const OPTIONS = [
  "device",
  "event",
  "state",
  "geo_location",
  "homeassistant",
  "mqtt",
  "numeric_state",
  "sun",
  "template",
  "time",
  "time_pattern",
  "webhook",
  "zone",
];

@customElement("ha-automation-trigger-row")
export default class HaAutomationTriggerRow extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public trigger;
  @property() private _yamlMode = false;
  @property() private _yaml = "";
  @property() private error = "";

  protected updated(changedProps: PropertyValues) {
    if (changedProps.has("_yamlMode") && this._yamlMode) {
      this._yaml = safeDump(this.trigger);
    }
  }

  protected render() {
    if (!this.trigger) {
      return html``;
    }
    const hasEditor = OPTIONS.includes(this.trigger.platform);
    if (!hasEditor) {
      this._yamlMode = true;
    }
    const selected = OPTIONS.indexOf(this.trigger.platform);
    return html`
      <ha-card>
        <div class="card-content">
          <div class="card-menu">
            <paper-menu-button
              no-animations
              horizontal-align="right"
              horizontal-offset="-5"
              vertical-offset="-5"
              close-on-activate
            >
              <paper-icon-button
                icon="hass:dots-vertical"
                slot="dropdown-trigger"
              ></paper-icon-button>
              <paper-listbox slot="dropdown-content">
                <paper-item @click=${this._switchYamlMode}>
                  ${this._yamlMode
                    ? this.hass.localize(
                        "ui.panel.config.automation.editor.edit_ui"
                      )
                    : this.hass.localize(
                        "ui.panel.config.automation.editor.edit_yaml"
                      )}
                </paper-item>
                <paper-item disabled>
                  ${this.hass.localize(
                    "ui.panel.config.automation.editor.triggers.duplicate"
                  )}
                </paper-item>
                <paper-item @click=${this._onDelete}>
                  ${this.hass.localize(
                    "ui.panel.config.automation.editor.triggers.delete"
                  )}
                </paper-item>
              </paper-listbox>
            </paper-menu-button>
          </div>
          ${this.error}
          ${this._yamlMode
            ? html`
                <div style="margin-right: 24px;">
                  ${!hasEditor
                    ? html`
                        ${this.hass.localize(
                          "ui.panel.config.automation.editor.triggers.unsupported_platform",
                          "platform",
                          this.trigger.platform
                        )}
                      `
                    : ""}
                  <ha-code-editor
                    .value=${this._yaml}
                    mode="yaml"
                    @value-changed=${this._onYamlChange}
                  ></ha-code-editor>
                </div>
              `
            : html`
                <paper-dropdown-menu-light
                  .label=${this.hass.localize(
                    "ui.panel.config.automation.editor.triggers.type_select"
                  )}
                  no-animations
                >
                  <paper-listbox
                    slot="dropdown-content"
                    .selected=${selected}
                    @iron-select=${this._typeChanged}
                  >
                    ${OPTIONS.map(
                      (opt) => html`
                        <paper-item .platform=${opt}>
                          ${this.hass.localize(
                            `ui.panel.config.automation.editor.triggers.type.${opt}.label`
                          )}
                        </paper-item>
                      `
                    )}
                  </paper-listbox>
                </paper-dropdown-menu-light>
                ${dynamicContentDirective(
                  `ha-automation-trigger-${this.trigger.platform}`,
                  { hass: this.hass, trigger: this.trigger }
                )}
              `}
        </div>
      </ha-card>
    `;
  }

  private _onDelete() {
    if (
      confirm(
        this.hass.localize(
          "ui.panel.config.automation.editor.triggers.delete_confirm"
        )
      )
    ) {
      fireEvent(this, "value-changed", { value: null });
    }
  }

  private _typeChanged(ev) {
    const type = ev.target.selectedItem.platform;

    const elClass = customElements.get(`ha-automation-trigger-${type}`);

    if (type !== this.trigger.platform) {
      fireEvent(this, "value-changed", {
        value: {
          platform: type,
          ...elClass.defaultConfig,
        },
      });
    }
  }

  private _onYamlChange(ev: CustomEvent) {
    ev.stopPropagation();
    let value;
    try {
      value = safeLoad(ev.detail.value);
      this.error = "";
    } catch (err) {
      this.error = err;
    }
    if (value) {
      fireEvent(this, "value-changed", { value });
    }
  }

  private _switchYamlMode() {
    this._yamlMode = !this._yamlMode;
  }

  static get styles(): CSSResult {
    return css`
      .card-menu {
        position: absolute;
        top: 0;
        right: 0;
        z-index: 3;
        color: var(--primary-text-color);
      }
      .rtl .card-menu {
        right: auto;
        left: 0;
      }
      .card-menu paper-item {
        cursor: pointer;
      }
    `;
  }
}
