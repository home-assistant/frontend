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

import { PaperInputElement } from "@polymer/paper-input/paper-input";

import { HomeAssistant } from "../../../src/types";
import { HassioAddonDetails } from "../../../src/data/hassio";
import { hassioStyle } from "../resources/hassio-style";
import { haStyle } from "../../../src/resources/styles";
import { fireEvent } from "../../../src/common/dom/fire_event";

interface NetworkItem {
  description: string;
  container: string;
  host: number | null;
}

interface NetworkItemInput extends PaperInputElement {
  container: string;
}

@customElement("hassio-addon-network")
class HassioAddonNetwork extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public addon!: HassioAddonDetails;
  @property() protected error?: string;
  @property() private config?: NetworkItem[];

  protected render(): TemplateResult | void {
    if (!this.config) {
      return html``;
    }

    return html`
      <paper-card heading="Network">
        <div class="card-content">
          ${this.error
            ? html`
                <div class="errors">${this.error}</div>
              `
            : ""}

          <table>
            <tbody>
              <tr>
                <th>Container</th>
                <th>Host</th>
                <th>Description</th>
              </tr>
              ${this.config!.map((item) => {
                return html`
                  <tr>
                    <td>${item.container}</td>
                    <td>
                      <paper-input
                        @value-changed=${this.configChanged}
                        placeholder="disabled"
                        .value=${item.host}
                        .container=${item.container}
                        no-label-float=""
                      ></paper-input>
                    </td>
                    <td>${item.description}</td>
                  </tr>
                `;
              })}
            </tbody>
          </table>
        </div>
        <div class="card-actions">
          <mwc-button class="warning" @click=${this.resetTapped}
            >Reset to defaults</mwc-button
          >
          <mwc-button @click=${this.saveTapped}>Save</mwc-button>
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
        .errors {
          color: var(--google-red-500);
          margin-bottom: 16px;
        }
        .card-actions {
          @apply --layout;
          @apply --layout-justified;
        }
      `,
    ];
  }

  protected firstUpdated() {
    this.setNetworkConfig();
  }

  protected update(changedProperties: PropertyValues) {
    super.update(changedProperties);
    if (changedProperties.has("addon")) {
      this.setNetworkConfig();
    }
  }

  private setNetworkConfig() {
    const network = this.addon.network || {};
    const description = this.addon.network_description || {};
    const items = Object.keys(network).map((key) => ({
      container: key,
      host: network[key],
      description: description[key],
    }));
    this.config = items.sort((a, b) => (a.container > b.container ? 1 : -1));
  }

  private resetTapped(): void {
    this.error = undefined;
    const path = `hassio/addons/${this.addon.slug}/options`;
    const eventData = {
      path,
      success: false,
      response: undefined,
    };
    this.hass
      .callApi("POST", path, {
        network: null,
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
        this.requestUpdate();
      });
  }

  private configChanged(ev: Event): void {
    const target = ev.target as NetworkItemInput;
    this.config!.map((item) => {
      if (
        item.container === target.container &&
        item.host !== parseInt(String(target.value), 10)
      ) {
        item.host = target.value ? parseInt(String(target.value), 10) : null;
      }
    });
  }

  private saveTapped(): void {
    this.error = undefined;
    const data = {};
    this.config!.forEach((item) => {
      data[item.container] = parseInt(String(item.host), 10);
    });
    const path = `hassio/addons/${this.addon.slug}/options`;
    const eventData = {
      path,
      success: false,
      response: undefined,
    };
    this.hass
      .callApi("POST", path, {
        network: data,
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
        this.requestUpdate();
      });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-addon-network": HassioAddonNetwork;
  }
}
