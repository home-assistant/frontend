import { consume, type ContextType } from "@lit/context";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-card";
import { internationalizationContext } from "../../../../data/context";

@customElement("ha-esphome-setup-reminder")
export class HaESPHomeSetupReminder extends LitElement {
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n?: ContextType<typeof internationalizationContext>;

  @property({ type: Number }) public remaining = 0;

  @property({ type: Number }) public count = 0;

  protected render() {
    if (!this._i18n) {
      return nothing;
    }
    const localize = this._i18n.localize;
    const title =
      this.remaining > 0
        ? localize("ui.panel.config.devices.esphome.setup_reminder_remaining", {
            count: this.remaining,
          })
        : localize("ui.panel.config.devices.esphome.setup_reminder_done");
    const lead =
      this.remaining > 0
        ? localize("ui.panel.config.devices.esphome.setup_reminder_intro", {
            count: this.count,
          })
        : localize(
            "ui.panel.config.devices.esphome.setup_reminder_done_intro",
            { count: this.count }
          );
    return html`
      <ha-card outlined .header=${title}>
        <div class="card-content">
          <p>${lead}</p>
        </div>
        <div class="card-actions">
          <ha-button appearance="plain" @click=${this._setup}>
            ${localize("ui.panel.config.devices.esphome.setup_action")}
          </ha-button>
        </div>
      </ha-card>
    `;
  }

  private _setup() {
    fireEvent(this, "esphome-setup");
  }

  static styles = css`
    :host {
      display: block;
    }
    p {
      margin: 0;
      color: var(--secondary-text-color);
      line-height: var(--ha-line-height-normal);
    }
    .card-content {
      padding-block-end: var(--ha-space-6);
    }
    /* Same as Device info slot="actions" on ha-config-device-page
       (and ha-device-entities-card). */
    .card-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--ha-space-1) var(--ha-space-4) var(--ha-space-1)
        var(--ha-space-1);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-esphome-setup-reminder": HaESPHomeSetupReminder;
  }
}
