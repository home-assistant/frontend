import "../../../../../components/ha-card";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-spinner";
import "../../../../../components/ha-markdown";
import { customElement, property, state } from "lit/decorators";
import type { HassioAddonDetails } from "../../../../../data/hassio/addon";
import { fetchHassioAddonDocumentation } from "../../../../../data/hassio/addon";
import { extractApiErrorMessage } from "../../../../../data/hassio/common";
import "../../../../../layouts/hass-loading-screen";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import { supervisorAppsStyle } from "../../resources/supervisor-apps-style";

@customElement("supervisor-app-documentation-tab")
class SupervisorAppDocumentationDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public addon?: HassioAddonDetails;

  @state() private _error?: string;

  @state() private _content?: string;

  public async connectedCallback(): Promise<void> {
    super.connectedCallback();
    await this._loadData();
  }

  protected render(): TemplateResult {
    if (!this.addon) {
      return html`<ha-spinner></ha-spinner>`;
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
      supervisorAppsStyle,
      css`
        ha-card {
          display: block;
        }
        .content {
          margin: auto;
          padding: var(--ha-space-2);
          max-width: 1024px;
        }
        ha-markdown {
          padding: var(--ha-space-4);
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
      this._error = this.hass.localize(
        "ui.panel.config.apps.documentation.get_documentation",
        { error: extractApiErrorMessage(err) }
      );
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "supervisor-app-documentation-tab": SupervisorAppDocumentationDashboard;
  }
}
