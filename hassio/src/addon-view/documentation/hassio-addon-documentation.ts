import "@material/mwc-button";
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
import {
  fetchHassioAddonDocumentation,
  HassioAddonDetails,
} from "../../../../src/data/hassio/addon";
import "../../../../src/components/ha-markdown";
import "../../../../src/layouts/loading-screen";
import { haStyle } from "../../../../src/resources/styles";
import { HomeAssistant } from "../../../../src/types";
import "../../components/hassio-ansi-to-html";
import { hassioStyle } from "../../resources/hassio-style";

@customElement("hassio-addon-documentation")
class HassioAddonDocumentation extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public addon!: HassioAddonDetails;

  @property() private _error?: string;

  @property() private _content?: string;

  public async connectedCallback(): Promise<void> {
    super.connectedCallback();
    await this._loadData();
  }

  protected render(): TemplateResult {
    return html`
      <paper-card>
        ${this._error ? html` <div class="errors">${this._error}</div> ` : ""}
        <div class="card-content">
          ${this._content
            ? html`<ha-markdown .content=${this._content}></ha-markdown>`
            : html`<loading-screen></loading-screen>`}
        </div>
      </paper-card>
    `;
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      hassioStyle,
      css`
        :host,
        paper-card {
          display: block;
        }
      `,
    ];
  }

  private async _loadData(): Promise<void> {
    this._error = undefined;
    try {
      this._content = await fetchHassioAddonDocumentation(
        this.hass,
        this.addon.slug
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
    "hassio-addon-documentation": HassioAddonDocumentation;
  }
}
