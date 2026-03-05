import { mdiOpenInNew } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-fade-in";
import "../../../components/ha-generic-picker";
import "../../../components/ha-markdown";
import "../../../components/ha-password-field";
import type { PickerComboBoxItem } from "../../../components/ha-picker-combo-box";
import "../../../components/ha-spinner";
import "../../../components/ha-textfield";
import "../../../components/ha-wa-dialog";
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

  @state() private _open = false;

  @state() private _invalid = false;

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
    this._open = true;
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
    if (!this._params) {
      return nothing;
    }
    const selectedDomainName = this._params.selectedDomain
      ? domainToName(this.hass.localize, this._domain!)
      : "";
    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        @closed=${this._abortDialog}
        .preventScrimClose=${!!this._domain ||
        !!this._name ||
        !!this._clientId ||
        !!this._clientSecret}
        .headerTitle=${this.hass.localize(
          "ui.panel.config.application_credentials.editor.caption"
        )}
      >
        ${!this._config
          ? html`<ha-fade-in .delay=${500}>
              <ha-spinner size="large"></ha-spinner>
            </ha-fade-in>`
          : html`<div>
                ${this._error
                  ? html`<ha-alert alert-type="error"
                      >${this._error}</ha-alert
                    > `
                  : nothing}
                ${this._params.selectedDomain && !this._description
                  ? html`<p>
                      ${this.hass.localize(
                        "ui.panel.config.application_credentials.editor.missing_credentials",
                        {
                          integration: selectedDomainName,
                        }
                      )}
                      ${this._manifest?.is_built_in ||
                      this._manifest?.documentation
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
                        : nothing}
                    </p>`
                  : nothing}
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
                  : nothing}
                ${this._params.selectedDomain
                  ? nothing
                  : html`<ha-generic-picker
                      name="domain"
                      .hass=${this.hass}
                      .label=${this.hass.localize(
                        "ui.panel.config.application_credentials.editor.domain"
                      )}
                      .value=${this._domain}
                      .invalid=${this._invalid && !this._domain}
                      .getItems=${this._getDomainItems}
                      required
                      .disabled=${!this._domains}
                      .valueRenderer=${this._domainRenderer}
                      @value-changed=${this._handleDomainPicked}
                      .errorMessage=${this.hass.localize(
                        "ui.common.error_required"
                      )}
                    ></ha-generic-picker>`}
                ${this._description
                  ? html`<ha-markdown
                      breaks
                      .content=${this._description}
                    ></ha-markdown>`
                  : nothing}
                <ha-textfield
                  class="name"
                  name="name"
                  .label=${this.hass.localize(
                    "ui.panel.config.application_credentials.editor.name"
                  )}
                  .value=${this._name}
                  .invalid=${this._invalid && !this._name}
                  required
                  @input=${this._handleValueChanged}
                  .errorMessage=${this.hass.localize(
                    "ui.common.error_required"
                  )}
                  dialogInitialFocus
                ></ha-textfield>
                <ha-textfield
                  class="clientId"
                  name="clientId"
                  .label=${this.hass.localize(
                    "ui.panel.config.application_credentials.editor.client_id"
                  )}
                  .value=${this._clientId}
                  .invalid=${this._invalid && !this._clientId}
                  required
                  @input=${this._handleValueChanged}
                  .errorMessage=${this.hass.localize(
                    "ui.common.error_required"
                  )}
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
                  .invalid=${this._invalid && !this._clientSecret}
                  required
                  @input=${this._handleValueChanged}
                  .errorMessage=${this.hass.localize(
                    "ui.common.error_required"
                  )}
                  .helper=${this.hass.localize(
                    "ui.panel.config.application_credentials.editor.client_secret_helper"
                  )}
                  helperPersistent
                ></ha-password-field>
              </div>

              <ha-dialog-footer slot="footer">
                <ha-button
                  appearance="plain"
                  slot="secondaryAction"
                  @click=${this._closeDialog}
                  .disabled=${this._loading}
                >
                  ${this.hass.localize("ui.common.cancel")}
                </ha-button>
                <ha-button
                  slot="primaryAction"
                  @click=${this._addApplicationCredential}
                  .loading=${this._loading}
                >
                  ${this.hass.localize(
                    "ui.panel.config.application_credentials.editor.add"
                  )}
                </ha-button>
              </ha-dialog-footer>`}
      </ha-wa-dialog>
    `;
  }

  private _closeDialog() {
    this._open = false;
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
    if (
      !this._domain ||
      !this._name ||
      !this._clientId ||
      !this._clientSecret
    ) {
      this._invalid = true;
      return;
    }
    this._invalid = false;

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

  private _getDomainItems = (): PickerComboBoxItem[] =>
    this._domains?.map((domain) => ({
      id: domain.id,
      primary: domain.name,
      sorting_label: domain.name,
    })) ?? [];

  private _domainRenderer = (domainId: string) => {
    const domain = this._domains?.find((d) => d.id === domainId);
    return html`<span slot="headline"
      >${domain ? domain.name : domainId}</span
    >`;
  };

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
          padding: var(--ha-space-2) 0;
        }
        ha-textfield {
          display: block;
          margin-top: var(--ha-space-4);
          margin-bottom: var(--ha-space-4);
        }
        a {
          text-decoration: none;
        }
        a ha-svg-icon {
          --mdc-icon-size: 16px;
        }
        ha-markdown {
          margin-top: var(--ha-space-4);
          margin-bottom: var(--ha-space-4);
        }
        ha-fade-in {
          display: flex;
          width: 100%;
          justify-content: center;
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
