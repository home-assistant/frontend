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
import { HassioAddonDetails } from "../../../src/data/hassio";
import { hassioStyle } from "../resources/hassio-style";
import { haStyle } from "../../../src/resources/styles";
import { fireEvent } from "../../../src/common/dom/fire_event";

@customElement("hassio-addon-config")
class HassioAddonConfig extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public addon!: HassioAddonDetails;
  @property() protected error?: string;
  @property() private config!: string;

  public connectedCallback(): void {
    super.connectedCallback();
    this.config = JSON.stringify(this.addon.options, null, 2);
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
            @value-changed=${this.configChanged}
            id="config"
            value=${this.config}
          ></iron-autogrow-textarea>
        </div>
        <div class="card-actions">
          <mwc-button class="warning" @click=${this.resetTapped}
            >Reset to defaults</mwc-button
          >
          <mwc-button
            @click=${this.saveTapped}
            .disabled=${!this._configHasChanged}
            >Save</mwc-button
          >
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
          @apply --layout;
          @apply --layout-justified;
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
        this.config = JSON.stringify(this.addon.options, null, 2);
      }
    }
  }

  protected get _configHasChanged() {
    return this.config !== JSON.stringify(this.addon.options, null, 2);
  }

  protected configChanged(ev): void {
    try {
      this.error = undefined;
      this.config = ev.detail.value;
    } catch (err) {
      this.error = err;
      this.config = JSON.stringify(this.addon.options, null, 2);
    }
  }

  protected callApi(options: null | object): void {
    this.error = undefined;
    const path = `hassio/addons/${this.addon.slug}/options`;
    const eventData = {
      path,
      success: false,
      response: undefined,
    };
    this.hass
      .callApi("POST", path, {
        options,
      })
      .then(
        (resp) => {
          eventData.success = true;
          eventData.response = resp as any;
        },
        (resp) => {
          eventData.success = false;
          eventData.response = resp;
        }
      )
      .then(() => {
        fireEvent(this, "hass-api-called", eventData);
      });
  }

  protected resetTapped(): void {
    this.callApi(null);
  }

  protected saveTapped(): void {
    let config: object | null;
    try {
      config = JSON.parse(this.config);
      this.error = undefined;
    } catch (err) {
      config = null;
      this.error = err;
    }

    if (!this.error) {
      this.callApi(config);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-addon-config": HassioAddonConfig;
  }
}
