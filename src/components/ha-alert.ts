import {
  mdiAlertCircleOutline,
  mdiAlertOutline,
  mdiCheckboxMarkedCircleOutline,
  mdiClose,
  mdiInformationOutline,
} from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
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
  }
}

/**
 * A custom alert component for displaying messages with various alert types.
 * 
 * @element ha-alert
 * 
 * @property {string} title - The title of the alert. Defaults to an empty string.
 * @property {"info" | "warning" | "error" | "success"} alertType - The type of alert to display.
 * Defaults to "info". Determines the styling and icon used.
 * @property {boolean} dismissable - Whether the alert can be dismissed. Defaults to `false`.
 * If `true`, a dismiss button is displayed.
 * @property {boolean} narrow - Whether the alert should use a narrow layout. Defaults to `false`.
 * 
 * @slot - The main content of the alert.
 * @slot icon - Slot for providing a custom icon for the alert.
 * @slot action - Slot for providing custom actions or buttons for the alert.
 * 
 * @fires alert-dismissed-clicked - Fired when the dismiss button is clicked.
 * 
 * @csspart issue-type - The container for the alert.
 * @csspart icon - The container for the alert icon.
 * @csspart content - The container for the alert content.
 * @csspart action - The container for the alert actions.
 * @csspart title - The container for the alert title.
 * 
 * @cssprop --info-color - The color used for "info" alerts.
 * @cssprop --warning-color - The color used for "warning" alerts.
 * @cssprop --error-color - The color used for "error" alerts.
 * @cssprop --success-color - The color used for "success" alerts.
 * @cssprop --primary-text-color - The primary text color used in the alert.
 */
@customElement("ha-alert")
class HaAlert extends LitElement {
  // eslint-disable-next-line lit/no-native-attributes
  @property() public title = "";

  @property({ attribute: "alert-type" }) public alertType:
    | "info"
    | "warning"
    | "error"
    | "success" = "info";
    
  @property({ type: Boolean }) public dismissable = false;

  @property({ type: Boolean }) public narrow = false;

  public render() {
    return html`
      <div
        class="issue-type ${classMap({
          [this.alertType]: true,
        })}"
        role="alert"
      >
        <div class="icon ${this.title ? "" : "no-title"}">
          <slot name="icon">
            <ha-svg-icon .path=${ALERT_ICONS[this.alertType]}></ha-svg-icon>
          </slot>
        </div>
        <div class=${classMap({ content: true, narrow: this.narrow })}>
          <div class="main-content">
            ${this.title
              ? html`<div class="title">${this.title}</div>`
              : nothing}
            <slot></slot>
          </div>
          <div class="action">
            <slot name="action">
              ${this.dismissable
                ? html`<ha-icon-button
                    @click=${this._dismissClicked}
                    label="Dismiss alert"
                    .path=${mdiClose}
                  ></ha-icon-button>`
                : nothing}
            </slot>
          </div>
        </div>
      </div>
    `;
  }

  private _dismissClicked() {
    fireEvent(this, "alert-dismissed-clicked");
  }

  static styles = css`
    .issue-type {
      position: relative;
      padding: 8px;
      display: flex;
    }
    .issue-type::after {
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
      z-index: 1;
    }
    .icon.no-title {
      align-self: center;
    }
    .content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      text-align: var(--float-start);
    }
    .content.narrow {
      flex-direction: column;
      align-items: flex-end;
    }
    .action {
      z-index: 1;
      width: min-content;
      --mdc-theme-primary: var(--primary-text-color);
    }
    .main-content {
      overflow-wrap: anywhere;
      word-break: break-word;
      margin-left: 8px;
      margin-right: 0;
      margin-inline-start: 8px;
      margin-inline-end: 0;
    }
    .title {
      margin-top: 2px;
      font-weight: var(--ha-font-weight-bold);
    }
    .action mwc-button,
    .action ha-icon-button {
      --mdc-theme-primary: var(--primary-text-color);
      --mdc-icon-button-size: 36px;
    }
    .issue-type.info > .icon {
      color: var(--info-color);
    }
    .issue-type.info::after {
      background-color: var(--info-color);
    }

    .issue-type.warning > .icon {
      color: var(--warning-color);
    }
    .issue-type.warning::after {
      background-color: var(--warning-color);
    }

    .issue-type.error > .icon {
      color: var(--error-color);
    }
    .issue-type.error::after {
      background-color: var(--error-color);
    }

    .issue-type.success > .icon {
      color: var(--success-color);
    }
    .issue-type.success::after {
      background-color: var(--success-color);
    }
    :host ::slotted(ul) {
      margin: 0;
      padding-inline-start: 20px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-alert": HaAlert;
  }
}
