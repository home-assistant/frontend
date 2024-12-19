import {
  mdiAlertCircleOutline,
  mdiAlertOutline,
  mdiCheck,
  mdiInformationOutline,
  mdiSync,
} from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../components/ha-button";
import "../../../../components/ha-card";
import "../../../../components/ha-circular-progress";
import "../../../../components/ha-icon";

type SummaryStatus = "success" | "error" | "info" | "warning" | "loading";

const ICONS: Record<SummaryStatus, string> = {
  success: mdiCheck,
  error: mdiAlertCircleOutline,
  warning: mdiAlertOutline,
  info: mdiInformationOutline,
  loading: mdiSync,
};

@customElement("ha-backup-summary-card")
class HaBackupSummaryCard extends LitElement {
  @property()
  public heading!: string;

  @property()
  public description!: string;

  @property({ type: Boolean, attribute: "has-action" })
  public hasAction = false;

  @property()
  public status: SummaryStatus = "info";

  render() {
    return html`
      <ha-card outlined>
        <div class="summary">
          ${this.status === "loading"
            ? html`<ha-circular-progress indeterminate></ha-circular-progress>`
            : html`
                <div class="icon ${this.status}">
                  <ha-svg-icon .path=${ICONS[this.status]}></ha-svg-icon>
                </div>
              `}

          <div class="content">
            <p class="heading">${this.heading}</p>
            <p class="description">${this.description}</p>
          </div>
          ${this.hasAction
            ? html`
                <div class="action">
                  <slot name="action"></slot>
                </div>
              `
            : nothing}
        </div>
        <div class="content">
          <slot></slot>
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    .summary {
      display: flex;
      flex-direction: row;
      column-gap: 16px;
      row-gap: 8px;
      align-items: center;
      padding: 16px;
      width: 100%;
      box-sizing: border-box;
    }
    .icon {
      position: relative;
      border-radius: 20px;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      --icon-color: var(--primary-color);
    }
    .icon.success {
      --icon-color: var(--success-color);
    }
    .icon.warning {
      --icon-color: var(--warning-color);
    }
    .icon.error {
      --icon-color: var(--error-color);
    }
    .icon::before {
      display: block;
      content: "";
      position: absolute;
      inset: 0;
      background-color: var(--icon-color, var(--primary-color));
      opacity: 0.2;
    }
    .icon ha-svg-icon {
      color: var(--icon-color, var(--primary-color));
      width: 24px;
      height: 24px;
    }
    ha-circular-progress {
      --md-circular-progress-size: 40px;
    }
    .content {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
    }
    .heading {
      font-size: 22px;
      font-style: normal;
      font-weight: 400;
      line-height: 28px;
      color: var(--primary-text-color);
      margin: 0;
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
    }
    .description {
      font-size: 14px;
      font-style: normal;
      font-weight: 400;
      line-height: 20px;
      letter-spacing: 0.25px;
      color: var(--secondary-text-color);
      margin: 0;
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
    }

    @media all and (max-width: 550px) {
      .summary {
        flex-wrap: wrap;
        padding: 8px;
      }
      .action {
        width: 100%;
        display: flex;
        justify-content: flex-end;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-backup-summary-card": HaBackupSummaryCard;
  }
}
