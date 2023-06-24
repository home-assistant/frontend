import memoizeOne from "memoize-one";

import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-button-menu";
import "../../../../../components/ha-check-list-item";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-textfield";
import { PersistentNotificationTrigger } from "../../../../../data/automation";
import { HomeAssistant } from "../../../../../types";
import type { TriggerElement } from "../ha-automation-trigger-row";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import type { SchemaUnion } from "../../../../../components/ha-form/types";

const DEFAULT_UPDATE_TYPES = ["added", "removed"];
const DEFAULT_NOTIFICATION_ID = "";

@customElement("ha-automation-trigger-persistent_notification")
export class HaPersistentNotificationTrigger
  extends LitElement
  implements TriggerElement
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public trigger!: PersistentNotificationTrigger;

  @property({ type: Boolean }) public disabled = false;

  private _schema = memoizeOne(
    (localize: LocalizeFunc) =>
      [
        {
          name: "notification_id",
          required: false,
          selector: { text: {} },
        },
        {
          name: "update_type",
          type: "multi_select",
          required: false,
          options: [
            [
              "added",
              localize(
                "ui.panel.config.automation.editor.triggers.type.persistent_notification.update_types.added"
              ),
            ],
            [
              "removed",
              localize(
                "ui.panel.config.automation.editor.triggers.type.persistent_notification.update_types.removed"
              ),
            ],
            [
              "current",
              localize(
                "ui.panel.config.automation.editor.triggers.type.persistent_notification.update_types.current"
              ),
            ],
            [
              "updated",
              localize(
                "ui.panel.config.automation.editor.triggers.type.persistent_notification.update_types.updated"
              ),
            ],
          ],
        },
      ] as const
  );

  public static get defaultConfig() {
    return {
      update_type: [...DEFAULT_UPDATE_TYPES],
      notification_id: DEFAULT_NOTIFICATION_ID,
    };
  }

  protected render() {
    const schema = this._schema(this.hass.localize);
    return html`
      <ha-form
        .schema=${schema}
        .data=${this.trigger}
        .hass=${this.hass}
        .disabled=${this.disabled}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const newTrigger = ev.detail.value;
    fireEvent(this, "value-changed", { value: newTrigger });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ): string =>
    this.hass.localize(
      `ui.panel.config.automation.editor.triggers.type.persistent_notification.${schema.name}`
    );

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
