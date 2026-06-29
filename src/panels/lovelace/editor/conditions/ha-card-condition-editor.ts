import "@home-assistant/webawesome/dist/components/divider/divider";
import { consume } from "@lit/context";
import {
  mdiContentCopy,
  mdiContentCut,
  mdiContentDuplicate,
  mdiDelete,
  mdiDotsVertical,
  mdiFlask,
  mdiPlaylistEdit,
} from "@mdi/js";
import deepClone from "deep-clone-simple";
import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  isLogicalCondition,
  isServerCondition,
} from "../../../../common/condition/translate";
import type { ConditionEvaluation } from "../../../../common/controllers/condition-evaluator-controller";
import { ConditionEvaluatorController } from "../../../../common/controllers/condition-evaluator-controller";
import { storage } from "../../../../common/decorators/storage";
import { dynamicElement } from "../../../../common/dom/dynamic-element-directive";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import { handleStructError } from "../../../../common/structs/handle-errors";
import "../../../../components/automation/ha-automation-row-event-chip";
import "../../../../components/automation/ha-automation-row-live-test";
import type { LiveTestState } from "../../../../components/automation/ha-automation-row-live-test";
import "../../../../components/ha-alert";
import "../../../../components/ha-card";
import "../../../../components/ha-dropdown";
import type { HaDropdownSelectEvent } from "../../../../components/ha-dropdown";
import "../../../../components/ha-dropdown-item";
import "../../../../components/ha-expansion-panel";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-tooltip";
import "../../../../components/ha-yaml-editor";
import "../../../config/automation/condition/ha-automation-condition-editor";
import "../../../config/automation/condition/types/ha-automation-condition-device";
import "../../../config/automation/condition/types/ha-automation-condition-sun";
import "../../../config/automation/condition/types/ha-automation-condition-template";
import "../../../config/automation/condition/types/ha-automation-condition-zone";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { ICON_CONDITION } from "../../common/icon-condition";
import type {
  AndCondition,
  Condition,
  ConditionContext,
  LegacyCondition,
  NotCondition,
  OrCondition,
  VisibilityCondition,
} from "../../common/validate-condition";
import {
  addEntityToCondition,
  validateConditionalConfig,
} from "../../common/validate-condition";
import type { ConditionsEntityContext } from "./context";
import { conditionsEntityContext } from "./context";
import type { LovelaceConditionEditorConstructor } from "./types";

const NO_ENTITY_CONDITIONS = ["state", "numeric_state"];

const CONTAINER_CONDITIONS = ["and", "or", "not"];

const isNoEntityCondition = (condition: string, noEntity: boolean): boolean =>
  NO_ENTITY_CONDITIONS.includes(condition) && noEntity;

export const getConditionClassName = (condition: string, noEntity: boolean) => {
  if (isNoEntityCondition(condition, noEntity)) {
    return `ha-card-condition-${condition}-no_entity`;
  }
  return `ha-card-condition-${condition}`;
};

const containsNoEntityCondition = (
  condition: Condition,
  noEntity: boolean
): boolean =>
  noEntity &&
  CONTAINER_CONDITIONS.includes(condition.condition) &&
  (condition as OrCondition | AndCondition | NotCondition).conditions?.some(
    (c) =>
      NO_ENTITY_CONDITIONS.includes(c.condition) ||
      containsNoEntityCondition(c, noEntity)
  ) === true;

// A purely client-side tree (no server-class leaf anywhere) can be validated
// up front; `validateConditionalConfig` only understands the lovelace client
// types, so it must not be applied to trees containing server-class conditions.
const isPureClientCondition = (condition: VisibilityCondition): boolean =>
  isLogicalCondition(condition)
    ? (condition.conditions ?? []).every(isPureClientCondition)
    : !isServerCondition(condition);

// Server-class condition types with no lovelace editor; edited via the
// automation condition editors (which already speak core format).
export const SERVER_EDITOR_CONDITIONS = ["template", "sun", "zone", "device"];

export const isServerEditorCondition = (condition: string): boolean =>
  SERVER_EDITOR_CONDITIONS.includes(condition);

