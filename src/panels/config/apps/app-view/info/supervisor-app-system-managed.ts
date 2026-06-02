import { consume, type ContextType } from "@lit/context";
import type { TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-button";
import { internationalizationContext } from "../../../../../data/context";

@customElement("supervisor-app-system-managed")
class SupervisorAppSystemManaged extends LitElement {
  @property({ type: Boolean }) public narrow = false;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private i18n!: ContextType<typeof internationalizationContext>;

  @property({ type: Boolean, attribute: "hide-button" }) public hideButton =
    false;

  protected render(): TemplateResult {
    return html`
      <ha-alert
        alert-type="warning"
        .title=${this.i18n.localize(
          "ui.panel.config.apps.dashboard.system_managed.title"
        )}
        .narrow=${this.narrow}
      >
        ${this.i18n.localize(
          "ui.panel.config.apps.dashboard.system_managed.description"
        )}
        ${!this.hideButton
          ? html`
              <ha-button slot="action" @click=${this._takeControl}>
                ${this.i18n.localize(
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
