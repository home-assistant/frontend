import "@material/mwc-button/mwc-button";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import "../../../components/ha-network";
import "../../../components/ha-card";
import "../../../components/ha-checkbox";
import "../../../components/ha-settings-row";
import {
  NetworkConfig,
  getNetworkConfig,
  setNetworkConfig,
} from "../../../data/network";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";

@customElement("ha-config-network")
class ConfigNetwork extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _networkConfig?: NetworkConfig;

  @state() private _error?: string;

  protected render(): TemplateResult {
    const error = this._error
      ? this._error
      : !isComponentLoaded(this.hass, "network")
      ? "Network integration not loaded"
      : undefined;

    return html`
      <ha-card header="Network">
        <div class="card-content">
          ${error ? html`<div class="error">${error}</div>` : ""}
          <p>
            Configure which network adapters integrations will use. Currently
            this setting only affects multicast traffic. A restart is required
            for these settings to apply.
          </p>
          <ha-network
            @network-config-changed=${this._configChanged}
            .hass=${this.hass}
            .networkConfig=${this._networkConfig}
          ></ha-network>
        </div>
        <div class="card-actions">
          <mwc-button @click=${this._save}>
            ${this.hass.localize(
              "ui.panel.config.core.section.core.core_config.save_button"
            )}
          </mwc-button>
        </div>
      </ha-card>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    if (isComponentLoaded(this.hass, "network")) {
      this._load();
    }
  }

  private async _load() {
    this._error = undefined;
    try {
      this._networkConfig = await getNetworkConfig(this.hass);
    } catch (err) {
      this._error = err.message || err;
    }
  }

  private async _save() {
    this._error = undefined;
    try {
      await setNetworkConfig(
        this.hass,
        this._networkConfig?.configured_adapters || []
      );
    } catch (err) {
      this._error = err.message || err;
    }
  }

  private _configChanged(event: CustomEvent): void {
    this._networkConfig = {
      ...this._networkConfig!,
      configured_adapters: event.detail.configured_adapters,
    };
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .error {
          color: var(--error-color);
        }

        ha-settings-row {
          padding: 0;
        }

        .card-actions {
          display: flex;
          flex-direction: row-reverse;
          justify-content: space-between;
          align-items: center;
        }
      `, // row-reverse so we tab first to "save"
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-network": ConfigNetwork;
  }
}
