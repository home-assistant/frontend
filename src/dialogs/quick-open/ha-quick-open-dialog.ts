import "@material/mwc-button";
import "@material/mwc-icon-button";
import "@material/mwc-tab";
import "@material/mwc-tab-bar";
import {
  css,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
} from "lit-element";
import { fireEvent } from "../../common/dom/fire_event";

import "../../components/ha-dialog";
import "../../components/ha-header-bar";
import "../../components/ha-svg-icon";
import { haStyleDialog } from "../../resources/styles";
import "../../state-summary/state-card-content";
import { HomeAssistant } from "../../types";

import "../more-info/ha-more-info-history";
import "../more-info/ha-more-info-logbook";

export interface QuickOpenDialogParams {
  entityId: string | null;
}

@customElement("ha-quick-open-dialog")
export class QuickOpenDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public large = false;

  @internalProperty() private _entityId?: string | null;

  public showDialog(params: QuickOpenDialogParams) {
    this._entityId = params.entityId;
    if (!this._entityId) {
      this.closeDialog();
    }
    this.large = false;
  }

  public closeDialog() {
    this._entityId = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected updated(changedProperties) {
    console.log(changedProperties);
  }

  protected render() {
    return html`
      <ha-dialog open @closed=${this.closeDialog} .heading=${true} hideActions>
        Testing
      </ha-dialog>
    `;
  }

  static get styles() {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --dialog-surface-position: static;
          --dialog-content-position: static;
        }

        ha-header-bar {
          --mdc-theme-on-primary: var(--primary-text-color);
          --mdc-theme-primary: var(--mdc-theme-surface);
          flex-shrink: 0;
          display: block;
        }

        @media all and (max-width: 450px), all and (max-height: 500px) {
          ha-header-bar {
            --mdc-theme-primary: var(--app-header-background-color);
            --mdc-theme-on-primary: var(--app-header-text-color, white);
            border-bottom: none;
          }
        }

        .heading {
          border-bottom: 1px solid
            var(--mdc-dialog-scroll-divider-color, rgba(0, 0, 0, 0.12));
        }

        @media all and (min-width: 451px) and (min-height: 501px) {
          ha-dialog {
            --mdc-dialog-max-width: 90vw;
          }

          .content {
            width: 352px;
          }

          ha-header-bar {
            width: 400px;
          }

          .main-title {
            overflow: hidden;
            text-overflow: ellipsis;
            cursor: default;
          }

          ha-dialog[data-domain="camera"] .content,
          ha-dialog[data-domain="camera"] ha-header-bar {
            width: auto;
          }

          :host([large]) .content {
            width: calc(90vw - 48px);
          }

          :host([large]) ha-dialog[data-domain="camera"] .content,
          :host([large]) ha-header-bar {
            width: 90vw;
          }
        }

        ha-dialog[data-domain="camera"] {
          --dialog-content-padding: 0;
        }

        state-card-content,
        ha-more-info-history,
        ha-more-info-logbook:not(:last-child) {
          display: block;
          margin-bottom: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-quick-open-dialog": QuickOpenDialog;
  }
}
