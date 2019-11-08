import {
  LitElement,
  html,
  css,
  CSSResult,
  TemplateResult,
  property,
} from "lit-element";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";
import "@polymer/paper-input/paper-input";
import "@material/mwc-button";
import memoizeOne from "memoize-one";

import "../../../components/dialog/ha-paper-dialog";
import "../../../components/entity/ha-entities-picker";
import "../../../components/user/ha-user-picker";
import { PersonDetailDialogParams } from "./show-dialog-person-detail";
import { PolymerChangedEvent } from "../../../polymer-types";
import { haStyleDialog } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { PersonMutableParams } from "../../../data/person";

class DialogPersonDetail extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() private _name!: string;
  @property() private _userId?: string;
  @property() private _deviceTrackers!: string[];
  @property() private _error?: string;
  @property() private _params?: PersonDetailDialogParams;
  @property() private _submitting: boolean = false;

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
    } else {
      this._name = "";
      this._userId = undefined;
      this._deviceTrackers = [];
    }
    await this.updateComplete;
  }

  protected render(): TemplateResult | void {
    if (!this._params) {
      return html``;
    }
    const nameInvalid = this._name.trim() === "";
    return html`
      <ha-paper-dialog
        with-backdrop
        opened
        @opened-changed="${this._openedChanged}"
      >
        <h2>
          ${this._params.entry
            ? this._params.entry.name
            : this.hass!.localize("ui.panel.config.person.detail.new_person")}
        </h2>
        <paper-dialog-scrollable>
          ${this._error
            ? html`
                <div class="error">${this._error}</div>
              `
            : ""}
          <div class="form">
            <paper-input
              .value=${this._name}
              @value-changed=${this._nameChanged}
              label="${this.hass!.localize(
                "ui.panel.config.person.detail.name"
              )}"
              error-message="${this.hass!.localize(
                "ui.panel.config.person.detail.name_error_msg"
              )}"
              .invalid=${nameInvalid}
            ></paper-input>
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
                    include-domains='["device_tracker"]'
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
        </paper-dialog-scrollable>
        <div class="paper-dialog-buttons">
          ${this._params.entry
            ? html`
                <mwc-button
                  class="warning"
                  @click="${this._deleteEntry}"
                  .disabled=${this._submitting}
                >
                  ${this.hass!.localize("ui.panel.config.person.detail.delete")}
                </mwc-button>
              `
            : html``}
          <mwc-button
            @click="${this._updateEntry}"
            .disabled=${nameInvalid || this._submitting}
          >
            ${this._params.entry
              ? this.hass!.localize("ui.panel.config.person.detail.update")
              : this.hass!.localize("ui.panel.config.person.detail.create")}
          </mwc-button>
        </div>
      </ha-paper-dialog>
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

  private async _updateEntry() {
    this._submitting = true;
    try {
      const values: PersonMutableParams = {
        name: this._name.trim(),
        device_trackers: this._deviceTrackers,
        user_id: this._userId || null,
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

  private _openedChanged(ev: PolymerChangedEvent<boolean>): void {
    if (ev.detail.value) {
      this._params = undefined;
    }
  }

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        ha-paper-dialog {
          min-width: 400px;
        }
        .form {
          padding-bottom: 24px;
        }
        ha-user-picker {
          margin-top: 16px;
        }
        mwc-button.warning {
          margin-right: auto;
        }
        .error {
          color: var(--google-red-500);
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
