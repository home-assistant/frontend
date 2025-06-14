import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import type { HomeAssistant } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import type { YamlIntegrationDialogParams } from "./show-add-integration-dialog";
import "../../../components/ha-dialog";
import "../../../components/ha-button";

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
        <ha-button
          appearance="plain"
          @click=${this.closeDialog}
          slot="primaryAction"
        >
          ${this.hass.localize("ui.common.cancel")}
        </ha-button>
        ${docLink
          ? html`<ha-button
              appearance="plain"
              href=${docLink}
              target="_blank"
              rel="noreferrer noopener"
              slot="primaryAction"
              @click=${this.closeDialog}
              dialogInitialFocus
            >
              ${this.hass.localize(
                "ui.panel.config.integrations.config_flow.open_documentation"
              )}
            </ha-button>`
          : html`<ha-button @click=${this.closeDialog} dialogInitialFocus>
              ${this.hass.localize("ui.common.ok")}
            </ha-button>`}
      </ha-dialog>
    `;
  }

  static styles = css`
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

declare global {
  interface HTMLElementTagNameMap {
    "dialog-yaml-integration": DialogYamlIntegration;
  }
}
