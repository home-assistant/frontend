import { consume } from "@lit/context";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import type { SecurityAlertItem } from "./helpers";
import { securityAlertsContext } from "./context";
import "./hui-security-alert-card";

@customElement("hui-security-alerts-list")
export class HuiSecurityAlertsList extends LitElement {
  @state()
  @consume({ context: securityAlertsContext, subscribe: true })
  private _alerts: SecurityAlertItem[] = [];

  protected render() {
    if (!this._alerts.length) {
      return nothing;
    }

    return html`
      <div class="alerts">
        ${this._alerts.map(
          (alert) => html`
            <hui-security-alert-card .alert=${alert}></hui-security-alert-card>
          `
        )}
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }
    .alerts {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-2);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-security-alerts-list": HuiSecurityAlertsList;
  }
}
