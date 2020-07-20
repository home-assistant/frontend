import { PaperInputElement } from "@polymer/paper-input/paper-input";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../../../src/common/dom/fire_event";
import "../../../../src/components/ha-card";
import {
  HassioAddonDetails,
  HassioAddonSetOptionParams,
  setHassioAddonOption,
} from "../../../../src/data/hassio/addon";
import { haStyle } from "../../../../src/resources/styles";
import { HomeAssistant } from "../../../../src/types";
import { suggestAddonRestart } from "../../dialogs/suggestAddonRestart";
import { hassioStyle } from "../../resources/hassio-style";

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
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public addon!: HassioAddonDetails;

  @internalProperty() private _error?: string;

  @internalProperty() private _config?: NetworkItem[];

  public connectedCallback(): void {
    super.connectedCallback();
    this._setNetworkConfig();
  }

  protected render(): TemplateResult {
    if (!this._config) {
      return html``;
    }

    return html`
      <ha-card header="Network">
        <div class="card-content">
          ${this._error ? html` <div class="errors">${this._error}</div> ` : ""}

          <table>
            <tbody>
              <tr>
                <th>Container</th>
                <th>Host</th>
                <th>Description</th>
              </tr>
              ${this._config!.map((item) => {
                return html`
                  <tr>
                    <td>${item.container}</td>
                    <td>
                      <paper-input
                        @value-changed=${this._configChanged}
                        placeholder="disabled"
                        .value=${item.host ? String(item.host) : ""}
                        .container=${item.container}
                        no-label-float
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
          <mwc-button class="warning" @click=${this._resetTapped}>
            Reset to defaults
          </mwc-button>
          <mwc-button @click=${this._saveTapped}>Save</mwc-button>
        </div>
      </ha-card>
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
        ha-card {
          display: block;
        }
        .errors {
          color: var(--error-color);
          margin-bottom: 16px;
        }
        .card-actions {
          display: flex;
          justify-content: space-between;
        }
      `,
    ];
  }

  protected update(changedProperties: PropertyValues): void {
    super.update(changedProperties);
    if (changedProperties.has("addon")) {
      this._setNetworkConfig();
    }
  }

  private _setNetworkConfig(): void {
    const network = this.addon.network || {};
    const description = this.addon.network_description || {};
    const items: NetworkItem[] = Object.keys(network).map((key) => {
      return {
        container: key,
        host: network[key],
        description: description[key],
      };
    });
    this._config = items.sort((a, b) => (a.container > b.container ? 1 : -1));
  }

  private async _configChanged(ev: Event): Promise<void> {
    const target = ev.target as NetworkItemInput;
    this._config!.forEach((item) => {
      if (
        item.container === target.container &&
        item.host !== parseInt(String(target.value), 10)
      ) {
        item.host = target.value ? parseInt(String(target.value), 10) : null;
      }
    });
  }

  private async _resetTapped(): Promise<void> {
    const data: HassioAddonSetOptionParams = {
      network: null,
    };

    try {
      await setHassioAddonOption(this.hass, this.addon.slug, data);
      const eventdata = {
        success: true,
        response: undefined,
        path: "option",
      };
      fireEvent(this, "hass-api-called", eventdata);
    } catch (err) {
      this._error = `Failed to set addon network configuration, ${
        err.body?.message || err
      }`;
    }
    if (!this._error && this.addon?.state === "started") {
      await suggestAddonRestart(this, this.hass, this.addon);
    }
  }

  private async _saveTapped(): Promise<void> {
    this._error = undefined;
    const networkconfiguration = {};
    this._config!.forEach((item) => {
      networkconfiguration[item.container] = parseInt(String(item.host), 10);
    });

    const data: HassioAddonSetOptionParams = {
      network: networkconfiguration,
    };

    try {
      await setHassioAddonOption(this.hass, this.addon.slug, data);
      const eventdata = {
        success: true,
        response: undefined,
        path: "option",
      };
      fireEvent(this, "hass-api-called", eventdata);
    } catch (err) {
      this._error = `Failed to set addon network configuration, ${
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
    "hassio-addon-network": HassioAddonNetwork;
  }
}
