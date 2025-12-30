import type { CSSResultGroup } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-next";
import "../../../../../components/ha-list";
import "../../../../../components/ha-list-item";
import "../../../../../layouts/hass-loading-screen";
import type { ConfigEntry } from "../../../../../data/config_entries";
import { getConfigEntries } from "../../../../../data/config_entries";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";

@customElement("zha-config-entry-picker")
class ZHAConfigEntryPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state() private _configEntries?: ConfigEntry[];

  protected async firstUpdated() {
    await this._fetchConfigEntries();
  }

  protected render() {
    if (!this._configEntries) {
      return html`<hass-loading-screen></hass-loading-screen>`;
    }

    if (this._configEntries.length === 0) {
      return html`
        <div class="content">
          <ha-card>
            <div class="card-content">
              <p>
                ${this.hass.localize("ui.panel.config.zha.picker.no_entries")}
              </p>
            </div>
          </ha-card>
        </div>
      `;
    }

    return html`
      <div class="content">
        <ha-card>
          <h1 class="card-header">
            ${this.hass.localize("ui.panel.config.zha.picker.title")}
          </h1>
          <ha-list>
            ${this._configEntries.map(
              (entry) => html`
                <a href="/config/zha/dashboard?config_entry=${entry.entry_id}">
                  <ha-list-item hasMeta>
                    <span>${entry.title}</span>
                    <ha-icon-next slot="meta"></ha-icon-next>
                  </ha-list-item>
                </a>
              `
            )}
          </ha-list>
        </ha-card>
      </div>
    `;
  }

  private async _fetchConfigEntries() {
    const entries = await getConfigEntries(this.hass, {
      domain: "zha",
    });
    this._configEntries = entries;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .content {
          padding: 24px;
          display: flex;
          justify-content: center;
        }

        ha-card {
          max-width: 600px;
          width: 100%;
        }

        .card-header {
          font-size: 20px;
          font-weight: 500;
          padding: 16px;
          padding-bottom: 0;
        }

        a {
          text-decoration: none;
          color: inherit;
        }

        ha-list {
          --md-list-item-leading-space: var(--ha-space-4);
          --md-list-item-trailing-space: var(--ha-space-4);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-config-entry-picker": ZHAConfigEntryPicker;
  }
}
