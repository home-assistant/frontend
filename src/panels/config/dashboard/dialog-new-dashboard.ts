import "@material/mwc-list/mwc-list";
import { mdiPencilOutline, mdiShape } from "@mdi/js";
import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { createCloseHeading } from "../../../components/ha-dialog";
import "../../../components/ha-icon-next";
import "../../../components/ha-list-item";
import { HassDialog } from "../../../dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { shouldHandleRequestSelectedEvent } from "../../../common/mwc/handle-request-selected-event";
import { NewDashboardDialogParams } from "./show-dialog-new-dashboard";
import { LovelaceRawConfig } from "../../../data/lovelace/config/types";

const EMPTY_CONFIG: LovelaceRawConfig = { views: [{ title: "Home" }] };

@customElement("ha-dialog-new-dashboard")
class DialogNewDashboard extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _opened = false;

  @state() private _params?: NewDashboardDialogParams;

  public showDialog(params: NewDashboardDialogParams): void {
    this._opened = true;
    this._params = params;
  }

  public closeDialog(): void {
    if (this._opened) {
      fireEvent(this, "dialog-closed", { dialog: this.localName });
    }
    this._opened = false;
    this._params = undefined;
  }

  protected render() {
    if (!this._opened) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        hideActions
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize(
            `ui.panel.config.lovelace.dashboards.dialog_new.header`
          )
        )}
      >
        <mwc-list
          innerRole="listbox"
          itemRoles="option"
          innerAriaLabel=${this.hass.localize(
            `ui.panel.config.lovelace.dashboards.dialog_new.header`
          )}
          rootTabbable
          dialogInitialFocus
          @selected=${this._selected}
        >
          <ha-list-item
            hasmeta
            twoline
            graphic="icon"
            .config=${EMPTY_CONFIG}
            @request-selected=${this._selected}
          >
            <ha-svg-icon slot="graphic" .path=${mdiPencilOutline}></ha-svg-icon>
            ${this.hass.localize(
              `ui.panel.config.lovelace.dashboards.dialog_new.create_empty`
            )}
            <span slot="secondary">
              ${this.hass.localize(
                `ui.panel.config.lovelace.dashboards.dialog_new.create_empty_description`
              )}
            </span>
            <ha-icon-next slot="meta"></ha-icon-next>
          </ha-list-item>
          <li divider role="separator"></li>
          <ha-list-item
            hasmeta
            twoline
            graphic="icon"
            .config=${null}
            @request-selected=${this._selected}
          >
            <ha-svg-icon slot="graphic" .path=${mdiShape}></ha-svg-icon>
            ${this.hass.localize(
              `ui.panel.config.lovelace.dashboards.dialog_new.default`
            )}
            <span slot="secondary"
              >${this.hass.localize(
                `ui.panel.config.lovelace.dashboards.dialog_new.default_description`
              )}</span
            >
            <ha-icon-next slot="meta"></ha-icon-next>
          </ha-list-item>
        </mwc-list>
      </ha-dialog>
    `;
  }

  private async _selected(ev) {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    const config = (ev.currentTarget! as any).config;
    this._params?.selectConfig(config);
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-dialog {
          --dialog-content-padding: 0;
          --mdc-dialog-max-height: 60vh;
        }
        @media all and (min-width: 550px) {
          ha-dialog {
            --mdc-dialog-min-width: 500px;
          }
        }
        ha-icon-next {
          width: 24px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-new-dashboard": DialogNewDashboard;
  }
}
