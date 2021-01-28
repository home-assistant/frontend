import "@material/mwc-button";
import { ActionDetail } from "@material/mwc-list";
import "@material/mwc-list/mwc-list-item";
import { mdiDotsVertical } from "@mdi/js";
import "@polymer/iron-autogrow-textarea/iron-autogrow-textarea";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  query,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../../../src/common/dom/fire_event";
import "../../../../src/components/buttons/ha-progress-button";
import "../../../../src/components/ha-button-menu";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-form/ha-form";
import "../../../../src/components/ha-yaml-editor";
import type { HaYamlEditor } from "../../../../src/components/ha-yaml-editor";
import {
  HassioAddonDetails,
  HassioAddonSetOptionParams,
  setHassioAddonOption,
} from "../../../../src/data/hassio/addon";
import { extractApiErrorMessage } from "../../../../src/data/hassio/common";
import { showConfirmationDialog } from "../../../../src/dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../src/resources/styles";
import type { HomeAssistant } from "../../../../src/types";
import { suggestAddonRestart } from "../../dialogs/suggestAddonRestart";
import { hassioStyle } from "../../resources/hassio-style";

const SUPPORTED_UI_TYPES = ["string", "select", "boolean", "integer", "float"];

@customElement("hassio-addon-config")
class HassioAddonConfig extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public addon!: HassioAddonDetails;

  @internalProperty() private _error?: string;

  @internalProperty() private _canShowSchema = false;

  @internalProperty() private _yamlMode = false;

  @property({ type: Boolean }) private _configHasChanged = false;

  @property({ type: Boolean }) private _valid = true;

  @query("ha-yaml-editor") private _editor?: HaYamlEditor;

  protected render(): TemplateResult {
    return html`
      <h1>${this.addon.name}</h1>
      <ha-card>
        <div class="header">
          <h2>Configuration</h2>
          ${this._canShowSchema
            ? html`<div class="card-menu">
                <ha-button-menu
                  corner="BOTTOM_START"
                  @action=${this._handleAction}
                >
                  <mwc-icon-button slot="trigger">
                    <ha-svg-icon .path=${mdiDotsVertical}></ha-svg-icon>
                  </mwc-icon-button>
                  <mwc-list-item>
                    ${this._yamlMode ? "Edit in UI" : "Edit in YAML"}
                  </mwc-list-item>
                </ha-button-menu>
              </div>`
            : ""}
        </div>

        <div class="card-content">
          ${!this._yamlMode && this._canShowSchema && this.addon.schema
            ? html`<ha-form
                .data=${this.addon.options}
                @value-changed=${this._configChanged}
                .schema=${this.addon.schema}
                .error=${this._error}
              ></ha-form>`
            : html` <ha-yaml-editor
                @value-changed=${this._configChanged}
              ></ha-yaml-editor>`}
          ${this._error ? html` <div class="errors">${this._error}</div> ` : ""}
          ${!this._yamlMode ||
          (this._canShowSchema && this.addon.schema) ||
          this._valid
            ? ""
            : html` <div class="errors">Invalid YAML</div> `}
        </div>
        <div class="card-actions">
          <ha-progress-button class="warning" @click=${this._resetTapped}>
            Reset to defaults
          </ha-progress-button>
          <ha-progress-button
            @click=${this._saveTapped}
            .disabled=${!this._configHasChanged || !this._valid}
          >
            Save
          </ha-progress-button>
        </div>
      </ha-card>
    `;
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (changedProperties.has("addon") || changedProperties.has("_yamlMode")) {
      this._canShowSchema = !this.addon.schema.find(
        (entry) => !SUPPORTED_UI_TYPES.includes(entry.type)
      );

      const editor = this._editor;
      if (editor) {
        editor.setValue(this.addon.options);
      }
    }
  }

  private _handleAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        this._yamlMode = !this._yamlMode;
        break;
    }
  }

  private _configChanged(ev): void {
    if (this.addon.schema && this._canShowSchema) {
      this.addon.options = ev.detail.value;
      this._valid = true;
      this._configHasChanged = true;
    } else {
      this._configHasChanged = true;
      this._valid = ev.detail.isValid;
    }
  }

  private async _resetTapped(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    button.progress = true;

    const confirmed = await showConfirmationDialog(this, {
      title: this.addon.name,
      text: "Are you sure you want to reset all your options?",
      confirmText: "reset options",
      dismissText: "no",
    });

    if (!confirmed) {
      button.progress = false;
      return;
    }

    this._error = undefined;
    const data: HassioAddonSetOptionParams = {
      options: null,
    };
    try {
      await setHassioAddonOption(this.hass, this.addon.slug, data);
      this._configHasChanged = false;
      const eventdata = {
        success: true,
        response: undefined,
        path: "options",
      };
      fireEvent(this, "hass-api-called", eventdata);
    } catch (err) {
      this._error = `Failed to reset addon configuration, ${extractApiErrorMessage(
        err
      )}`;
    }
    button.progress = false;
  }

  private async _saveTapped(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    button.progress = true;

    let data: HassioAddonSetOptionParams;
    this._error = undefined;
    if (!this._yamlMode) {
      data = {
        options: this.addon.options,
      };
    } else {
      data = {
        options: this._editor?.value,
      };
    }
    try {
      await setHassioAddonOption(this.hass, this.addon.slug, data);
      this._configHasChanged = false;
      const eventdata = {
        success: true,
        response: undefined,
        path: "options",
      };
      fireEvent(this, "hass-api-called", eventdata);
      if (this.addon?.state === "started") {
        await suggestAddonRestart(this, this.hass, this.addon);
      }
    } catch (err) {
      this._error = `Failed to save addon configuration, ${extractApiErrorMessage(
        err
      )}`;
    }
    button.progress = false;
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      hassioStyle,
      css`
        :host {
          display: block;
        }
        ha-card {
          display: block;
        }
        .card-actions {
          display: flex;
          justify-content: space-between;
        }
        .errors {
          color: var(--error-color);
          margin-top: 16px;
        }
        iron-autogrow-textarea {
          width: 100%;
          font-family: var(--code-font-family, monospace);
        }
        .syntaxerror {
          color: var(--error-color);
        }
        .card-menu {
          float: right;
          z-index: 3;
          --mdc-theme-text-primary-on-background: var(--primary-text-color);
        }
        mwc-list-item[disabled] {
          --mdc-theme-text-primary-on-background: var(--disabled-text-color);
        }
        .header {
          display: flex;
          justify-content: space-between;
        }
        .header h2 {
          color: var(--ha-card-header-color, --primary-text-color);
          font-family: var(--ha-card-header-font-family, inherit);
          font-size: var(--ha-card-header-font-size, 24px);
          letter-spacing: -0.012em;
          line-height: 48px;
          padding: 12px 16px 16px;
          display: block;
          margin-block: 0px;
          font-weight: normal;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-addon-config": HassioAddonConfig;
  }
}
