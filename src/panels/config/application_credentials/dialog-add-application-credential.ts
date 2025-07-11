import { mdiOpenInNew } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-combo-box";
import { createCloseHeading } from "../../../components/ha-dialog";
import "../../../components/ha-markdown";
import "../../../components/ha-password-field";
import "../../../components/ha-spinner";
import "../../../components/ha-textfield";
import type {
  ApplicationCredential,
  ApplicationCredentialsConfig,
} from "../../../data/application_credential";
import {
  createApplicationCredential,
  fetchApplicationCredentialsConfig,
} from "../../../data/application_credential";
import type { IntegrationManifest } from "../../../data/integration";
import { domainToName } from "../../../data/integration";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import type { AddApplicationCredentialDialogParams } from "./show-dialog-add-application-credential";

interface Domain {
  id: string;
  name: string;
}

@customElement("dialog-add-application-credential")
export class DialogAddApplicationCredential extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _loading = false;

  // Error message when can't talk to server etc
  @state() private _error?: string;

  @state() private _params?: AddApplicationCredentialDialogParams;

  @state() private _domain?: string;

  @state() private _manifest?: IntegrationManifest | null;

  @state() private _name?: string;

  @state() private _description?: string;

  @state() private _clientId?: string;

  @state() private _clientSecret?: string;

  @state() private _domains?: Domain[];

  @state() private _config?: ApplicationCredentialsConfig;

  public showDialog(params: AddApplicationCredentialDialogParams) {
    this._params = params;
    this._domain = params.selectedDomain;
    this._manifest = params.manifest;
    this._name = "";
    this._description = "";
    this._clientId = "";
    this._clientSecret = "";
    this._error = undefined;
    this._loading = false;
    this._fetchConfig();
  }

  private async _fetchConfig() {
    this._config = await fetchApplicationCredentialsConfig(this.hass);
    this._domains = Object.keys(this._config.integrations).map((domain) => ({
      id: domain,
      name: domainToName(this.hass.localize, domain),
    }));
    await this.hass.loadBackendTranslation("application_credentials");
    this._updateDescription();
  }

  protected render() {
    if (!this._params || !this._domains) {
      return nothing;
    }
    const selectedDomainName = this._params.selectedDomain
      ? domainToName(this.hass.localize, this._domain!)
      : "";
    return html`
      <ha-dialog
        open
        @closed=${this._abortDialog}
        scrimClickAction
        escapeKeyAction
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize(
            "ui.panel.config.application_credentials.editor.caption"
          )
        )}
      >
        <div>
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert> `
            : ""}
          ${this._params.selectedDomain && !this._description
            ? html`<p>
                ${this.hass.localize(
                  "ui.panel.config.application_credentials.editor.missing_credentials",
                  {
                    integration: selectedDomainName,
                  }
                )}
                ${this._manifest?.is_built_in || this._manifest?.documentation
                  ? html`<a
                      href=${this._manifest.is_built_in
                        ? documentationUrl(
                            this.hass,
                            `/integrations/${this._domain}`
                          )
                        : this._manifest.documentation}
                      target="_blank"
                      rel="noreferrer"
                    >
                      ${this.hass.localize(
                        "ui.panel.config.application_credentials.editor.missing_credentials_domain_link",
                        {
                          integration: selectedDomainName,
                        }
                      )}
                      <ha-svg-icon .path=${mdiOpenInNew}></ha-svg-icon>
                    </a>`
                  : ""}
              </p>`
            : ""}
          ${!this._params.selectedDomain || !this._description
            ? html`<p>
                ${this.hass.localize(
                  "ui.panel.config.application_credentials.editor.description"
                )}
                <a
                  href=${documentationUrl(
                    this.hass!,
                    "/integrations/application_credentials"
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  ${this.hass!.localize(
                    "ui.panel.config.application_credentials.editor.view_documentation"
                  )}
                  <ha-svg-icon .path=${mdiOpenInNew}></ha-svg-icon>
                </a>
              </p>`
            : ""}
          ${this._params.selectedDomain
            ? ""
            : html`<ha-combo-box
                name="domain"
                .hass=${this.hass}
                .label=${this.hass.localize(
                  "ui.panel.config.application_credentials.editor.domain"
                )}
                .value=${this._domain}
                .items=${this._domains}
                item-id-path="id"
                item-value-path="id"
                item-label-path="name"
                required
                @value-changed=${this._handleDomainPicked}
              ></ha-combo-box>`}
          ${this._description
            ? html`<ha-markdown
                breaks
                .content=${this._description}
              ></ha-markdown>`
            : ""}
          <ha-textfield
            class="name"
            name="name"
            .label=${this.hass.localize(
              "ui.panel.config.application_credentials.editor.name"
            )}
            .value=${this._name}
            required
            @input=${this._handleValueChanged}
            .validationMessage=${this.hass.localize("ui.common.error_required")}
            dialogInitialFocus
          ></ha-textfield>
          <ha-textfield
            class="clientId"
            name="clientId"
            .label=${this.hass.localize(
              "ui.panel.config.application_credentials.editor.client_id"
            )}
            .value=${this._clientId}
            required
            @input=${this._handleValueChanged}
            .validationMessage=${this.hass.localize("ui.common.error_required")}
            dialogInitialFocus
            .helper=${this.hass.localize(
              "ui.panel.config.application_credentials.editor.client_id_helper"
            )}
            helperPersistent
          ></ha-textfield>
          <ha-password-field
            .label=${this.hass.localize(
              "ui.panel.config.application_credentials.editor.client_secret"
            )}
            name="clientSecret"
            .value=${this._clientSecret}
            required
            @input=${this._handleValueChanged}
            .validationMessage=${this.hass.localize("ui.common.error_required")}
            .helper=${this.hass.localize(
              "ui.panel.config.application_credentials.editor.client_secret_helper"
            )}
            helperPersistent
          ></ha-password-field>
        </div>
        ${this._loading
          ? html`
              <div slot="primaryAction" class="submit-spinner">
                <ha-spinner></ha-spinner>
              </div>
            `
          : html`
              <ha-button slot="secondaryAction" @click=${this._abortDialog}>
                ${this.hass.localize("ui.common.cancel")}
              </ha-button>
              <ha-button
                slot="primaryAction"
                .disabled=${!this._domain ||
                !this._clientId ||
                !this._clientSecret}
                @click=${this._addApplicationCredential}
              >
                ${this.hass.localize(
                  "ui.panel.config.application_credentials.editor.add"
                )}
              </ha-button>
            `}
      </ha-dialog>
    `;
  }

  public closeDialog() {
    this._params = undefined;
    this._domains = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _handleDomainPicked(ev: CustomEvent) {
    ev.stopPropagation();
    this._domain = ev.detail.value;
    this._updateDescription();
  }

  private async _updateDescription() {
    if (!this._domain) {
      return;
    }

    await this.hass.loadBackendTranslation(
      "application_credentials",
      this._domain
    );
    const info = this._config!.integrations[this._domain];
    this._description = this.hass.localize(
      `component.${this._domain}.application_credentials.description`,
      info.description_placeholders
    );
  }

  private _handleValueChanged(ev: CustomEvent) {
    this._error = undefined;
    const name = (ev.target as any).name;
    const value = (ev.target as any).value;
    this[`_${name}`] = value;
  }

  private _abortDialog() {
    if (this._params && this._params.dialogAbortedCallback) {
      this._params.dialogAbortedCallback();
    }
    this.closeDialog();
  }

  private async _addApplicationCredential(ev) {
    ev.preventDefault();
    if (!this._domain || !this._clientId || !this._clientSecret) {
      return;
    }

    this._loading = true;
    this._error = "";

    let applicationCredential: ApplicationCredential;
    try {
      applicationCredential = await createApplicationCredential(
        this.hass,
        this._domain,
        this._clientId,
        this._clientSecret,
        this._name
      );
    } catch (err: any) {
      this._loading = false;
      this._error = err.message;
      return;
    }
    this._params!.applicationCredentialAddedCallback(applicationCredential);
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --mdc-dialog-max-width: 500px;
          --dialog-z-index: 10;
        }
        .row {
          display: flex;
          padding: 8px 0;
        }
        ha-combo-box {
          display: block;
          margin-bottom: 24px;
        }
        ha-textfield {
          display: block;
          margin-bottom: 24px;
        }
        a {
          text-decoration: none;
        }
        a ha-svg-icon {
          --mdc-icon-size: 16px;
        }
        ha-markdown {
          margin-bottom: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-add-application-credential": DialogAddApplicationCredential;
  }
}
