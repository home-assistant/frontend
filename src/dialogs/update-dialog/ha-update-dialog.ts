import "@material/mwc-button/mwc-button";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { computeRTL } from "../../common/util/compute_rtl";
import "../../components/ha-alert";
import "../../components/ha-checkbox";
import "../../components/ha-circular-progress";
import { createCloseHeading } from "../../components/ha-dialog";
import "../../components/ha-faded";
import "../../components/ha-formfield";
import "../../components/ha-icon-button";
import "../../components/ha-markdown";
import {
  performUpdate,
  skipUpdate,
  UpdateDescription,
} from "../../data/update";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import { UpdateDialogParams } from "./show-ha-update-dialog";

@customElement("ha-update-dialog")
export class HaUpdateDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _opened = false;

  @state() private _updating = false;

  @state() private _error?: string;

  @state() private _update!: UpdateDescription;

  _refreshCallback!: () => void;

  public async showDialog(dialogParams: UpdateDialogParams): Promise<void> {
    this._opened = true;
    this._update = dialogParams.update;
    this._refreshCallback = dialogParams.refreshCallback;
  }

  public async closeDialog(): Promise<void> {
    this._opened = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._opened) {
      return html``;
    }
    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        scrimClickAction
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize("ui.panel.config.updates.dialog.title", {
            name: this._update.name,
          })
        )}
      >
        <div>
          ${this._error
            ? html`<ha-alert alert-type="error" .rtl=${computeRTL(this.hass)}>
                ${this._error}
              </ha-alert>`
            : ""}
          ${!this._updating
            ? html`
                ${this._update.changelog_content
                  ? html`
                      <ha-faded>
                        <ha-markdown .content=${this._update.changelog_content}>
                        </ha-markdown>
                      </ha-faded>
                    `
                  : ""}
                ${this._update.changelog_url
                  ? html`<a href=${this._update.changelog_url} target="_blank">
                      Full changelog
                    </a> `
                  : ""}
                <p>
                  ${this.hass.localize(
                    "ui.panel.config.updates.dialog.description",
                    {
                      name: this._update.name,
                      version: this._update.current_version,
                      newest_version: this._update.available_version,
                    }
                  )}
                </p>
                ${this._update.supports_backup
                  ? html`
                      <ha-formfield
                        .label=${this.hass.localize(
                          "ui.panel.config.updates.dialog.create_backup"
                        )}
                      >
                        <ha-checkbox checked></ha-checkbox>
                      </ha-formfield>
                    `
                  : ""}
              `
            : html`<ha-circular-progress alt="Updating" size="large" active>
                </ha-circular-progress>
                <p class="progress-text">
                  ${this.hass.localize(
                    "ui.panel.config.updates.dialog.updating",
                    {
                      name: this._update.name,
                      version: this._update.available_version,
                    }
                  )}
                </p>`}
        </div>
        ${!this._updating
          ? html`
              <mwc-button slot="secondaryAction" @click=${this._skipUpdate}>
                ${this.hass.localize("ui.common.skip")}
              </mwc-button>
              <mwc-button
                .disabled=${this._updating}
                slot="primaryAction"
                @click=${this._performUpdate}
              >
                ${this.hass.localize("ui.panel.config.updates.dialog.update")}
              </mwc-button>
            `
          : ""}
      </ha-dialog>
    `;
  }

  get _shouldCreateBackup(): boolean {
    if (!this._update.supports_backup) {
      return false;
    }
    const checkbox = this.shadowRoot?.querySelector("ha-checkbox");
    if (checkbox) {
      return checkbox.checked;
    }
    return true;
  }

  private async _performUpdate() {
    this._error = undefined;
    this._updating = true;
    try {
      await performUpdate(this.hass, {
        domain: this._update.domain,
        identifier: this._update.identifier,
        version: this._update.available_version,
        backup: this._shouldCreateBackup,
      });
    } catch (err: any) {
      this._error = err.message;
      this._updating = false;
      return;
    }
    this._updating = false;
    this._refreshCallback();
    this.closeDialog();
  }

  private async _skipUpdate() {
    this._error = undefined;
    try {
      await skipUpdate(this.hass, {
        domain: this._update.domain,
        identifier: this._update.identifier,
        version: this._update.available_version,
      });
    } catch (err: any) {
      this._error = err.message;
      return;
    }

    this._refreshCallback();
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-circular-progress {
          display: block;
          margin: 32px;
          text-align: center;
        }

        .progress-text {
          text-align: center;
        }

        ha-markdown {
          padding-bottom: 8px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-update-dialog": HaUpdateDialog;
  }
}
