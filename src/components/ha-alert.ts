import "@material/mwc-button/mwc-button";
import "@material/mwc-icon-button/mwc-icon-button";
import {
  mdiAlertCircleOutline,
  mdiAlertOutline,
  mdiCheckboxMarkedCircleOutline,
  mdiClose,
} from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../common/dom/fire_event";
import "./ha-svg-icon";

const ALERT_ICONS = {
  info: mdiAlertCircleOutline,
  warning: mdiAlertOutline,
  error: mdiAlertCircleOutline,
  success: mdiCheckboxMarkedCircleOutline,
};

declare global {
  interface HASSDomEvents {
    "alert-dismissed-clicked": undefined;
    "alert-action-clicked": undefined;
  }
}

@customElement("ha-alert")
class HaAlert extends LitElement {
  @property() public title = "";

  @property() public alertType: "info" | "warning" | "error" | "success" =
    "info";

  @property({ attribute: "action-text" }) public actionText = "";

  @property({ type: Boolean }) public dismissable = false;

  @property({ type: Boolean }) public rtl = false;

  public render() {
    return html`
      <div
        class=${classMap({
          "issue-type": true,
          rtl: this.rtl,
          info: this.alertType === "info",
          warning: this.alertType === "warning",
          error: this.alertType === "error",
          success: this.alertType === "success",
        })}
      >
        <div
          class=${classMap({
            icon: true,
            info: this.alertType === "info",
            warning: this.alertType === "warning",
            error: this.alertType === "error",
            success: this.alertType === "success",
          })}
        >
          <ha-svg-icon .path=${ALERT_ICONS[this.alertType]}></ha-svg-icon>
        </div>
        <div
          class=${classMap({
            content: true,
            rtl: this.rtl,
          })}
        >
          <div
            class=${classMap({
              "main-content": true,
              no_title: !this.title,
            })}
          >
            ${this.title ? html`<div class="title">${this.title}</div>` : ""}
            <slot></slot>
          </div>
          <div class="action">
            ${this.actionText
              ? html`<mwc-button
                  @click=${this._action_clicked}
                  .aria-label=${this.actionText}
                >
                  ${this.actionText}
                </mwc-button>`
              : this.dismissable
              ? html`<mwc-icon-button
                  @click=${this._dismiss_clicked}
                  aria-label="Dismiss alert"
                >
                  <ha-svg-icon .path=${mdiClose}> </ha-svg-icon>
                </mwc-icon-button> `
              : ""}
          </div>
        </div>
      </div>
    `;
  }

  private _dismiss_clicked() {
    fireEvent(this, "alert-dismissed-clicked");
  }

  private _action_clicked() {
    fireEvent(this, "alert-action-clicked");
  }

  static styles = css`
    .issue-type {
      position: relative;
      padding: 4px;
      display: flex;
      margin: 4px 0;
      min-height: 56px;
    }
    .issue-type.rtl {
      flex-direction: row-reverse;
    }
    .issue-type::before {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      opacity: 0.12;
      pointer-events: none;
      content: "";
      border-radius: 4px;
    }
    .icon {
      margin: 4px 8px;
      width: 24px;
    }
    .main-content.no_title {
      margin-top: 6px;
    }
    .content.rtl {
      flex-direction: row-reverse;
      text-align: right;
    }
    .content {
      display: flex;
      justify-content: space-between;
      width: 100%;
    }
    .title {
      font-weight: bold;
      margin-top: 6px;
    }

    mwc-button {
      --mdc-theme-primary: var(--primary-text-color);
    }

    .icon.info {
      color: var(--info-color);
    }
    .issue-type.info::before {
      background-color: var(--info-color);
    }

    .icon.warning {
      color: var(--warning-color);
    }
    .issue-type.warning::before {
      background-color: var(--warning-color);
    }

    .icon.error {
      color: var(--error-color);
    }
    .issue-type.error::before {
      background-color: var(--error-color);
    }

    .icon.success {
      color: var(--success-color);
    }
    .issue-type.success::before {
      background-color: var(--success-color);
    }

    .action {
      align-self: center;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-alert": HaAlert;
  }
}
