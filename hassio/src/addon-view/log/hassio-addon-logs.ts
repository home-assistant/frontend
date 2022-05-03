import "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../src/components/ha-alert";
import "../../../../src/components/ha-ansi-to-html";
import "../../../../src/components/ha-card";
import {
  fetchHassioAddonLogs,
  HassioAddonDetails,
} from "../../../../src/data/hassio/addon";
import { extractApiErrorMessage } from "../../../../src/data/hassio/common";
import { Supervisor } from "../../../../src/data/supervisor/supervisor";
import { haStyle } from "../../../../src/resources/styles";
import { HomeAssistant } from "../../../../src/types";
import { hassioStyle } from "../../resources/hassio-style";

@customElement("hassio-addon-logs")
class HassioAddonLogs extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @property({ attribute: false }) public addon!: HassioAddonDetails;

  @state() private _error?: string;

  @state() private _content?: string;

  public async connectedCallback(): Promise<void> {
    super.connectedCallback();
    await this._loadData();
  }

  protected render(): TemplateResult {
    return html`
      <h1>${this.addon.name}</h1>
      <ha-card outlined>
        ${this._error
          ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
          : ""}
        <div class="card-content">
          ${this._content
            ? html`<ha-ansi-to-html
                .content=${this._content}
              ></ha-ansi-to-html>`
            : ""}
        </div>
        <div class="card-actions">
          <mwc-button @click=${this._refresh}>
            ${this.supervisor.localize("common.refresh")}
          </mwc-button>
        </div>
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      hassioStyle,
      css`
        :host,
        ha-card {
          display: block;
        }
      `,
    ];
  }

  private async _loadData(): Promise<void> {
    this._error = undefined;
    try {
      this._content = await fetchHassioAddonLogs(this.hass, this.addon.slug);
    } catch (err: any) {
      this._error = this.supervisor.localize(
        "addon.logs.get_logs",
        "error",
        extractApiErrorMessage(err)
      );
    }
  }

  private async _refresh(): Promise<void> {
    await this._loadData();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-addon-logs": HassioAddonLogs;
  }
}
