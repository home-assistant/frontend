import { mdiOpenInNew } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import type { HomeAssistant } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import type { YamlIntegrationDialogParams } from "./show-add-integration-dialog";
import "../../../components/ha-button";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-svg-icon";
import "../../../components/ha-wa-dialog";

@customElement("dialog-yaml-integration")
export class DialogYamlIntegration extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: YamlIntegrationDialogParams;

  @state() private _open = false;

  public showDialog(params: YamlIntegrationDialogParams): void {
    this._params = params;
    this._open = true;
  }

  public closeDialog() {
    this._open = false;
  }

  private _dialogClosed(): void {
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
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        header-title=${this.hass.localize(
          "ui.panel.config.integrations.config_flow.yaml_only_title"
        )}
        @closed=${this._dialogClosed}
      >
        <p>
          ${this.hass.localize(
            "ui.panel.config.integrations.config_flow.yaml_only"
          )}
        </p>
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this.closeDialog}
          >
            ${this.hass.localize("ui.common.cancel")}
          </ha-button>
          ${docLink
            ? html`<ha-button
                slot="primaryAction"
                appearance="plain"
                href=${docLink}
                target="_blank"
                rel="noreferrer noopener"
                @click=${this.closeDialog}
                autofocus
              >
                <ha-svg-icon slot="end" .path=${mdiOpenInNew}></ha-svg-icon>
                ${this.hass.localize(
                  "ui.panel.config.integrations.config_flow.open_documentation"
                )}
              </ha-button>`
            : html`<ha-button
                slot="primaryAction"
                @click=${this.closeDialog}
                autofocus
              >
                ${this.hass.localize("ui.common.ok")}
              </ha-button>`}
        </ha-dialog-footer>
      </ha-wa-dialog>
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
    ha-wa-dialog {
      /* Place above other dialogs */
      --dialog-z-index: 104;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-yaml-integration": DialogYamlIntegration;
  }
}
