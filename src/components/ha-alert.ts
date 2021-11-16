import "@material/mwc-button/mwc-button";
import {
  mdiAlertCircleOutline,
  mdiAlertOutline,
  mdiCheckboxMarkedCircleOutline,
  mdiClose,
  mdiInformationOutline,
} from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../common/dom/fire_event";
import "./ha-icon-button";
import "./ha-svg-icon";

const ALERT_ICONS = {
  info: mdiInformationOutline,
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

  @property({ attribute: "alert-type" }) public alertType:
    | "info"
    | "warning"
    | "error"
    | "success" = "info";

  @property({ attribute: "action-text" }) public actionText = "";

  @property({ type: Boolean }) public dismissable = false;

  @property({ type: Boolean }) public rtl = false;

  public render() {
    return html`
      <div
        class="issue-type ${classMap({
          rtl: this.rtl,
          [this.alertType]: true,
        })}"
      >
        <slot name="icon">
          <div class="icon ${this.title ? "" : "no-title"}">
            <ha-svg-icon .path=${ALERT_ICONS[this.alertType]}></ha-svg-icon>
          </div>
        </slot>
        <div class="content">
          <div class="main-content">
            ${this.title ? html`<div class="title">${this.title}</div>` : ""}
            <slot></slot>
          </div>
          <div class="action">
            <slot name="action">
              ${this.actionText
                ? html`<mwc-button
                    @click=${this._action_clicked}
                    .label=${this.actionText}
                  ></mwc-button>`
                : this.dismissable
                ? html`<ha-icon-button
                    @click=${this._dismiss_clicked}
                    label="Dismiss alert"
                    .path=${mdiClose}
                  ></ha-icon-button>`
                : ""}
            </slot>
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
      padding: 8px;
      display: flex;
      margin: 4px 0;
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
    slot > .icon {
      margin-right: 8px;
      width: 24px;
    }
    .icon.no-title {
      align-self: center;
    }
    .issue-type.rtl > slot > .icon {
      margin-right: 0px;
      margin-left: 8px;
      width: 24px;
    }
    .issue-type.rtl > .content {
      flex-direction: row-reverse;
      text-align: right;
    }
    .content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }
    .main-content {
      overflow-wrap: anywhere;
    }
    .title {
      margin-top: 2px;
      font-weight: bold;
    }
    mwc-button {
      --mdc-theme-primary: var(--primary-text-color);
    }
    ha-icon-button {
      --mdc-icon-button-size: 36px;
    }
    .issue-type.info > slot > .icon {
      color: var(--info-color);
    }
    .issue-type.info::before {
      background-color: var(--info-color);
    }

    .issue-type.warning > slot > .icon {
      color: var(--warning-color);
    }
    .issue-type.warning::before {
      background-color: var(--warning-color);
    }

    .issue-type.error > slot > .icon {
      color: var(--error-color);
    }
    .issue-type.error::before {
      background-color: var(--error-color);
    }

    .issue-type.success > slot > .icon {
      color: var(--success-color);
    }
    .issue-type.success::before {
      background-color: var(--success-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-alert": HaAlert;
  }
}
