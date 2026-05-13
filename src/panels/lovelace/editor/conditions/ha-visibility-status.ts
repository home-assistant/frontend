import { consume } from "@lit/context";
import { mdiAlertCircle, mdiEye, mdiEyeOff } from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ConditionListenersController } from "../../../../common/controllers/condition-listeners-controller";
import "../../../../components/ha-svg-icon";
import { HaRowItem } from "../../../../components/item/ha-row-item";
import type { HomeAssistant } from "../../../../types";
import type {
  Condition,
  LegacyCondition,
} from "../../common/validate-condition";
import {
  checkConditionsMet,
  validateConditionalConfig,
} from "../../common/validate-condition";
import type { ConditionsEntityContext } from "./context";
import { conditionsEntityContext } from "./context";

type VisibilityState = "visible" | "hidden" | "invalid";

const STATE_ICONS: Record<VisibilityState, string> = {
  visible: mdiEye,
  hidden: mdiEyeOff,
  invalid: mdiAlertCircle,
};

/**
 * @element ha-visibility-status
 * @extends {HaRowItem}
 *
 * @summary
 * Row-style banner that surfaces the live visibility result for a set of
 * lovelace conditions. Replaces the static explanation alert at the top of
 * card / section / badge / conditional-card visibility editors.
 *
 * @attr {"visible"|"hidden"|"invalid"} state - Computed visibility state (reflected for styling).
 */
@customElement("ha-visibility-status")
export class HaVisibilityStatus extends HaRowItem {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public conditions: (Condition | LegacyCondition)[] = [];

  @state()
  @consume({ context: conditionsEntityContext, subscribe: true })
  private _entityContext?: ConditionsEntityContext;

  @property({ reflect: true })
  public state: VisibilityState = "visible";

  private _listeners = new ConditionListenersController(this);

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);
    if (changedProperties.has("conditions") || changedProperties.has("hass")) {
      this._listeners.setup(
        (this.conditions ?? []) as Condition[],
        this.hass,
        () => this._evaluate()
      );
    }
    if (
      changedProperties.has("hass") ||
      changedProperties.has("conditions") ||
      (changedProperties as Map<string, unknown>).has("_entityContext")
    ) {
      this._evaluate();
    }
  }

  protected override _renderInner(): TemplateResult {
    return html`
      <div part="start" class="start">
        <ha-svg-icon .path=${STATE_ICONS[this.state]}></ha-svg-icon>
      </div>
      <div part="content" class="content">
        <div part="headline" class="headline">
          ${this.hass?.localize(
            `ui.panel.lovelace.editor.condition-editor.visibility_status.${this.state}.headline`
          )}
        </div>
        <div part="supporting-text" class="supporting">
          ${this.hass?.localize(
            `ui.panel.lovelace.editor.condition-editor.visibility_status.${this.state}.supporting`
          )}
        </div>
      </div>
    `;
  }

  private _evaluate() {
    const conditions = this.conditions ?? [];
    let newState: VisibilityState;
    if (conditions.length === 0) {
      newState = "visible";
    } else if (!validateConditionalConfig(conditions)) {
      newState = "invalid";
    } else {
      const context =
        this._entityContext?.mode === "current"
          ? { entity_id: this._entityContext.entityId }
          : {};
      newState = checkConditionsMet(conditions, this.hass, context)
        ? "visible"
        : "hidden";
    }
    if (newState === this.state) {
      return;
    }

    this.state = newState;
  }

  static styles: CSSResultGroup = [
    HaRowItem.styles,
    css`
      :host {
        display: block;
        border-radius: var(--ha-border-radius-xl);
        transition: background-color var(--ha-animation-duration-normal)
          ease-in-out;
      }
      .base {
        padding: var(--ha-space-4);
      }
      :host([state="visible"]) {
        background-color: var(--ha-color-fill-success-quiet-resting);
        --visibility-status-color: var(--ha-color-on-success-normal);
      }
      :host([state="hidden"]) {
        background-color: var(--ha-color-fill-warning-quiet-resting);
        --visibility-status-color: var(--ha-color-on-warning-normal);
      }
      :host([state="invalid"]) {
        background-color: var(--ha-color-fill-danger-quiet-resting);
        --visibility-status-color: var(--ha-color-on-danger-normal);
      }
      .start {
        align-self: start;
      }
      .start ha-svg-icon {
        color: var(--visibility-status-color);
        --mdc-icon-size: 24px;
      }
      .headline {
        font-weight: var(--ha-font-weight-medium);
        white-space: normal;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-visibility-status": HaVisibilityStatus;
  }
}
