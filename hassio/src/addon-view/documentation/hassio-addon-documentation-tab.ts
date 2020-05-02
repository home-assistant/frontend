import "@polymer/paper-spinner/paper-spinner-lite";
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

import { HomeAssistant } from "../../../../src/types";
import {
  HassioAddonDetails,
  fetchHassioAddonDocumentation,
} from "../../../../src/data/hassio/addon";
import "../../../../src/components/ha-markdown";
import "../../../../src/layouts/loading-screen";
import { hassioStyle } from "../../resources/hassio-style";
import { haStyle } from "../../../../src/resources/styles";

@customElement("hassio-addon-documentation-tab")
class HassioAddonDocumentationDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public addon?: HassioAddonDetails;

  @property() private _error?: string;

  @property() private _content?: string;

  public async connectedCallback(): Promise<void> {
    super.connectedCallback();
    await this._loadData();
  }

  protected render(): TemplateResult {
    if (!this.addon) {
      return html` <paper-spinner-lite active></paper-spinner-lite> `;
    }
    return html`
      <div class="content">
        <paper-card>
          ${this._error ? html` <div class="errors">${this._error}</div> ` : ""}
          <div class="card-content">
            ${this._content
              ? html`<ha-markdown .content=${this._content}></ha-markdown>`
              : html`<loading-screen></loading-screen>`}
          </div>
        </paper-card>
      </div>
    `;
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      hassioStyle,
      css`
        paper-card {
          display: block;
        }
        .content {
          margin: auto;
          padding: 8px;
          max-width: 1024px;
        }
      `,
    ];
  }

  private async _loadData(): Promise<void> {
    this._error = undefined;
    try {
      this._content = await fetchHassioAddonDocumentation(
        this.hass,
        this.addon!.slug
      );
    } catch (err) {
      this._error = `Failed to get addon documentation, ${
        err.body?.message || err
      }`;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-addon-documentation-tab": HassioAddonDocumentationDashboard;
  }
}
