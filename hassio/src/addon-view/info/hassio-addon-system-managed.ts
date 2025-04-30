import "@material/mwc-button";
import type { TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../src/common/dom/fire_event";
import "../../../../src/components/ha-alert";
import "../../../../src/components/ha-button";
import type { Supervisor } from "../../../../src/data/supervisor/supervisor";

@customElement("hassio-addon-system-managed")
class HassioAddonSystemManaged extends LitElement {
  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @property({ type: Boolean, attribute: "hide-button" }) public hideButton =
    false;

  protected render(): TemplateResult {
    return html`
      <ha-alert
        alert-type="warning"
        .title=${this.supervisor.localize("addon.system_managed.title")}
        .narrow=${this.narrow}
      >
        ${this.supervisor.localize("addon.system_managed.description")}
        ${!this.hideButton
          ? html`
              <ha-button slot="action" @click=${this._takeControl}>
                ${this.supervisor.localize("addon.system_managed.take_control")}
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
    "hassio-addon-system-managed": HassioAddonSystemManaged;
  }

  interface HASSDomEvents {
    "system-managed-take-control": undefined;
  }
}
