import "../../../../src/components/ha-card";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import "../../../../src/components/ha-alert";
import "../../../../src/components/ha-circular-progress";
import "../../../../src/components/ha-markdown";
import { customElement, property, state } from "lit/decorators";
import {
  fetchHassioAddonDocumentation,
  HassioAddonDetails,
} from "../../../../src/data/hassio/addon";
import { extractApiErrorMessage } from "../../../../src/data/hassio/common";
import "../../../../src/layouts/hass-loading-screen";
import { haStyle } from "../../../../src/resources/styles";
import { HomeAssistant } from "../../../../src/types";
import { hassioStyle } from "../../resources/hassio-style";
import { Supervisor } from "../../../../src/data/supervisor/supervisor";

@customElement("hassio-addon-documentation-tab")
class HassioAddonDocumentationDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @property({ attribute: false }) public addon?: HassioAddonDetails;

  @state() private _error?: string;

  @state() private _content?: string;

  public async connectedCallback(): Promise<void> {
    super.connectedCallback();
    await this._loadData();
  }

  protected render(): TemplateResult {
    if (!this.addon) {
      return html`<ha-circular-progress active></ha-circular-progress>`;
    }
    return html`
      <div class="content">
        <ha-card outlined>
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : ""}
          <div class="card-content">
            ${this._content
              ? html`<ha-markdown
                  .content=${this._content}
                  lazy-images
                ></ha-markdown>`
              : html`<hass-loading-screen no-toolbar></hass-loading-screen>`}
          </div>
        </ha-card>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
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
          padding: 16px;
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
    } catch (err: any) {
      this._error = this.supervisor.localize(
        "addon.documentation.get_documentation",
        "error",
        extractApiErrorMessage(err)
      );
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-addon-documentation-tab": HassioAddonDocumentationDashboard;
  }
}
