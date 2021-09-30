import { PaperInputElement } from "@polymer/paper-input/paper-input";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../src/common/dom/fire_event";
import "../../../../src/components/buttons/ha-progress-button";
import "../../../../src/components/ha-alert";
import "../../../../src/components/ha-card";
import {
  HassioAddonDetails,
  HassioAddonSetOptionParams,
  setHassioAddonOption,
} from "../../../../src/data/hassio/addon";
import { extractApiErrorMessage } from "../../../../src/data/hassio/common";
import { Supervisor } from "../../../../src/data/supervisor/supervisor";
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

  @property({ attribute: false }) public supervisor!: Supervisor;

  @property({ attribute: false }) public addon!: HassioAddonDetails;

  @state() private _error?: string;

  @state() private _config?: NetworkItem[];

  public connectedCallback(): void {
    super.connectedCallback();
    this._setNetworkConfig();
  }

  protected render(): TemplateResult {
    if (!this._config) {
      return html``;
    }

    return html`
      <ha-card
        .header=${this.supervisor.localize(
          "addon.configuration.network.header"
        )}
      >
        <div class="card-content">
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : ""}

          <table>
            <tbody>
              <tr>
                <th>
                  ${this.supervisor.localize(
                    "addon.configuration.network.container"
                  )}
                </th>
                <th>
                  ${this.supervisor.localize(
                    "addon.configuration.network.host"
                  )}
                </th>
                <th>${this.supervisor.localize("common.description")}</th>
              </tr>
              ${this._config!.map(
                (item) => html`
                  <tr>
                    <td>${item.container}</td>
                    <td>
                      <paper-input
                        @value-changed=${this._configChanged}
                        placeholder=${this.supervisor.localize(
                          "addon.configuration.network.disabled"
                        )}
                        .value=${item.host ? String(item.host) : ""}
                        .container=${item.container}
                        no-label-float
                      ></paper-input>
                    </td>
                    <td>${this._computeDescription(item)}</td>
                  </tr>
                `
              )}
            </tbody>
          </table>
        </div>
        <div class="card-actions">
          <ha-progress-button class="warning" @click=${this._resetTapped}>
            ${this.supervisor.localize("common.reset_defaults")}
          </ha-progress-button>
          <ha-progress-button @click=${this._saveTapped}>
            ${this.supervisor.localize("common.save")}
          </ha-progress-button>
        </div>
      </ha-card>
    `;
  }

  protected update(changedProperties: PropertyValues): void {
    super.update(changedProperties);
    if (changedProperties.has("addon")) {
      this._setNetworkConfig();
    }
  }

  private _computeDescription = (item: NetworkItem): string =>
    this.addon.translations[this.hass.language]?.network?.[item.container]
      ?.description ||
    this.addon.translations.en?.network?.[item.container]?.description ||
    item.description;

  private _setNetworkConfig(): void {
    const network = this.addon.network || {};
    const description = this.addon.network_description || {};
    const items: NetworkItem[] = Object.keys(network).map((key) => ({
      container: key,
      host: network[key],
      description: description[key],
    }));
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

  private async _resetTapped(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    button.progress = true;

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
      if (this.addon?.state === "started") {
        await suggestAddonRestart(this, this.hass, this.supervisor, this.addon);
      }
    } catch (err: any) {
      this._error = this.supervisor.localize(
        "addon.failed_to_reset",
        "error",
        extractApiErrorMessage(err)
      );
    }

    button.progress = false;
  }

  private async _saveTapped(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    button.progress = true;

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
      if (this.addon?.state === "started") {
        await suggestAddonRestart(this, this.hass, this.supervisor, this.addon);
      }
    } catch (err: any) {
      this._error = this.supervisor.localize(
        "addon.failed_to_save",
        "error",
        extractApiErrorMessage(err)
      );
    }
    button.progress = false;
  }

  static get styles(): CSSResultGroup {
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-addon-network": HassioAddonNetwork;
  }
}
