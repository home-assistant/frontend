import "@material/mwc-button/mwc-button";
import "@material/mwc-list/mwc-list";
import "@material/mwc-list/mwc-list-item";
import "@material/mwc-tab";
import "@material/mwc-tab-bar";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-alert";
import "../../../components/ha-card";
import "../../../components/ha-circular-progress";
import "../../../components/ha-expansion-panel";
import "../../../components/ha-formfield";
import "../../../components/ha-header-bar";
import "../../../components/ha-icon-button";
import "../../../components/ha-radio";
import "../../../components/ha-related-items";
import "../../../components/ha-settings-row";
import "../../../components/ha-textfield";
import { extractApiErrorMessage } from "../../../data/hassio/common";
import {
  changeHostOptions,
  fetchHassioHostInfo,
} from "../../../data/hassio/host";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../../types";

@customElement("supervisor-hostname")
export class HassioHostname extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) narrow!: boolean;

  @state() private _processing = false;

  @state() private _hostname?: string;

  protected firstUpdated() {
    this._fetchHostInfo();
  }

  private async _fetchHostInfo() {
    const hostInfo = await fetchHassioHostInfo(this.hass);
    this._hostname = hostInfo.hostname;
  }

  protected render(): TemplateResult {
    if (!this._hostname) {
      return html``;
    }

    return html`
      <ha-card
        class="no-padding"
        outlined
        .header=${this.hass.localize("ui.panel.config.network.hostname.title")}
      >
        <div>
          <ha-settings-row .narrow=${this.narrow}>
            <span slot="heading">Hostname</span>
            <span slot="description"
              >The name your instance will have on your network</span
            >
            <ha-textfield
              .disabled=${this._processing}
              .value=${this._hostname}
              @change=${this._handleChange}
              placeholder="homeassistant"
            >
            </ha-textfield>
          </ha-settings-row>
        </div>
        <div class="card-actions">
          <mwc-button @click=${this._save} .disabled=${this._processing}>
            ${this._processing
              ? html`<ha-circular-progress active size="small">
                </ha-circular-progress>`
              : this.hass.localize("ui.common.save")}
          </mwc-button>
        </div>
      </ha-card>
    `;
  }

  private _handleChange(ev) {
    this._hostname = ev.target.value;
  }

  private async _save() {
    this._processing = true;
    try {
      await changeHostOptions(this.hass, { hostname: this._hostname });
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.network.hostname.failed_to_set_hostname"
        ),
        text: extractApiErrorMessage(err),
      });
    } finally {
      this._processing = false;
    }
  }

  static styles: CSSResultGroup = css`
    ha-textfield {
      width: 100%;
    }
    .card-actions {
      display: flex;
      flex-direction: row-reverse;
      justify-content: space-between;
      align-items: center;
    }
    ha-settings-row {
      border-top: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "supervisor-hostname": HassioHostname;
  }
}
