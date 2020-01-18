import "@polymer/iron-autogrow-textarea/iron-autogrow-textarea";
import "@material/mwc-button";
import "@polymer/paper-card/paper-card";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";

import { HomeAssistant } from "../../../src/types";
import {
  HassioAddonDetails,
  setHassioAddonOption,
  HassioAddonSetOptionParams,
} from "../../../src/data/hassio";
import { hassioStyle } from "../resources/hassio-style";
import { haStyle } from "../../../src/resources/styles";
import { PolymerChangedEvent } from "../../../src/polymer-types";
import { fireEvent } from "../../../src/common/dom/fire_event";

@customElement("hassio-addon-config")
class HassioAddonConfig extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public addon!: HassioAddonDetails;
  @property() protected error?: string;
  @property() private _config!: string;
  @property({ type: Boolean }) private _configHasChanged = false;

  public connectedCallback(): void {
    super.connectedCallback();
    this._config = JSON.stringify(this.addon.options, null, 2);
  }

  protected render(): TemplateResult | void {
    return html`
      <paper-card heading="Config">
        <div class="card-content">
          ${this.error
            ? html`
                <div class="errors">${this.error}</div>
              `
            : ""}
          <iron-autogrow-textarea
            @value-changed=${this._configChanged}
            .value=${this._config}
          ></iron-autogrow-textarea>
        </div>
        <div class="card-actions">
          <mwc-button class="warning" @click=${this._resetTapped}>
            Reset to defaults
          </mwc-button>
          <mwc-button
            @click=${this._saveTapped}
            .disabled=${!this._configHasChanged}
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
          margin-bottom: 16px;
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
      if (this._configHasChanged) {
        this._config = JSON.stringify(this.addon.options, null, 2);
      }
    }
  }

  private _configChanged(ev: PolymerChangedEvent<string>): void {
    this._config =
      ev.detail.value || JSON.stringify(this.addon.options, null, 2);
    this._configHasChanged =
      this._config !== JSON.stringify(this.addon.options, null, 2);
  }

  private async _resetTapped(): Promise<void> {
    this.error = undefined;
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
      this.error = `Failed to reset addon configuration, ${err.body.message}`;
    }
  }

  private async _saveTapped(): Promise<void> {
    let data: HassioAddonSetOptionParams;
    this.error = undefined;
    try {
      data = {
        options: JSON.parse(this._config),
      };
    } catch (err) {
      this.error = err;
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
      this.error = `Failed to save addon configuration, ${err.body.message}`;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-addon-config": HassioAddonConfig;
  }
}
