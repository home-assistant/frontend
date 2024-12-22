import "@material/mwc-button/mwc-button";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { HomeAssistant } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import { YamlIntegrationDialogParams } from "./show-add-integration-dialog";

@customElement("dialog-yaml-integration")
export class DialogYamlIntegration extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: YamlIntegrationDialogParams;

  public showDialog(params: YamlIntegrationDialogParams): void {
    this._params = params;
  }

  public closeDialog() {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }
    const manifest = this._params.manifest;
    const docLink = manifest.is_built_in
      ? documentationUrl(this.hass, `/integrations/${manifest.domain}`)
      : manifest.documentation;
    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${this.hass.localize(
          "ui.panel.config.integrations.config_flow.yaml_only_title"
        )}
      >
        <p>
          ${this.hass.localize(
            "ui.panel.config.integrations.config_flow.yaml_only"
          )}
        </p>
        <mwc-button @click=${this.closeDialog} slot="secondaryAction">
          ${this.hass.localize("ui.dialogs.generic.cancel")}
        </mwc-button>
        ${docLink
          ? html`<a
              .href=${docLink}
              target="_blank"
              rel="noreferrer noopener"
              slot="primaryAction"
            >
              <mwc-button @click=${this.closeDialog} dialogInitialFocus>
                ${this.hass.localize(
                  "ui.panel.config.integrations.config_flow.open_documentation"
                )}
              </mwc-button>
            </a>`
          : html`<mwc-button @click=${this.closeDialog} dialogInitialFocus>
              ${this.hass.localize("ui.dialogs.generic.ok")}
            </mwc-button>`}
      </ha-dialog>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host([inert]) {
        pointer-events: initial !important;
        cursor: initial !important;
      }
      a {
        text-decoration: none;
      }
      ha-dialog {
        /* Place above other dialogs */
        --dialog-z-index: 104;
      }
      @media all and (min-width: 600px) {
        ha-dialog {
          --mdc-dialog-min-width: 400px;
        }
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-yaml-integration": DialogYamlIntegration;
  }
}
