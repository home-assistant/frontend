import "@polymer/paper-spinner/paper-spinner-lite";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import "../../../../src/components/ha-markdown";
import {
  fetchHassioAddonDocumentation,
  HassioAddonDetails,
} from "../../../../src/data/hassio/addon";
import "../../../../src/layouts/loading-screen";
import { haStyle } from "../../../../src/resources/styles";
import { HomeAssistant } from "../../../../src/types";
import { hassioStyle } from "../../resources/hassio-style";

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
        <ha-card>
          ${this._error ? html` <div class="errors">${this._error}</div> ` : ""}
          <div class="card-content">
            ${this._content
              ? html`<ha-markdown .content=${this._content}></ha-markdown>`
              : html`<loading-screen></loading-screen>`}
          </div>
        </ha-card>
      </div>
    `;
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      hassioStyle,
      css`
        ha-card {
          display: block;
        }
        .content {
          margin: auto;
          padding: 8px;
          max-width: 1024px;
        }
        ha-markdown {
          display: block;
          padding: 0 16px 16px;
          -ms-user-select: initial;
          -webkit-user-select: initial;
          -moz-user-select: initial;
        }
        .markdown.no-header {
          padding-top: 16px;
        }
        ha-markdown > *:first-child {
          margin-top: 0;
        }
        ha-markdown > *:last-child {
          margin-bottom: 0;
        }
        ha-markdown a {
          color: var(--primary-color);
        }
        ha-markdown img {
          max-width: 100%;
        }
        ha-markdown code,
        pre {
          background-color: var(--markdown-code-background-color, #f8f8f8);
        }
        ha-markdown h2 {
          font-size: 1.5em;
          font-weight: bold;
        }
        ha-markdown a {
          color: var(--primary-color);
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
