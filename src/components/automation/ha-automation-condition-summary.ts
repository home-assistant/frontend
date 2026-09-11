import { consume, type ContextType } from "@lit/context";
import { mdiCommentTextOutline } from "@mdi/js";
import type { HassServiceTarget } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { truncateWithEllipsis } from "../../common/string/truncate-with-ellipsis";
import type { Condition } from "../../data/automation";
import type { ConditionDescription } from "../../data/condition";
import { internationalizationContext } from "../../data/context";
import { getTargetEntityCount } from "../../data/target";
import "../../panels/config/automation/ha-automation-row-behavior";
import "../../panels/config/automation/ha-automation-row-options";
import "../../panels/config/automation/ha-automation-row-threshold";
import { getDeviceTarget } from "../../panels/config/automation/target/get_device_target";
import { getEntityTarget } from "../../panels/config/automation/target/get_entity_target";
import "../../panels/config/automation/target/ha-automation-row-targets";
import "../ha-svg-icon";
import "../ha-tooltip";

@customElement("ha-automation-condition-summary")
export class HaAutomationConditionSummary extends LitElement {
  @property() public label = "";

  @property({ attribute: false }) public condition?: Condition;

  @property({ attribute: false }) public description?: ConditionDescription;

  @property({ attribute: false }) public isNew = false;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  private _getEntityTarget = memoizeOne(getEntityTarget);

  private _getDeviceTarget = memoizeOne(getDeviceTarget);

  protected render() {
    const descriptionHasTarget = "target" in (this.description || {});
    const hasEntityTarget =
      this.condition?.condition === "state" ||
      this.condition?.condition === "numeric_state";
    const targetRequired =
      (descriptionHasTarget || hasEntityTarget) && !this.isNew;
    const note = this.condition?.note?.trim();

    let target: HassServiceTarget | undefined;
    if (this.condition) {
      if (descriptionHasTarget && "target" in this.condition) {
        target = this.condition.target;
      } else if (
        hasEntityTarget &&
        "entity_id" in this.condition &&
        this.condition.entity_id
      ) {
        target = this._getEntityTarget(this.condition.entity_id);
      } else if ("device_id" in this.condition && this.condition.device_id) {
        target = this._getDeviceTarget(this.condition.device_id);
      }
    }

    return html`
      <h3>
        ${this.label}
        ${
          targetRequired && this.condition && getTargetEntityCount(target) > 1
            ? html`<ha-automation-row-behavior
                mode="condition"
                .config=${this.condition}
              ></ha-automation-row-behavior>`
            : nothing
        }
        ${
          target !== undefined || targetRequired
            ? html`<ha-automation-row-targets
                .target=${target}
                .targetRequired=${targetRequired}
                .selector=${
                  this.description?.target
                    ? { target: this.description.target }
                    : undefined
                }
                .interactive=${this.condition?.condition !== "device"}
              ></ha-automation-row-targets>`
            : nothing
        }
        ${
          this.description && this.condition
            ? html`<ha-automation-row-threshold
                .config=${this.condition}
                .description=${this.description}
              ></ha-automation-row-threshold>`
            : nothing
        }
        ${
          this.description && this.condition
            ? html`<ha-automation-row-options
                .config=${this.condition}
              ></ha-automation-row-options>`
            : nothing
        }
        ${
          note
            ? html`
                <ha-svg-icon
                  id="note-icon"
                  tabindex="0"
                  role="img"
                  .path=${mdiCommentTextOutline}
                  aria-label=${this._i18n.localize(
                    "ui.panel.config.automation.editor.note.label"
                  )}
                  class="note-indicator"
                ></ha-svg-icon>
                <ha-tooltip for="note-icon"
                  ><p>${truncateWithEllipsis(note, 250)}</p></ha-tooltip
                >
              `
            : nothing
        }
      </h3>
    `;
  }

  static styles = css`
    :host {
      display: block;
      min-width: 0;
    }
    h3 {
      margin: 0;
      font-size: inherit;
      font-weight: inherit;
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--ha-space-2);
      padding: var(--ha-space-2) 0;
      min-height: 32px;
      max-width: 100%;
    }
    .note-indicator {
      color: var(--ha-color-on-neutral-normal);
    }
    ha-tooltip {
      cursor: default;
    }
    ha-tooltip::part(body) {
      cursor: default;
      max-width: 300px;
    }
    ha-tooltip p {
      white-space: pre-wrap;
      margin: 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-summary": HaAutomationConditionSummary;
  }
}
