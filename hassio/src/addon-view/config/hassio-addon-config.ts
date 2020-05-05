import "@material/mwc-button";
import "@polymer/iron-autogrow-textarea/iron-autogrow-textarea";
import "@polymer/paper-card/paper-card";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  query,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../../../src/common/dom/fire_event";
import "../../../../src/components/ha-yaml-editor";
import type { HaYamlEditor } from "../../../../src/components/ha-yaml-editor";
import {
  HassioAddonDetails,
  HassioAddonSetOptionParams,
  setHassioAddonOption,
} from "../../../../src/data/hassio/addon";
import { showConfirmationDialog } from "../../../../src/dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../src/resources/styles";
import type { HomeAssistant } from "../../../../src/types";
import { hassioStyle } from "../../resources/hassio-style";

import { suggestAddonRestart } from "../../dialogs/suggestAddonRestart";

@customElement("hassio-addon-config")
class HassioAddonConfig extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public addon!: HassioAddonDetails;

  @property() private _error?: string;

  @property({ type: Boolean }) private _configHasChanged = false;

  @query("ha-yaml-editor") private _editor!: HaYamlEditor;

  protected render(): TemplateResult {
    const editor = this._editor;
    // If editor not rendered, don't show the error.
    const valid = editor ? editor.isValid : true;

    return html`
      <h1>${this.addon.name}</h1>
      <paper-card heading="Configuration">
        <div class="card-content">
          <ha-yaml-editor
            @value-changed=${this._configChanged}
          ></ha-yaml-editor>
          ${this._error ? html` <div class="errors">${this._error}</div> ` : ""}
          ${valid ? "" : html` <div class="errors">Invalid YAML</div> `}
        </div>
        <div class="card-actions">
          <mwc-button class="warning" @click=${this._resetTapped}>
            Reset to defaults
          </mwc-button>
          <mwc-button
            @click=${this._saveTapped}
            .disabled=${!this._configHasChanged || !valid}
          >
            Save
          </mwc-button>
        </div>
      </paper-card>
    `;
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      hassioStyle,
      css`
        :host {
          display: block;
        }
        paper-card {
          display: block;
        }
        .card-actions {
          display: flex;
          justify-content: space-between;
        }
        .errors {
          color: var(--google-red-500);
          margin-top: 16px;
        }
        iron-autogrow-textarea {
          width: 100%;
          font-family: monospace;
        }
        .syntaxerror {
          color: var(--google-red-500);
        }
      `,
    ];
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (changedProperties.has("addon")) {
      this._editor.setValue(this.addon.options);
    }
  }

  private _configChanged(): void {
    this._configHasChanged = true;
    this.requestUpdate();
  }

  private async _resetTapped(): Promise<void> {
    const confirmed = await showConfirmationDialog(this, {
      title: this.addon.name,
      text: "Are you sure you want to reset all your options?",
      confirmText: "reset options",
      dismissText: "no",
    });

    if (!confirmed) {
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
      this._error = `Failed to reset addon configuration, ${
        err.body?.message || err
      }`;
    }
  }

  private async _saveTapped(): Promise<void> {
    let data: HassioAddonSetOptionParams;
    this._error = undefined;
    try {
      data = {
        options: this._editor.value,
      };
    } catch (err) {
      this._error = err;
      return;
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
    } catch (err) {
      this._error = `Failed to save addon configuration, ${
        err.body?.message || err
      }`;
    }
    if (!this._error && this.addon?.state === "started") {
      await suggestAddonRestart(this, this.hass, this.addon);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-addon-config": HassioAddonConfig;
  }
}
