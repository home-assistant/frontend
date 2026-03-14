import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-button";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-wa-dialog";
import type { HassDialog } from "../../../dialogs/make-dialog-manager";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import type { NewOverviewDialogParams } from "./show-dialog-new-overview";

@customElement("dialog-new-overview")
export class DialogNewOverview
  extends LitElement
  implements HassDialog<NewOverviewDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: NewOverviewDialogParams;

  @state() private _open = false;

  public showDialog(params: NewOverviewDialogParams): void {
    this._params = params;
    this._open = true;
  }

  public closeDialog(): boolean {
    this._open = false;
    return true;
  }

  private _dialogClosed(): void {
    if (this._params) {
      this._params.dismiss();
    }
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        .headerTitle=${this.hass.localize(
          "ui.panel.home.new_overview_dialog.title"
        )}
        prevent-scrim-close
        @closed=${this._dialogClosed}
      >
        <div class="content">
          <p>
            ${this.hass.localize(
              "ui.panel.home.new_overview_dialog.description"
            )}
          </p>
          <h3>
            ${this.hass.localize("ui.panel.home.new_overview_dialog.whats_new")}
          </h3>
          <ul>
            <li>
              <strong>
                ${this.hass.localize(
                  "ui.panel.home.new_overview_dialog.automatic_organization"
                )}
              </strong>
              -
              ${this.hass.localize(
                "ui.panel.home.new_overview_dialog.automatic_organization_description"
              )}
            </li>
            <li>
              <strong>
                ${this.hass.localize(
                  "ui.panel.home.new_overview_dialog.favorites"
                )}
              </strong>
              -
              ${this.hass.localize(
                "ui.panel.home.new_overview_dialog.favorites_description"
              )}
            </li>
          </ul>
          <h3>
            ${this.hass.localize(
              "ui.panel.home.new_overview_dialog.existing_dashboards"
            )}
          </h3>
          <p>
            ${this.hass.localize(
              "ui.panel.home.new_overview_dialog.existing_dashboards_description",
              {
                dashboard_settings: html`<a
                  href="/config/lovelace/dashboards"
                  @click=${this.closeDialog}
                  >${this.hass.localize(
                    "ui.panel.home.new_overview_dialog.dashboard_settings"
                  )}</a
                >`,
              }
            )}
          </p>
        </div>
        <ha-dialog-footer slot="footer">
          <ha-button slot="primaryAction" @click=${this.closeDialog}>
            ${this.hass.localize(
              "ui.panel.home.new_overview_dialog.ok_understood"
            )}
          </ha-button>
        </ha-dialog-footer>
      </ha-wa-dialog>
    `;
  }

  static styles = [
    haStyleDialog,
    css`
      ha-wa-dialog {
        --dialog-content-padding: var(--ha-space-6);
      }

      .content {
        line-height: var(--ha-line-height-normal);
      }

      p {
        margin: 0 0 var(--ha-space-4) 0;
        color: var(--secondary-text-color);
      }

      h3 {
        margin: var(--ha-space-4) 0 var(--ha-space-2) 0;
        font-size: var(--ha-font-size-l);
        font-weight: var(--ha-font-weight-medium);
      }

      ul {
        margin: 0 0 var(--ha-space-4) 0;
        padding-left: var(--ha-space-6);
        color: var(--secondary-text-color);
      }

      li {
        margin-bottom: var(--ha-space-2);
      }

      li strong {
        color: var(--primary-text-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-new-overview": DialogNewOverview;
  }
}
