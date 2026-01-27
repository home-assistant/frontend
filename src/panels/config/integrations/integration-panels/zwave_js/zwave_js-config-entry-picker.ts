import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-next";
import "../../../../../components/ha-list";
import "../../../../../components/ha-list-item";
import "../../../../../layouts/hass-loading-screen";
import "../../../../../layouts/hass-subpage";
import type { ConfigEntry } from "../../../../../data/config_entries";
import { getConfigEntries } from "../../../../../data/config_entries";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import { navigate } from "../../../../../common/navigate";
import { caseInsensitiveStringCompare } from "../../../../../common/string/compare";

@customElement("zwave_js-config-entry-picker")
class ZWaveJSConfigEntryPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state() private _configEntries?: ConfigEntry[];

  protected async firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    await this._fetchConfigEntries();
  }

  protected render() {
    if (!this._configEntries) {
      return html`<hass-loading-screen></hass-loading-screen>`;
    }

    if (this._configEntries.length === 0) {
      return html`
        <hass-subpage header="Z-Wave" .narrow=${this.narrow} .hass=${this.hass}>
          <div class="content">
            <ha-card>
              <div class="card-content">
                <p>
                  ${this.hass.localize(
                    "ui.panel.config.zwave_js.picker.no_entries"
                  )}
                </p>
              </div>
            </ha-card>
          </div>
        </hass-subpage>
      `;
    }

    return html`
      <hass-subpage header="Z-Wave" .narrow=${this.narrow} .hass=${this.hass}>
        <div class="content">
          <ha-card
            .header=${this.hass.localize(
              "ui.panel.config.zwave_js.picker.title"
            )}
          >
            <ha-list>
              ${this._configEntries.map(
                (entry) => html`
                  <a
                    href="/config/zwave_js/dashboard?config_entry=${entry.entry_id}"
                  >
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
      </hass-subpage>
    `;
  }

  private async _fetchConfigEntries() {
    const entries = await getConfigEntries(this.hass, {
      domain: "zwave_js",
    });
    this._configEntries = entries
      .filter(
        (entry) => entry.disabled_by === null && entry.source !== "ignore"
      )
      .sort((a, b) => caseInsensitiveStringCompare(a.title, b.title));
    if (this._configEntries.length === 1) {
      navigate(
        `/config/zwave_js/dashboard?config_entry=${this._configEntries[0].entry_id}`,
        { replace: true }
      );
    }
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
    "zwave_js-config-entry-picker": ZWaveJSConfigEntryPicker;
  }
}
