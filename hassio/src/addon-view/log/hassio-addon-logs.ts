import "@material/mwc-button";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import "../../../../src/components/ha-card";
import {
  fetchHassioAddonLogs,
  HassioAddonDetails,
} from "../../../../src/data/hassio/addon";
import { extractApiErrorMessage } from "../../../../src/data/hassio/common";
import { Supervisor } from "../../../../src/data/supervisor/supervisor";
import { haStyle } from "../../../../src/resources/styles";
import { HomeAssistant } from "../../../../src/types";
import "../../components/hassio-ansi-to-html";
import { hassioStyle } from "../../resources/hassio-style";

@customElement("hassio-addon-logs")
class HassioAddonLogs extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @property({ attribute: false }) public addon!: HassioAddonDetails;

  @internalProperty() private _error?: string;

  @internalProperty() private _content?: string;

  public async connectedCallback(): Promise<void> {
    super.connectedCallback();
    await this._loadData();
  }

  protected render(): TemplateResult {
    return html`
      <h1>${this.addon.name}</h1>
      <ha-card>
        ${this._error ? html` <div class="errors">${this._error}</div> ` : ""}
        <div class="card-content">
          ${this._content
            ? html`<hassio-ansi-to-html
                .content=${this._content}
              ></hassio-ansi-to-html>`
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

  static get styles(): CSSResult[] {
    return [
      haStyle,
      hassioStyle,
      css`
        :host,
        ha-card {
          display: block;
        }
        .errors {
          color: var(--error-color);
          margin-bottom: 16px;
        }
      `,
    ];
  }

  private async _loadData(): Promise<void> {
    this._error = undefined;
    try {
      this._content = await fetchHassioAddonLogs(this.hass, this.addon.slug);
    } catch (err) {
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
