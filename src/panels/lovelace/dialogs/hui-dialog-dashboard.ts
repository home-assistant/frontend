import { mdiClose } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-dialog";
import "../../../components/ha-dialog-header";
import "../../../components/ha-header-bar";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import "../sections/hui-section";
import type { DashboardDialogParams } from "./show-dashboard-dialog";
import type { LovelaceSectionConfig } from "../../../data/lovelace/config/section";

@customElement("hui-dialog-dashboard")
class HuiDashboardDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: DashboardDialogParams;

  public async showDialog(params: DashboardDialogParams): Promise<void> {
    this._params = params;
  }

  public async closeDialog(): Promise<void> {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${this._params.title}
        hideActions
        flexContent
      >
        <ha-dialog-header slot="heading">
          <ha-icon-button
            slot="navigationIcon"
            dialogAction="cancel"
            .label=${this.hass.localize("ui.common.close")}
            .path=${mdiClose}
          ></ha-icon-button>
          <span slot="title">${this._params.title}</span>
          ${this._params.subtitle
            ? html`<span slot="subtitle">${this._params.subtitle}</span>`
            : nothing}
        </ha-dialog-header>
        <div class="content">
          ${repeat(
            this._params.sections,
            (section) => section,
            (section: LovelaceSectionConfig) => html`
              <hui-section .config=${section} .hass=${this.hass}></hui-section>
            `
          )}
        </div>
      </ha-dialog>
    `;
  }

  static styles = [
    haStyleDialog,
    css`
      ha-dialog {
        --dialog-content-padding: 0;
      }
      .content {
        padding: 0 16px 16px 16px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-dashboard": HuiDashboardDialog;
  }
}
