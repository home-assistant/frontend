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

@customElement("hassio-addon-config")
class HassioAddonConfig extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public addon!: HassioAddonDetails;
  @property() protected error?: string;
  @property() private _config!: string;

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
          <mwc-button class="warning" @click=${this.resetTapped}>
            Reset to defaults
          </mwc-button>
          <mwc-button
            @click=${this.saveTapped}
            ?disabled=${!this._configHasChanged}
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

  protected update(changedProperties: PropertyValues): void {
    super.update(changedProperties);
    if (changedProperties.has("addon")) {
      if (this._configHasChanged) {
        this._config = JSON.stringify(this.addon.options, null, 2);
      }
    }
  }

  private get _configHasChanged() {
    return this._config !== JSON.stringify(this.addon.options, null, 2);
  }

  private _configChanged(ev: PolymerChangedEvent<string>): void {
    this._config =
      ev.detail.value || JSON.stringify(this.addon.options, null, 2);
  }

  private async resetTapped(): Promise<void> {
    const data: HassioAddonSetOptionParams = {
      options: null,
    };
    try {
      await setHassioAddonOption(this.hass, this.addon.slug, data);
    } catch {
      this.error = "Failed to save addon configuration";
    }
  }

  private async saveTapped(): Promise<void> {
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
    } catch (err) {
      console.log(err);
      this.error = `Failed to save addon configuration, ${err.body.message}`;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-addon-config": HassioAddonConfig;
  }
}
