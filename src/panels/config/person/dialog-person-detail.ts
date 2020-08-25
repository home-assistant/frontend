import "@material/mwc-button";
import "@polymer/paper-input/paper-input";
import {
  css,
  CSSResult,
  html,
  LitElement,
  property,
  internalProperty,
  TemplateResult,
} from "lit-element";
import memoizeOne from "memoize-one";
import "../../../components/ha-picture-upload";
import type { HaPictureUpload } from "../../../components/ha-picture-upload";
import "../../../components/entity/ha-entities-picker";
import { createCloseHeading } from "../../../components/ha-dialog";
import "../../../components/user/ha-user-picker";
import { PersonMutableParams } from "../../../data/person";
import { PolymerChangedEvent } from "../../../polymer-types";
import { haStyleDialog } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { PersonDetailDialogParams } from "./show-dialog-person-detail";
import { CropOptions } from "../../../dialogs/image-cropper-dialog/show-image-cropper-dialog";

const includeDomains = ["device_tracker"];

const cropOptions: CropOptions = {
  round: true,
  type: "image/jpeg",
  quality: 0.75,
  aspectRatio: 1,
};

class DialogPersonDetail extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private _name!: string;

  @internalProperty() private _userId?: string;

  @internalProperty() private _deviceTrackers!: string[];

  @internalProperty() private _picture!: string | null;

  @internalProperty() private _error?: string;

  @internalProperty() private _params?: PersonDetailDialogParams;

  @internalProperty() private _submitting = false;

  private _deviceTrackersAvailable = memoizeOne((hass) => {
    return Object.keys(hass.states).some(
      (entityId) =>
        entityId.substr(0, entityId.indexOf(".")) === "device_tracker"
    );
  });

  public async showDialog(params: PersonDetailDialogParams): Promise<void> {
    this._params = params;
    this._error = undefined;
    if (this._params.entry) {
      this._name = this._params.entry.name || "";
      this._userId = this._params.entry.user_id || undefined;
      this._deviceTrackers = this._params.entry.device_trackers || [];
      this._picture = this._params.entry.picture || null;
    } else {
      this._name = "";
      this._userId = undefined;
      this._deviceTrackers = [];
      this._picture = null;
    }
    await this.updateComplete;
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }
    const nameInvalid = this._name.trim() === "";
    return html`
      <ha-dialog
        open
        @closed=${this._close}
        scrimClickAction
        escapeKeyAction
        .heading=${createCloseHeading(
          this.hass,
          this._params.entry
            ? this._params.entry.name
            : this.hass!.localize("ui.panel.config.person.detail.new_person")
        )}
      >
        <div>
          ${this._error ? html` <div class="error">${this._error}</div> ` : ""}
          <div class="form">
            <paper-input
              dialogInitialFocus
              .value=${this._name}
              @value-changed=${this._nameChanged}
              label="${this.hass!.localize(
                "ui.panel.config.person.detail.name"
              )}"
              error-message="${this.hass!.localize(
                "ui.panel.config.person.detail.name_error_msg"
              )}"
              required
              auto-validate
            ></paper-input>
            <ha-picture-upload
              .hass=${this.hass}
              .value=${this._picture}
              crop
              .cropOptions=${cropOptions}
              @change=${this._pictureChanged}
            ></ha-picture-upload>

            <ha-user-picker
              label="${this.hass!.localize(
                "ui.panel.config.person.detail.linked_user"
              )}"
              .hass=${this.hass}
              .value=${this._userId}
              .users=${this._params.users}
              @value-changed=${this._userChanged}
            ></ha-user-picker>
            ${this._deviceTrackersAvailable(this.hass)
              ? html`
                  <p>
                    ${this.hass.localize(
                      "ui.panel.config.person.detail.device_tracker_intro"
                    )}
                  </p>
                  <ha-entities-picker
                    .hass=${this.hass}
                    .value=${this._deviceTrackers}
                    .includeDomains=${includeDomains}
                    .pickedEntityLabel=${this.hass.localize(
                      "ui.panel.config.person.detail.device_tracker_picked"
                    )}
                    .pickEntityLabel=${this.hass.localize(
                      "ui.panel.config.person.detail.device_tracker_pick"
                    )}
                    @value-changed=${this._deviceTrackersChanged}
                  >
                  </ha-entities-picker>
                `
              : html`
                  <p>
                    ${this.hass!.localize(
                      "ui.panel.config.person.detail.no_device_tracker_available_intro"
                    )}
                  </p>
                  <ul>
                    <li>
                      <a
                        href="https://www.home-assistant.io/integrations/#presence-detection"
                        target="_blank"
                        rel="noreferrer"
                        >${this.hass!.localize(
                          "ui.panel.config.person.detail.link_presence_detection_integrations"
                        )}</a
                      >
                    </li>
                    <li>
                      <a
                        @click="${this._closeDialog}"
                        href="/config/integrations"
                      >
                        ${this.hass!.localize(
                          "ui.panel.config.person.detail.link_integrations_page"
                        )}</a
                      >
                    </li>
                  </ul>
                `}
          </div>
        </div>
        ${this._params.entry
          ? html`
              <mwc-button
                slot="secondaryAction"
                class="warning"
                @click="${this._deleteEntry}"
                .disabled=${this._submitting}
              >
                ${this.hass!.localize("ui.panel.config.person.detail.delete")}
              </mwc-button>
            `
          : html``}
        <mwc-button
          slot="primaryAction"
          @click="${this._updateEntry}"
          .disabled=${nameInvalid || this._submitting}
        >
          ${this._params.entry
            ? this.hass!.localize("ui.panel.config.person.detail.update")
            : this.hass!.localize("ui.panel.config.person.detail.create")}
        </mwc-button>
      </ha-dialog>
    `;
  }

  private _closeDialog() {
    this._params = undefined;
  }

  private _nameChanged(ev: PolymerChangedEvent<string>) {
    this._error = undefined;
    this._name = ev.detail.value;
  }

  private _userChanged(ev: PolymerChangedEvent<string>) {
    this._error = undefined;
    this._userId = ev.detail.value;
  }

  private _deviceTrackersChanged(ev: PolymerChangedEvent<string[]>) {
    this._error = undefined;
    this._deviceTrackers = ev.detail.value;
  }

  private _pictureChanged(ev: PolymerChangedEvent<string | null>) {
    this._error = undefined;
    this._picture = (ev.target as HaPictureUpload).value;
  }

  private async _updateEntry() {
    this._submitting = true;
    try {
      const values: PersonMutableParams = {
        name: this._name.trim(),
        device_trackers: this._deviceTrackers,
        user_id: this._userId || null,
        picture: this._picture,
      };
      if (this._params!.entry) {
        await this._params!.updateEntry(values);
      } else {
        await this._params!.createEntry(values);
      }
      this._params = undefined;
    } catch (err) {
      this._error = err ? err.message : "Unknown error";
    } finally {
      this._submitting = false;
    }
  }

  private async _deleteEntry() {
    this._submitting = true;
    try {
      if (await this._params!.removeEntry()) {
        this._params = undefined;
      }
    } finally {
      this._submitting = false;
    }
  }

  private _close(): void {
    this._params = undefined;
  }

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        .form {
          padding-bottom: 24px;
        }
        ha-picture-upload {
          display: block;
        }
        ha-user-picker {
          margin-top: 16px;
        }
        a {
          color: var(--primary-color);
        }
        p {
          color: var(--primary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-person-detail": DialogPersonDetail;
  }
}

customElements.define("dialog-person-detail", DialogPersonDetail);
