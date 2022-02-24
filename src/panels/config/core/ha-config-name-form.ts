import "@material/mwc-button/mwc-button";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-card";
import { ConfigUpdateValues, saveCoreConfig } from "../../../data/core";
import type { HomeAssistant } from "../../../types";
import "../../../components/ha-textfield";
import type { HaTextField } from "../../../components/ha-textfield";

@customElement("ha-config-name-form")
class ConfigNameForm extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _working = false;

  @state() private _name!: ConfigUpdateValues["location_name"];

  protected render(): TemplateResult {
    const canEdit = ["storage", "default"].includes(
      this.hass.config.config_source
    );
    const disabled = this._working || !canEdit;

    return html`
      <ha-card>
        <div class="card-content">
          ${!canEdit
            ? html`
                <p>
                  ${this.hass.localize(
                    "ui.panel.config.core.section.core.core_config.edit_requires_storage"
                  )}
                </p>
              `
            : ""}
          <ha-textfield
            class="flex"
            .label=${this.hass.localize(
              "ui.panel.config.core.section.core.core_config.location_name"
            )}
            .disabled=${disabled}
            .value=${this._nameValue}
            @change=${this._handleChange}
          ></ha-textfield>
        </div>
        <div class="card-actions">
          <mwc-button @click=${this._save} .disabled=${disabled}>
            ${this.hass.localize(
              "ui.panel.config.core.section.core.core_config.save_button"
            )}
          </mwc-button>
        </div>
      </ha-card>
    `;
  }

  private get _nameValue() {
    return this._name !== undefined
      ? this._name
      : this.hass.config.location_name;
  }

  private _handleChange(ev) {
    const target = ev.currentTarget as HaTextField;
    this._name = target.value;
  }

  private async _save() {
    this._working = true;
    try {
      await saveCoreConfig(this.hass, {
        location_name: this._nameValue,
      });
    } catch (err: any) {
      alert("FAIL");
    } finally {
      this._working = false;
    }
  }

  static get styles() {
    return css`
      .card-actions {
        text-align: right;
      }
      ha-textfield {
        display: block;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-name-form": ConfigNameForm;
  }
}
