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
  @property() private config!: any;
  @property() protected error?: string;

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
            .value=${this.config}
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

  protected firstUpdated() {
    this.config = this.addon ? JSON.stringify(this.addon.options, null, 2) : "";
  }

  private get _configHasChanged() {
    return this.config !== JSON.stringify(this.addon.options, null, 2);
  }

  private configChanged(ev): void {
    try {
      this.error = undefined;
      this.config = ev.detail.value;
    } catch (err) {
      this.error = err;
      this.config = JSON.stringify(this.addon.options, null, 2);
    }
  }

  private resetTapped(): void {
    this.error = undefined;
    const path = `hassio/addons/${this.addon.slug}/options`;
    const eventData = {
      path: path,
      success: false,
      response: undefined,
    };
    this.hass
      .callApi("POST", path, {
        options: null,
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
        this.config = this.addon
          ? JSON.stringify(this.addon.options, null, 2)
          : "";
      });
  }

  private saveTapped(): void {
    try {
      JSON.parse(this.config);
      this.error = undefined;
    } catch (err) {
      this.error = err;
    }

    if (!this.error) {
      const path = `hassio/addons/${this.addon.slug}/options`;
      const eventData = {
        path: path,
        success: false,
        response: undefined,
      };
      this.hass
        .callApi("POST", `hassio/addons/${this.addon.slug}/options`, {
          options: JSON.parse(this.config),
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
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-addon-config": HassioAddonConfig;
  }
}
