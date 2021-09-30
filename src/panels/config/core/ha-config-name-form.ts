import "@material/mwc-button/mwc-button";
import "@polymer/paper-input/paper-input";
import type { PaperInputElement } from "@polymer/paper-input/paper-input";
import "@polymer/paper-radio-button/paper-radio-button";
import "@polymer/paper-radio-group/paper-radio-group";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-card";
import { ConfigUpdateValues, saveCoreConfig } from "../../../data/core";
import type { PolymerChangedEvent } from "../../../polymer-types";
import type { HomeAssistant } from "../../../types";

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
          <paper-input
            class="flex"
            .label=${this.hass.localize(
              "ui.panel.config.core.section.core.core_config.location_name"
            )}
            name="name"
            .disabled=${disabled}
            .value=${this._nameValue}
            @value-changed=${this._handleChange}
          ></paper-input>
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

  private _handleChange(ev: PolymerChangedEvent<string>) {
    const target = ev.currentTarget as PaperInputElement;
    this[`_${target.name}`] = target.value;
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-name-form": ConfigNameForm;
  }
}
