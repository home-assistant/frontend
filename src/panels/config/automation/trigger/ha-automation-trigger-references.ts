import { consume } from "@lit/context";
import { mdiLinkVariantOff } from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ensureArray } from "../../../../common/array/ensure-array";
import { capitalizeFirstLetter } from "../../../../common/string/capitalize-first-letter";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-trigger-icon";
import type { TriggerCondition } from "../../../../data/automation";
import { describeTrigger } from "../../../../data/automation_i18n";
import type { HomeAssistant } from "../../../../types";
import type { EntityRegistryEntry } from "../../../../data/entity/entity_registry";
import {
  automationTriggerContext,
  type AutomationTriggerContext,
} from "./automation-trigger-id";

@customElement("ha-automation-trigger-references")
export class HaAutomationTriggerReferences extends LitElement {
  @property({ attribute: false }) public condition!: TriggerCondition;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entityRegistry: EntityRegistryEntry[] =
    [];

  @state()
  @consume({ context: automationTriggerContext, subscribe: true })
  private _triggers?: AutomationTriggerContext;

  protected render() {
    const options = this._triggers?.options ?? [];
    const selectedIds = ensureArray(this.condition.id).filter(Boolean);
    const selectedTriggers = options.filter((option) =>
      selectedIds.includes(option.id)
    );
    const missingIds = selectedIds.filter(
      (id) => !options.some((option) => option.id === id)
    );

    return [
      selectedTriggers.map(
        (option) => html`
          <span class="trigger-reference">
            <span class="trigger-index-badge">${option.index + 1}</span>
            <ha-trigger-icon
              .trigger=${"trigger" in option.trigger ? option.trigger.trigger : ""}
            ></ha-trigger-icon>
            <span class="trigger-reference-label">
              ${capitalizeFirstLetter(
                describeTrigger(option.trigger, this.hass, this.entityRegistry)
              )}
            </span>
          </span>
        `
      ),
      missingIds.map(
        () => html`
          <span class="trigger-reference missing">
            <ha-svg-icon .path=${mdiLinkVariantOff}></ha-svg-icon>
            <span>
              ${this.hass.localize(
                "ui.panel.config.automation.editor.conditions.type.trigger.missing_trigger"
              )}
            </span>
          </span>
        `
      ),
    ];
  }

  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--ha-space-2);
    }

    .trigger-reference {
      display: inline-flex;
      align-items: center;
      gap: var(--ha-space-2);
      min-width: 0;
      max-width: 100%;
      padding: var(--ha-space-1) var(--ha-space-2);
      border-radius: var(--ha-border-radius-md);
      background: var(--ha-color-fill-neutral-normal-resting);
      color: var(--ha-color-text-secondary);
    }

    .trigger-reference.missing {
      background: var(--ha-color-fill-warning-normal-resting);
      color: var(--ha-color-on-warning-normal);
    }

    ha-trigger-icon,
    ha-svg-icon {
      --mdc-icon-size: 20px;
      flex-shrink: 0;
    }

    .trigger-reference-label {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .trigger-index-badge {
      display: inline-flex;
      justify-content: center;
      align-items: center;
      width: 22px;
      height: 22px;
      border: 2px dotted var(--ha-color-border-neutral-normal);
      border-radius: var(--ha-border-radius-circle);
      box-sizing: border-box;
      color: var(--ha-color-text-secondary);
      font-size: var(--ha-font-size-xs);
      line-height: 1;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-references": HaAutomationTriggerReferences;
  }
}
