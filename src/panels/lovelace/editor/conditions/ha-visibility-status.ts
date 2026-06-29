import { consume } from "@lit/context";
import { mdiAlertCircle, mdiEye, mdiEyeOff, mdiHelpCircle } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isPureClientCondition } from "../../../../common/condition/translate";
import type { ConditionEvaluation } from "../../../../common/controllers/condition-evaluator-controller";
import { ConditionEvaluatorController } from "../../../../common/controllers/condition-evaluator-controller";
import "../../../../components/ha-alert";
import "../../../../components/ha-svg-icon";
import { HaRowItem } from "../../../../components/item/ha-row-item";
import type { HomeAssistant } from "../../../../types";
import type {
  Condition,
  ConditionContext,
  VisibilityCondition,
} from "../../common/validate-condition";
import {
  addEntityToCondition,
  validateConditionalConfig,
} from "../../common/validate-condition";
import type { ConditionsEntityContext } from "./context";
import { conditionsEntityContext } from "./context";

type VisibilityState = "visible" | "hidden" | "unknown" | "invalid";

const STATE_ICONS: Record<VisibilityState, string> = {
  visible: mdiEye,
  hidden: mdiEyeOff,
  unknown: mdiHelpCircle,
  invalid: mdiAlertCircle,
};

/**
 * @element ha-visibility-status
 *
 * @summary
 * Alert banner that surfaces the live visibility result for a set of
 * lovelace conditions.
 *
 * @attr {"visible"|"hidden"|"unknown"|"invalid"} state - Computed visibility state
 */
@customElement("ha-visibility-status")
export class HaVisibilityStatus extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public conditions: VisibilityCondition[] = [];

  @state()
  @consume({ context: conditionsEntityContext, subscribe: true })
  private _entityContext?: ConditionsEntityContext;

  @property()
  public state: VisibilityState = "visible";

  // Evaluate the whole set through the same server-backed controller the
  // dashboard uses at runtime, so server-class conditions report a real
  // verdict instead of being flagged as an invalid configuration.
  private _conditionEvaluator = new ConditionEvaluatorController(this, {
    resubscribeDelay: 500,
    onResult: (result, error) => this._applyResult(result, error),
  });

  // Cache the folded observation + client-validity keyed by (conditions ref,
  // entity id) so the controller's signature memo keeps hitting on hass-only
  // ticks. `_override` pins the state for the empty / client-invalid branches
  // that bypass the controller.
  private __observedSource?: VisibilityCondition[];

  private __observedEntityId?: string;

  private __observed?: VisibilityCondition[];

  private __clientInvalid = false;

  private _override?: VisibilityState;

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);
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
        .alertType=${
          this.state === "visible"
            ? "success"
            : this.state === "hidden"
              ? "warning"
              : this.state === "unknown"
                ? "info"
                : "error"
        }
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

  private _context(): ConditionContext {
    return this._entityContext?.mode === "current"
      ? { entity_id: this._entityContext.entityId }
      : {};
  }

  private _evaluate() {
    const conditions = this.conditions ?? [];

    if (conditions.length === 0) {
      this._override = "visible";
      this._conditionEvaluator.observe(undefined, this.hass);
      this.state = "visible";
      return;
    }

    const entityId =
      this._entityContext?.mode === "current"
        ? this._entityContext.entityId
        : undefined;

    // Rebuild the folded observation + client-validity only when the source
    // set or entity context changes, so a fresh array isn't fed to the
    // evaluator on every hass tick.
    if (
      conditions !== this.__observedSource ||
      entityId !== this.__observedEntityId
    ) {
      this.__observedSource = conditions;
      this.__observedEntityId = entityId;
      this.__clientInvalid =
        conditions.every((c) => isPureClientCondition(c)) &&
        !validateConditionalConfig(conditions as Condition[]);
      this.__observed = (
        entityId
          ? conditions.map((c) =>
              addEntityToCondition(c as Condition, entityId)
            )
          : conditions
      ) as VisibilityCondition[];
    }

    // `validateConditionalConfig` only understands client types; a malformed
    // server config surfaces through the controller's error instead.
    if (this.__clientInvalid) {
      this._override = "invalid";
      this._conditionEvaluator.observe(undefined, this.hass);
      this.state = "invalid";
      return;
    }

    this._override = undefined;
    this._conditionEvaluator.observe(this.__observed, this.hass, () =>
      this._context()
    );
  }

  private _applyResult(result: ConditionEvaluation, error?: string) {
    // The empty / client-invalid branches pin the state; ignore the
    // controller's (torn-down) result in those cases.
    if (this._override !== undefined) {
      return;
    }
    this.state = error
      ? "invalid"
      : result === "visible"
        ? "visible"
        : result === "hidden"
          ? "hidden"
          : "unknown";
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
