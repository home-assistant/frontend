import { consume } from "@lit/context";
import { mdiAlertCircle, mdiEye, mdiEyeOff } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ConditionListenersController } from "../../../../common/controllers/condition-listeners-controller";
import "../../../../components/ha-alert";
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
 *
 * @summary
 * Alert banner that surfaces the live visibility result for a set of
 * lovelace conditions.
 *
 * @attr {"visible"|"hidden"|"invalid"} state - Computed visibility state
 */
@customElement("ha-visibility-status")
export class HaVisibilityStatus extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public conditions: (Condition | LegacyCondition)[] = [];

  @state()
  @consume({ context: conditionsEntityContext, subscribe: true })
  private _entityContext?: ConditionsEntityContext;

  @property()
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

  public render() {
    return html`
      <ha-alert
        .alertType=${this.state === "visible"
          ? "success"
          : this.state === "hidden"
            ? "warning"
            : "error"}
      >
        <ha-svg-icon slot="icon" .path=${STATE_ICONS[this.state]}></ha-svg-icon>
        <div class="headline">
          ${this.hass?.localize(
            `ui.panel.lovelace.editor.condition-editor.visibility_status.${this.state}.headline`
          )}
        </div>
        <div class="supporting">
          ${this.hass?.localize(
            `ui.panel.lovelace.editor.condition-editor.visibility_status.${this.state}.supporting${(this.conditions?.length ?? 0) === 0 ? "_empty" : ""}`
          )}
        </div>
      </ha-alert>
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
      ha-alert {
        display: block;
        --mdc-icon-size: 24px;
      }
      .headline {
        font-weight: var(--ha-font-weight-medium);
        margin-bottom: var(--ha-space-1);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-visibility-status": HaVisibilityStatus;
  }
}
