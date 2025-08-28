import {
  mdiAlertCircleOutline,
  mdiAlertOutline,
  mdiCheckboxMarkedCircleOutline,
  mdiClose,
  mdiInformationOutline,
  mdiLoading,
} from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../common/dom/fire_event";
import "./ha-icon-button";
import "./ha-svg-icon";
import "./ha-spinner";

const ALERT_ICONS = {
  info: mdiInformationOutline,
  warning: mdiAlertOutline,
  error: mdiAlertCircleOutline,
  success: mdiCheckboxMarkedCircleOutline,
  loading: mdiLoading,
};

declare global {
  interface HASSDomEvents {
    "alert-dismissed-clicked": undefined;
  }
}

@customElement("ha-alert")
class HaAlert extends LitElement {
  // eslint-disable-next-line lit/no-native-attributes
  @property() public title = "";

  @property({ attribute: "alert-type" }) public alertType:
    | "info"
    | "warning"
    | "error"
    | "success"
    | "loading" = "info";

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
            ${this.alertType === "loading"
              ? html`<ha-spinner></ha-spinner>`
              : html`<ha-svg-icon
                  .path=${ALERT_ICONS[this.alertType]}
                ></ha-svg-icon>`}
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
      line-height: normal;
      margin-left: 8px;
      margin-right: 0;
      margin-inline-start: 8px;
      margin-inline-end: 8px;
    }
    .title {
      margin-top: 2px;
      font-weight: var(--ha-font-weight-bold);
    }
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

    .issue-type.loading > .icon {
      color: var(--loading-color);
    }
    .issue-type.loading::after {
      background-color: var(--loading-color);
    }
    .issue-type.loading > .icon ha-spinner {
      --ha-spinner-size: 24px;
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
