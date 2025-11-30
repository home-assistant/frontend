import type { TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-button";
import type { HomeAssistant } from "../../../../../types";

@customElement("supervisor-app-system-managed")
class SupervisorAppSystemManaged extends LitElement {
  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, attribute: "hide-button" }) public hideButton =
    false;

  protected render(): TemplateResult {
    return html`
      <ha-alert
        alert-type="warning"
        .title=${this.hass.localize(
          "ui.panel.config.apps.dashboard.system_managed.title"
        )}
        .narrow=${this.narrow}
      >
        ${this.hass.localize(
          "ui.panel.config.apps.dashboard.system_managed.description"
        )}
        ${!this.hideButton
          ? html`
              <ha-button slot="action" @click=${this._takeControl}>
                ${this.hass.localize(
                  "ui.panel.config.apps.dashboard.system_managed.take_control"
                )}
              </ha-button>
            `
          : nothing}
      </ha-alert>
    `;
  }

  private _takeControl() {
    fireEvent(this, "system-managed-take-control");
  }

  static styles = css`
    ha-alert {
      display: block;
      margin-bottom: 16px;
    }
    ha-button {
      white-space: nowrap;
    }
  `;
}
declare global {
  interface HTMLElementTagNameMap {
    "supervisor-app-system-managed": SupervisorAppSystemManaged;
  }

  interface HASSDomEvents {
    "system-managed-take-control": undefined;
  }
}