@customElement("ha-card-condition-editor")
export class HaCardConditionEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) condition!: Condition | LegacyCondition;

  @state()
  @consume({ context: conditionsEntityContext, subscribe: true })
  private _entityContext?: ConditionsEntityContext;

  private get _noEntity(): boolean {
    return this._entityContext?.mode === "filter";
  }

  @storage({
    key: "dashboardConditionClipboard",
    state: false,
    subscribe: false,
    storage: "sessionStorage",
  })
  protected _clipboard?: Condition | LegacyCondition;

  @state() public _yamlMode = false;

  @state() public _uiAvailable = false;

  @state() public _uiWarnings: string[] = [];

  @state() _condition?: Condition;

  @state() private _testingResult?: boolean;

  @state() private _liveTestResult: {
    state: LiveTestState;
    message?: string;
  } = { state: "unknown" };

  // Live-test indicator, driven by the same server-backed evaluator the
  // dashboard uses at runtime: client leaves locally, server-class subtrees via
  // `subscribe_condition`, combined with three-valued logic.
  private _conditionEvaluator = new ConditionEvaluatorController(this, {
    // Debounce so editing (e.g. typing a template) doesn't churn subscriptions.
    resubscribeDelay: 500,
    onResult: (result, error) => this._setLiveTestResult(result, error),
  });

  // Cache of the folded observation (and its client-validity) keyed by the
  // source condition + entity context, so the evaluator's reference-based
  // signature memo keeps hitting on hass-only ticks instead of rebuilding the
  // array — mirrors ConditionalListenerMixin.
  private __observedSource?: Condition | LegacyCondition;

  private __observedEntityId?: string;

  private __observed?: VisibilityCondition[];

  private __clientInvalid = false;

  private get _editor() {
    if (!this._condition) return undefined;
    return customElements.get(
      getConditionClassName(this._condition.condition, this._noEntity)
    ) as LovelaceConditionEditorConstructor | undefined;
  }

  private get _isServerEditorCondition(): boolean {
    return (
      !!this._condition && isServerEditorCondition(this._condition.condition)
    );
  }

  // No-entity (filter-mode) conditions have no entity to evaluate against, so
  // the live-test indicator is suppressed for those.
  private _hideLiveTest(condition: Condition): boolean {
    return (
      isNoEntityCondition(condition.condition, this._noEntity) ||
      containsNoEntityCondition(condition, this._noEntity)
    );
  }

  public expand() {
    this.updateComplete.then(() => {
      this.shadowRoot!.querySelector("ha-expansion-panel")!.expanded = true;
    });
  }

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has("condition")) {
      this._condition = {
        condition: "state",
        ...this.condition,
      };
      if (this._isServerEditorCondition) {
        // Rendered by the embedded automation condition editor, which provides
        // its own UI for these core-format types.
        this._uiAvailable = true;
        this._uiWarnings = [];
      } else {
        const validator = this._editor?.validateUIConfig;
        if (validator) {
          try {
            validator(this._condition, this.hass);
            this._uiAvailable = true;
            this._uiWarnings = [];
          } catch (err) {
            this._uiWarnings = handleStructError(
              this.hass,
              err as Error
            ).warnings;
            this._uiAvailable = false;
          }
        } else {
          this._uiAvailable = false;
          this._uiWarnings = [];
        }
      }

      if (!this._uiAvailable && !this._yamlMode) {
        this._yamlMode = true;
      }
    }

    if (changedProperties.has("condition") || changedProperties.has("hass")) {
      this._updateLiveTest();
    }
  }

  protected updated(changedProperties: PropertyValues<this>): void {
    if ((changedProperties as Map<string, unknown>).has("_entityContext")) {
      this._updateLiveTest();
    }
  }

  private _liveTestContext(): ConditionContext {
    return this._entityContext?.mode === "current"
      ? { entity_id: this._entityContext.entityId }
      : {};
  }

  // Feed the condition (with the card's entity folded in when in "current"
  // mode) to the evaluator, which subscribes server subtrees and evaluates
  // client leaves locally. `onResult` maps its verdict to the indicator.
  private _updateLiveTest() {
    if (
      !this.condition ||
      !this._condition ||
      this._hideLiveTest(this._condition)
    ) {
      this._conditionEvaluator.observe(undefined, this.hass);
      this._setLiveTestResult("unknown");
      return;
    }

    const entityId = this._liveTestContext().entity_id;
    // Rebuild the folded observation + client-validity only when the source
    // condition or entity context changes, so a fresh array isn't fed to the
    // evaluator on every hass tick (which would defeat its signature memo).
    if (
      this.condition !== this.__observedSource ||
      entityId !== this.__observedEntityId
    ) {
      this.__observedSource = this.condition;
      this.__observedEntityId = entityId;
      this.__clientInvalid =
        isPureClientCondition(this.condition as VisibilityCondition) &&
        !validateConditionalConfig([this.condition]);
      const observed = entityId
        ? addEntityToCondition(this.condition as Condition, entityId)
        : this.condition;
      this.__observed = [observed] as VisibilityCondition[];
    }

    // The server-backed path only reports errors for server-class subtrees, so
    // surface a malformed client-only config as `invalid` here.
    if (this.__clientInvalid) {
      this._conditionEvaluator.observe(undefined, this.hass);
      this._liveTestResult = {
        state: "invalid",
        message: this.hass.localize(
          "ui.panel.lovelace.editor.condition-editor.live_test_state.invalid"
        ),
      };
      return;
    }

    this._conditionEvaluator.observe(this.__observed, this.hass, () =>
      this._liveTestContext()
    );
  }

  private _setLiveTestResult(result: ConditionEvaluation, error?: string) {
    if (error) {
      // Surface the raw server error as the tooltip detail (the localized
      // `invalid` label remains the indicator's aria-label) — matches how the
      // automation condition editor reports validation/test errors.
      this._liveTestResult = { state: "invalid", message: error };
      return;
    }
    const liveState: LiveTestState =
      result === "visible" ? "pass" : result === "hidden" ? "fail" : "unknown";
    this._liveTestResult = {
      state: liveState,
      message: this.hass.localize(
        `ui.panel.lovelace.editor.condition-editor.live_test_state.${liveState}`
      ),
    };
  }

  protected render() {
    const condition = this._condition;

    if (!condition) return nothing;

    const hideLiveTest = this._hideLiveTest(condition);

    return html`
      <div class="container">
        <ha-expansion-panel left-chevron>
          <div
            id="condition-icon"
            class="icon-badge-wrapper"
            slot="leading-icon"
          >
            <ha-svg-icon
              .path=${ICON_CONDITION[condition.condition]}
            ></ha-svg-icon>
            ${
              hideLiveTest
                ? nothing
                : html`<ha-automation-row-live-test
                    .state=${this._liveTestResult.state}
                    .label=${this.hass.localize(
                      `ui.panel.lovelace.editor.condition-editor.live_test_state.${this._liveTestResult.state}`
                    )}
                  ></ha-automation-row-live-test>`
            }
          </div>
          ${
            !hideLiveTest && this._liveTestResult.message
              ? html`<ha-tooltip for="condition-icon" slot="leading-icon"
                  >${this._liveTestResult.message}</ha-tooltip
                >`
              : nothing
          }
          <h3 slot="header">
            ${
              this.hass.localize(
                `ui.panel.lovelace.editor.condition-editor.condition.${condition.condition}.label`
              ) || condition.condition
            }
          </h3>
          <ha-automation-row-event-chip
            .show=${this._testingResult !== undefined}
            .variant=${this._testingResult ? "success" : "warning"}
            slot="event"
            class="event-chip"
            aria-live="polite"
          >
            ${
              this._testingResult
                ? this.hass.localize(
                    "ui.panel.lovelace.editor.condition-editor.testing_pass"
                  )
                : this.hass.localize(
                    "ui.panel.lovelace.editor.condition-editor.testing_error"
                  )
            }
          </ha-automation-row-event-chip>
          <ha-dropdown
            slot="icons"
            @wa-select=${this._handleAction}
            @click=${stopPropagation}
            placement="bottom-end"
          >
            <ha-icon-button
              slot="trigger"
              .label=${this.hass.localize("ui.common.menu")}
              .path=${mdiDotsVertical}
            >
            </ha-icon-button>

            ${hideLiveTest
              ? nothing
              : html`<ha-dropdown-item value="test">
                  ${this.hass.localize(
                    "ui.panel.lovelace.editor.condition-editor.test"
                  )}
                  <ha-svg-icon slot="icon" .path=${mdiFlask}></ha-svg-icon>
                </ha-dropdown-item>`}

            <ha-dropdown-item value="duplicate">
              ${this.hass.localize(
                "ui.panel.lovelace.editor.edit_card.duplicate"
              )}
              <ha-svg-icon
                slot="icon"
                .path=${mdiContentDuplicate}
              ></ha-svg-icon>
            </ha-dropdown-item>

            <ha-dropdown-item value="copy">
              ${this.hass.localize("ui.panel.lovelace.editor.edit_card.copy")}
              <ha-svg-icon slot="icon" .path=${mdiContentCopy}></ha-svg-icon>
            </ha-dropdown-item>

            <ha-dropdown-item value="cut">
              ${this.hass.localize("ui.panel.lovelace.editor.edit_card.cut")}
              <ha-svg-icon slot="icon" .path=${mdiContentCut}></ha-svg-icon>
            </ha-dropdown-item>

            <ha-dropdown-item
              value="toggle_yaml"
              .disabled=${!this._uiAvailable}
            >
              ${this.hass.localize(
                `ui.panel.lovelace.editor.edit_view.edit_${!this._yamlMode ? "yaml" : "ui"}`
              )}
              <ha-svg-icon slot="icon" .path=${mdiPlaylistEdit}></ha-svg-icon>
            </ha-dropdown-item>

            <wa-divider></wa-divider>

            <ha-dropdown-item variant="danger" value="delete">
              ${this.hass!.localize("ui.common.delete")}
              <ha-svg-icon slot="icon" .path=${mdiDelete}></ha-svg-icon>
            </ha-dropdown-item>
          </ha-dropdown>
          ${
            !this._uiAvailable
              ? html`
                  <ha-alert
                    alert-type="warning"
                    .title=${this.hass.localize(
                      "ui.errors.config.editor_not_supported"
                    )}
                  >
                    ${
                      this._uiWarnings!.length > 0 &&
                      this._uiWarnings![0] !== undefined
                        ? html`
                            <ul>
                              ${this._uiWarnings!.map(
                                (warning) => html`<li>${warning}</li>`
                              )}
                            </ul>
                          `
                        : nothing
                    }
                    ${this.hass.localize(
                      "ui.errors.config.edit_in_yaml_supported"
                    )}
                  </ha-alert>
                `
              : nothing
          }
          <div class="content">
            ${
              this._yamlMode
                ? html`
                    <ha-yaml-editor
                      .defaultValue=${this.condition}
                      @value-changed=${this._onYamlChange}
                    ></ha-yaml-editor>
                  `
                : this._isServerEditorCondition
                ? html`
                    <ha-automation-condition-editor
                      .hass=${this.hass}
                      .condition=${condition}
                      .uiSupported=${true}
                    ></ha-automation-condition-editor>
                  `
                : html`
                    ${dynamicElement(
                      getConditionClassName(
                        condition.condition,
                        this._noEntity
                      ),
                      {
                        hass: this.hass,
                        condition: condition,
                      }
                    )}
                  `}
            }
          </div>
        </ha-expansion-panel>
      </div>
    `;
  }

  private _handleAction(ev: HaDropdownSelectEvent) {
    const action = ev.detail.item.value;

    if (action === undefined) {
      return;
    }

    switch (action) {
      case "test":
        this._testCondition();
        return;
      case "duplicate":
        this._duplicateCondition();
        return;
      case "copy":
        this._copyCondition();
        return;
      case "cut":
        this._cutCondition();
        return;
      case "toggle_yaml":
        this._yamlMode = !this._yamlMode;
        return;
      case "delete":
        this._delete();
    }
  }

  private _timeout?: number;

  private _testCondition() {
    if (this._timeout) {
      window.clearTimeout(this._timeout);
      this._timeout = undefined;
    }
    // Surface the evaluator's current live verdict as a transient chip. A
    // not-yet-reported (unknown) server result shows no chip rather than
    // asserting a false failure.
    const result = this._conditionEvaluator.result;
    if (result === "unknown") {
      this._testingResult = undefined;
      return;
    }
    this._testingResult = result === "visible";

    this._timeout = window.setTimeout(() => {
      this._testingResult = undefined;
    }, 2500);
  }

  private _duplicateCondition() {
    fireEvent(this, "duplicate-condition", {
      value: deepClone(this.condition),
    });
  }

  private _copyCondition() {
    this._clipboard = deepClone(this.condition);
  }

  private _cutCondition() {
    this._copyCondition();
    this._delete();
  }

  private _delete = () => {
    fireEvent(this, "value-changed", { value: null });
  };

  private _onYamlChange(ev: CustomEvent) {
    ev.stopPropagation();
    if (!ev.detail.isValid) {
      return;
    }
    // @ts-ignore
    fireEvent(this, "value-changed", { value: ev.detail.value });
  }

  static styles = [
    haStyle,
    css`
      ha-dropdown {
        --mdc-theme-text-primary-on-background: var(--primary-text-color);
      }
      ha-expansion-panel {
        --expansion-panel-summary-padding: 0 0 0 8px;
        --expansion-panel-content-padding: 0;
      }
      .icon-badge-wrapper {
        display: inline-flex;
        position: relative;
        color: var(--secondary-text-color);
        opacity: 0.9;
      }
      h3 {
        margin: 0;
        font-size: inherit;
        font-weight: inherit;
      }
      .content {
        padding: 12px;
      }
      .disabled {
        opacity: 0.5;
        pointer-events: none;
      }
      .event-chip {
        position: absolute;
        inset-inline-end: 40px;
      }
      .container {
        position: relative;
        border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg));
        border: 1px solid var(--divider-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-card-condition-editor": HaCardConditionEditor;
  }

  interface HASSDomEvents {
    "duplicate-condition": { value: Condition | LegacyCondition };
  }
}
