import type { RequestSelectedDetail } from "@material/mwc-list/mwc-list-item";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-button-menu";
import "../../../../../components/ha-check-list-item";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-textfield";
import { PersistentNotificationTrigger } from "../../../../../data/automation";
import { HomeAssistant } from "../../../../../types";
import { handleChangeEvent } from "../ha-automation-trigger-row";

const SUPPORTED_UPDATE_TYPES: {
  value: string;
  label: string;
}[] = [
  {
    value: "added",
    label:
      "ui.panel.config.automation.editor.triggers.type.persistent_notification.update_types.added",
  },
  {
    value: "removed",
    label:
      "ui.panel.config.automation.editor.triggers.type.persistent_notification.update_types.removed",
  },
  {
    value: "current",
    label:
      "ui.panel.config.automation.editor.triggers.type.persistent_notification.update_types.current",
  },
  {
    value: "updated",
    label:
      "ui.panel.config.automation.editor.triggers.type.persistent_notification.update_types.updated",
  },
];
const DEFAULT_UPDATE_TYPES = ["added", "removed"];
const DEFAULT_NOTIFICATION_ID = "";

@customElement("ha-automation-trigger-persistent_notification")
export class HaPersistentNotificationTrigger extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public trigger!: PersistentNotificationTrigger;

  @property({ type: Boolean }) public disabled = false;

  public static get defaultConfig() {
    return {
      update_type: [...DEFAULT_UPDATE_TYPES],
      notification_id: DEFAULT_NOTIFICATION_ID,
    };
  }

  protected render() {
    const { update_type: updateTypes, notification_id: notificationId } =
      this.trigger;

    return html`
      <div class="form">
        <ha-textfield
          .label=${this.hass.localize(
            "ui.panel.config.automation.editor.triggers.type.persistent_notification.notification_id"
          )}
          name="notification_id"
          .value=${notificationId}
          .disabled=${this.disabled}
          @change=${this._valueChanged}
        ></ha-textfield>
        <ha-formfield
          .label=${this.hass.localize(
            "ui.panel.config.automation.editor.triggers.type.persistent_notification.update_type"
          )}
        >
          ${SUPPORTED_UPDATE_TYPES.map(
            (update_type) => html`
              <ha-check-list-item
                left
                .value=${update_type.value}
                @request-selected=${this._updateTypeChanged}
                .selected=${updateTypes!.includes(update_type.value)}
              >
                ${update_type.label}
              </ha-check-list-item>
          </ha-formfield>
        </div>
        `
          )}
        </ha-formfield>
      </div>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    handleChangeEvent(this, ev);
  }

  private _updateTypeChanged(ev: CustomEvent<RequestSelectedDetail>): void {
    ev.stopPropagation();
    const updateType = (ev.target as any).value;
    const selected = ev.detail.selected;

    if (selected === this.trigger.update_type?.includes(updateType)) {
      return;
    }

    const updateTypes = this.trigger.update_type ?? [];
    const newUpdateTypes = this.trigger.update_type
      ? [...this.trigger.update_type]
      : [];

    if (selected) {
      newUpdateTypes.push(updateType);
    } else {
      newUpdateTypes.splice(newUpdateTypes.indexOf(updateType), 1);
    }
    const newTrigger = { ...this.trigger, update_type: newUpdateTypes };
    fireEvent(this, "value-changed", { value: newTrigger });
  }

  static styles = css`
    ha-textfield {
      display: block;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-persistent_notification": HaPersistentNotificationTrigger;
  }
}
