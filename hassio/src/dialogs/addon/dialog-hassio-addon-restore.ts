import "@material/mwc-button/mwc-button";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import relativeTime from "../../../../src/common/datetime/relative_time";
import { fireEvent } from "../../../../src/common/dom/fire_event";
import "../../../../src/common/search/search-input";
import { compare } from "../../../../src/common/string/compare";
import { nextRender } from "../../../../src/common/util/render-status";
import "../../../../src/components/ha-circular-progress";
import { createCloseHeading } from "../../../../src/components/ha-dialog";
import "../../../../src/components/ha-expansion-panel";
import "../../../../src/components/ha-settings-row";
import { extractApiErrorMessage } from "../../../../src/data/hassio/common";
import {
  fetchHassioSnapshotInfo,
  HassioPartialSnapshotCreateParams,
  HassioSnapshotDetail,
  supervisorRestorePartialSnapshot,
} from "../../../../src/data/hassio/snapshot";
import {
  showAlertDialog,
  showPromptDialog,
} from "../../../../src/dialogs/generic/show-dialog-box";
import { haStyle, haStyleDialog } from "../../../../src/resources/styles";
import { HomeAssistant } from "../../../../src/types";
import { HassioAddonRestoreDialogParams } from "./show-dialog-hassio-addon-restore";

@customElement("dialog-hassio-addon-restore")
class HassioAddonRestoreDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _dialogParams?: HassioAddonRestoreDialogParams;

  @state() private _snapshots?: HassioSnapshotDetail[];

  @state() private _restoring = false;

  public showDialog(params: HassioAddonRestoreDialogParams) {
    this._dialogParams = params;
    this._restoring = false;
    Promise.all(
      params.snapshots.map((snapshot) =>
        fetchHassioSnapshotInfo(this.hass, snapshot.slug)
      )
    ).then((data) => {
      this._snapshots = data.sort((a, b) => compare(b.date, a.date));
    });
  }

  public closeDialog() {
    this._dialogParams = undefined;
    this._snapshots = undefined;
    this._restoring = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._dialogParams || (!this._snapshots && !this._restoring)) {
      return html``;
    }

    const snapshotCount = this._snapshots?.length || 0;

    return html`
      <ha-dialog
        open
        hideActions
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          this._dialogParams.supervisor.localize("dialog.addon_restore.title", {
            name: this._dialogParams.addon.name,
          })
        )}
      >
        ${this._restoring
          ? html`<div class="restore">
              <ha-circular-progress size="large" active></ha-circular-progress>
              <span
                >${this._dialogParams.supervisor.localize(
                  "dialog.addon_restore.restore_in_progress"
                )}
              </span>
            </div>`
          : html`${this._dialogParams.supervisor.localize(
              "dialog.addon_restore.description",
              {
                name: this._dialogParams.addon.name,
                count: snapshotCount,
              }
            )}
            ${this._snapshots?.map(
              (snapshot) =>
                html`<ha-settings-row three-lines>
                  <span slot="heading">
                    ${snapshot.name || snapshot.slug}
                  </span>
                  <span slot="description">
                    <div>
                      ${this._dialogParams!.supervisor.localize(
                        "dialog.addon_restore.version",
                        {
                          version:
                            snapshot.addons.find(
                              (addon) =>
                                addon.slug === this._dialogParams?.addon.slug
                            )?.version ||
                            this._dialogParams!.supervisor.localize(
                              "dialog.addon_restore.no_version"
                            ),
                        }
                      )}
                    </div>
                    ${relativeTime(new Date(snapshot.date), this.hass.localize)}
                  </span>
                  <mwc-button
                    .snapshot=${snapshot}
                    @click=${this._restoreClicked}
                  >
                    ${this._dialogParams!.supervisor.localize(
                      "dialog.addon_restore.restore"
                    )}
                  </mwc-button>
                </ha-settings-row>`
            )}`}
      </ha-dialog>
    `;
  }

  private async _restoreClicked(ev: CustomEvent) {
    let password: string | null = null;
    const snapshot: HassioSnapshotDetail = (ev.currentTarget as any).snapshot;
    if (snapshot.protected) {
      password = await showPromptDialog(this, {
        text: this._dialogParams?.supervisor.localize(
          "dialog.addon_restore.protected"
        ),
        inputLabel: this._dialogParams?.supervisor.localize(
          "dialog.addon_restore.password"
        ),
        inputType: "password",
      });
      await nextRender();
      if (!password) {
        return;
      }
    }
    this._restoring = true;

    const data: HassioPartialSnapshotCreateParams = {
      addons: [this._dialogParams!.addon.slug],
    };
    if (password) {
      data.password = password;
    }

    try {
      await supervisorRestorePartialSnapshot(this.hass, snapshot.slug, data);
    } catch (err) {
      await showAlertDialog(this, {
        text: extractApiErrorMessage(err),
      });
      await nextRender();
      return;
    }

    this._dialogParams?.onRestore();
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        .restore {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-hassio-addon-restore": HassioAddonRestoreDialog;
  }
}
