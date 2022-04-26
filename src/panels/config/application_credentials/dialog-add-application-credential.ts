import "@material/mwc-button";
import "@polymer/paper-input/paper-input";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-circular-progress";
import "../../../components/ha-combo-box";
import { ComboBoxLitRenderer } from "lit-vaadin-helpers";
import { createCloseHeading } from "../../../components/ha-dialog";
import "../../../components/ha-formfield";
import "../../../components/ha-switch";
import {
  fetchApplicationCredentialsConfig,
  createApplicationCredential,
  ApplicationCredential,
} from "../../../data/application_credential";
import { domainToName } from "../../../data/integration";
import { PolymerChangedEvent } from "../../../polymer-types";
import { haStyleDialog } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { AddApplicationCredentialDialogParams } from "./show-dialog-add-application-credential";

interface Domain {
  id: string;
  name: string;
}

const rowRenderer: ComboBoxLitRenderer<Domain> = (item) => html`<mwc-list-item>
  <span>${item.name}</span>
</mwc-list-item>`;

@customElement("dialog-add-application-credential")
export class DialogAddApplicationCredential extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _loading = false;

  // Error message when can't talk to server etc
  @state() private _error?: string;

  @state() private _params?: AddApplicationCredentialDialogParams;

  @state() private _domain?: string;

  @state() private _clientId?: string;

  @state() private _clientSecret?: string;

  @state() private _domains?: Domain[];

  public showDialog(params: AddApplicationCredentialDialogParams) {
    this._params = params;
    this._domain = "";
    this._clientId = "";
    this._clientSecret = "";
    this._error = undefined;
    this._loading = false;
  }

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    this.addEventListener("keypress", (ev) => {
      if (ev.keyCode === 13) {
        this._createApplicationCredential(ev);
      }
    });
    this._fetchConfig();
  }

  private async _fetchConfig() {
    const config = await fetchApplicationCredentialsConfig(this.hass);
    this._domains = config.domains.map((domain) => ({
      id: domain,
      name: domainToName(this.hass.localize, domain),
    }));
  }

  protected render(): TemplateResult {
    if (!this._params || !this._domains) {
      return html``;
    }
    return html`
      <ha-dialog
        open
        @closed=${this._close}
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
          ${this._error ? html` <div class="error">${this._error}</div> ` : ""}
          <ha-combo-box
            name="domain"
            .hass=${this.hass}
            .label=${this.hass.localize(
              "ui.panel.config.application_credentials.editor.domain"
            )}
            .value=${this._domain}
            .renderer=${rowRenderer}
            .items=${this._domains}
            item-id-path="id"
            item-value-path="id"
            item-label-path="name"
            required
            @value-changed=${this._handleDomainPicked}
          ></ha-combo-box>
          <paper-input
            class="clientId"
            name="clientId"
            .label=${this.hass.localize(
              "ui.panel.config.application_credentials.editor.client_id"
            )}
            .value=${this._clientId}
            required
            auto-validate
            autocapitalize="none"
            @value-changed=${this._handleValueChanged}
            .errorMessage=${this.hass.localize("ui.common.error_required")}
            dialogInitialFocus
          ></paper-input>

          <paper-input
            .label=${this.hass.localize(
              "ui.panel.config.application_credentials.editor.client_secret"
            )}
            type="password"
            name="clientSecret"
            .value=${this._clientSecret}
            required
            auto-validate
            @value-changed=${this._handleValueChanged}
            .errorMessage=${this.hass.localize("ui.common.error_required")}
          ></paper-input>
        </div>
        ${this._loading
          ? html`
              <div slot="primaryAction" class="submit-spinner">
                <ha-circular-progress active></ha-circular-progress>
              </div>
            `
          : html`
              <mwc-button
                slot="primaryAction"
                .disabled=${!this._domain ||
                !this._clientId ||
                !this._clientSecret}
                @click=${this._createApplicationCredential}
              >
                ${this.hass.localize(
                  "ui.panel.config.application_credentials.editor.create"
                )}
              </mwc-button>
            `}
      </ha-dialog>
    `;
  }

  private _close() {
    this._params = undefined;
  }

  private async _handleDomainPicked(ev: PolymerChangedEvent<string>) {
    const target = ev.target as any;
    if (target.selectedItem) {
      this._domain = target.selectedItem.id;
    }
  }

  private _handleValueChanged(ev: PolymerChangedEvent<string>): void {
    this._error = undefined;
    const name = (ev.target as any).name;
    this[`_${name}`] = ev.detail.value;
  }

  private async _createApplicationCredential(ev) {
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
        this._clientSecret
      );
    } catch (err: any) {
      this._loading = false;
      this._error = err.message;
      return;
    }
    this._params!.applicationCredentialAddedCallback(applicationCredential);
    this._close();
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-add-application-credential": DialogAddApplicationCredential;
  }
}
