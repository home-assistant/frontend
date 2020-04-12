import "@material/mwc-button";
import "@polymer/iron-icon/iron-icon";
import "@polymer/paper-card/paper-card";
import "@polymer/paper-tooltip/paper-tooltip";
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
  HassioAddonDetails,
  fetchHassioAddonDocumentation,
} from "../../../src/data/hassio/addon";
import { hassioStyle } from "../resources/hassio-style";
import { haStyle } from "../../../src/resources/styles";
import { HomeAssistant, Route } from "../../../src/types";
import { getAddonSections } from "./data/hassio-addon-sections";

import "../../../src/components/ha-markdown";
import "../../../src/layouts/hass-tabs-subpage";

@customElement("hassio-addon-docs")
class HassioAddonDocs extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public addon!: HassioAddonDetails;
  @property() public narrow!: boolean;
  @property() public isWide!: boolean;
  @property() public showAdvanced!: boolean;
  @property() public route!: Route;

  private _documentation?: string;

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .tabs=${getAddonSections(this.addon)}
        hassio
      >
        <div class="container">
          <div class="content">
            ${this._documentation
              ? html`
                  <paper-card>
                    <div class="card-content">
                      <ha-markdown
                        .content=${this._documentation}
                      ></ha-markdown>
                    </div>
                  </paper-card>
                `
              : ""}
          </div>
        </div>
      </hass-tabs-subpage>
    `;
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      hassioStyle,
      css`
        .container {
          display: flex;
          width: 100%;
          justify-content: center;
        }
        .content {
          display: flex;
          width: 600px;
          margin-bottom: 24px;
          padding: 24px 0 32px;
          flex-direction: column;
        }
        @media only screen and (max-width: 600px) {
          .content {
            max-width: 100%;
            min-width: 100%;
          }
        }
        paper-card {
          display: block;
          margin-bottom: 16px;
        }
      `,
    ];
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this._loadDocumentation();
  }

  private async _loadDocumentation(): Promise<void> {
    if (this.addon.documentation) {
      const documentation = await fetchHassioAddonDocumentation(
        this.hass,
        this.addon.slug
      );
      this._documentation = String(documentation);
      this.requestUpdate();
    }
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "hassio-addon-docs": HassioAddonDocs;
  }
}
