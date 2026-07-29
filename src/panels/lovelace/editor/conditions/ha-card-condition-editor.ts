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
import { ensureArray } from "../../../../common/array/ensure-array";
import {
  isLogicalCondition,
  logicalChildren,
} from "../../../../common/condition/translate";
import type { ConditionEvaluation } from "../../../../common/controllers/condition-evaluator-controller";
import { ConditionEvaluatorController } from "../../../../common/controllers/condition-evaluator-controller";
import { storage } from "../../../../common/decorators/storage";
import { dynamicElement } from "../../../../common/dom/dynamic-element-directive";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import { computeAttributeNameDisplay } from "../../../../common/entity/compute_attribute_display";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import { formatListWithOrs } from "../../../../common/string/format-list";
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
import "../../../config/automation/condition/types/ha-automation-condition-numeric_state";
import "../../../config/automation/condition/types/ha-automation-condition-state";
import "../../../config/automation/condition/types/ha-automation-condition-sun";
import "../../../config/automation/condition/types/ha-automation-condition-template";
import "../../../config/automation/condition/types/ha-automation-condition-zone";
import { showAlertDialog } from "../../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type {
  NumericStateCondition as CoreNumericStateCondition,
  StateCondition as CoreStateCondition,
} from "../../../../data/automation";
import {
  CONDITION_ROW_CONFIG_KEYS,
  pickRowConfig,
} from "../../../../data/automation";
import { ICON_CONDITION } from "../../common/icon-condition";
import type {
  AndCondition,
  Condition,
  ConditionContext,
  LegacyCondition,
  NotCondition,
  NumericStateCondition,
  OrCondition,
  StateCondition,
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
  (
    ensureArray(
      (condition as OrCondition | AndCondition | NotCondition).conditions
    ) ?? []
  ).some(
    (c) =>
      NO_ENTITY_CONDITIONS.includes(c.condition) ||
      containsNoEntityCondition(c, noEntity)
  );

export const SERVER_EDITOR_CONDITIONS = ["template", "sun", "zone", "device"];

export const isServerEditorCondition = (condition: string): boolean =>
  SERVER_EDITOR_CONDITIONS.includes(condition);

// Types entity filters can evaluate locally against each entity.
const FILTER_CONDITION_TYPES = new Set([
  "state",
  "numeric_state",
  "screen",
  "user",
  "view_columns",
  "location",
  "time",
]);

// Usable as an entity filter: local types only, no pinned entity, list-shaped `and`/`or`/`not`.
export const isFilterCompatibleCondition = (
  condition: VisibilityCondition
): boolean => {
  if (isLogicalCondition(condition)) {
    return (
      (condition.conditions === undefined ||
        Array.isArray(condition.conditions)) &&
      logicalChildren(condition).every(isFilterCompatibleCondition)
    );
  }
  if ("entity_id" in condition || !!(condition as { entity?: string }).entity) {
    return false;
  }
  // `{ entity, state }` is a lovelace state condition.
  if (!("condition" in condition)) {
    return true;
  }
  return FILTER_CONDITION_TYPES.has(condition.condition);
};

// Uses the automation editor. Entity-filter state/numeric_state keep the lovelace editor.
export const usesAutomationConditionEditor = (
  conditionType: string,
  noEntity: boolean
): boolean =>
  isServerEditorCondition(conditionType) ||
  (!noEntity &&
    (conditionType === "state" || conditionType === "numeric_state"));

// Show lovelace state/numeric_state in core form for the automation editor.
// Unlike `translateToCoreCondition`, incomplete configs stay editable.
// Entity-less conditions get `contextEntityId` so the field isn't empty.
const toCoreEditorCondition = (
  condition: VisibilityCondition,
  contextEntityId?: string
): VisibilityCondition => {
  if ("entity_id" in condition) {
    return condition;
  }
  // Keep `enabled` / `alias` / `note` so editing a disabled condition doesn't re-enable it.
  const rowConfig = pickRowConfig(condition, CONDITION_ROW_CONFIG_KEYS);
  // `{ entity, state }` has no `condition` key.
  if (!("condition" in condition) || condition.condition === "state") {
    const lovelace = condition as StateCondition | LegacyCondition;
    const attribute = "attribute" in lovelace ? lovelace.attribute : undefined;
    const entity_id = lovelace.entity || contextEntityId || "";
    // Core has no `state_not`; show `not` wrapping a state condition.
    if (lovelace.state === undefined && lovelace.state_not !== undefined) {
      const inner: CoreStateCondition = {
        condition: "state",
        entity_id,
        state: lovelace.state_not,
      };
      if (attribute !== undefined) {
        inner.attribute = attribute;
      }
      return { ...rowConfig, condition: "not", conditions: [inner] };
    }
    // Keep an empty `state` so incomplete configs stay editable.
    const core: CoreStateCondition = {
      ...rowConfig,
      condition: "state",
      entity_id,
      state: lovelace.state ?? [],
    };
    if (attribute !== undefined) {
      core.attribute = attribute;
    }
    return core;
  }
  if (condition.condition === "numeric_state") {
    const lovelace = condition as NumericStateCondition;
    const core: CoreNumericStateCondition = {
      ...rowConfig,
      condition: "numeric_state",
      entity_id: lovelace.entity || contextEntityId || "",
    };
    if (lovelace.attribute !== undefined) {
      core.attribute = lovelace.attribute;
    }
    if (lovelace.above != null) {
      core.above = lovelace.above;
    }
    if (lovelace.below != null) {
      core.below = lovelace.below;
    }
    return core;
  }
  return condition;
};

@customElement("ha-card-condition-editor")
export class HaCardConditionEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) condition!: VisibilityCondition;

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
  protected _clipboard?: VisibilityCondition;

  @state() public _yamlMode = false;

  @state() public _uiAvailable = false;

  @state() public _uiWarnings: string[] = [];

  @state() _condition?: Condition;

  @state() private _testingResult?: boolean;

  @state() private _liveTestResult: {
    state: LiveTestState;
    message?: string;
  } = { state: "unknown" };

  private _conditionEvaluator = new ConditionEvaluatorController(this, {
    // Debounce while typing (templates).
    resubscribeDelay: 500,
    onResult: (result, error) => this._setLiveTestResult(result, error),
  });

  // Folded observation, rebuilt only when the source or entity id changes.
  private __observedSource?: VisibilityCondition;

  private __observedEntityId?: string;

  private __observed?: VisibilityCondition[];

  private __clientInvalid = false;

  // Pins the indicator when we skip the evaluator (hidden / invalid).
  private _override?: LiveTestState;

  private get _editor() {
    if (!this._condition) return undefined;
    return customElements.get(
      getConditionClassName(this._condition.condition, this._noEntity)
    ) as LovelaceConditionEditorConstructor | undefined;
  }

  private get _usesAutomationEditor(): boolean {
    return (
      !!this._condition &&
      usesAutomationConditionEditor(this._condition.condition, this._noEntity)
    );
  }

  // Filter-mode conditions have no entity to test against.
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
    // Entity-less conditions pick up the card entity from context.
    if (
      changedProperties.has("condition") ||
      (changedProperties as Map<string, unknown>).has("_entityContext")
    ) {
      const normalized = {
        condition: "state",
        ...this.condition,
      } as Condition;
      const contextEntityId =
        this._entityContext?.mode === "current"
          ? this._entityContext.entityId
          : undefined;
      this._condition = (
        usesAutomationConditionEditor(normalized.condition, this._noEntity)
          ? toCoreEditorCondition(normalized, contextEntityId)
          : normalized
      ) as Condition;
      if (this._usesAutomationEditor) {
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

  private _updateLiveTest() {
    if (
      !this.condition ||
      !this._condition ||
      this._hideLiveTest(this._condition)
    ) {
      this._override = "unknown";
      this._conditionEvaluator.observe(undefined, this.hass);
      this._liveTestResult = { state: "unknown" };
      return;
    }

    const entityId = this._liveTestContext().entity_id;
    if (
      this.condition !== this.__observedSource ||
      entityId !== this.__observedEntityId
    ) {
      this.__observedSource = this.condition;
      this.__observedEntityId = entityId;
      this.__clientInvalid = !validateConditionalConfig([this.condition]);
      const observed = entityId
        ? addEntityToCondition(this.condition, entityId)
        : this.condition;
      this.__observed = [observed];
    }

    if (this.__clientInvalid) {
      this._override = "invalid";
      this._conditionEvaluator.observe(undefined, this.hass);
      this._liveTestResult = {
        state: "invalid",
        message: this.hass.localize(
          "ui.panel.lovelace.editor.condition-editor.live_test_state.invalid"
        ),
      };
      return;
    }

    if (this._override !== undefined) {
      // Leaving a pinned branch; evaluator won't notify until a new result.
      this._override = undefined;
      this._liveTestResult = { state: "unknown" };
    }
    this._conditionEvaluator.observe(this.__observed, this.hass, () =>
      this._liveTestContext()
    );
  }

  private _setLiveTestResult(result: ConditionEvaluation, error?: string) {
    if (this._override !== undefined) {
      return;
    }
    if (error) {
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

  private _describeCondition(
    condition: Condition,
    entityId?: string
  ): string | undefined {
    const stateObj = entityId ? this.hass.states[entityId] : undefined;
    const entity = stateObj ? computeStateName(stateObj) : entityId;
    if (!entity) {
      return undefined;
    }

    if (condition.condition === "state") {
      const value = condition.state ?? condition.state_not;
      const values = ensureArray(value ?? []).filter((v) => v !== "");
      if (!values.length) {
        return undefined;
      }
      const attribute =
        condition.attribute && stateObj
          ? computeAttributeNameDisplay(
              this.hass.localize,
              stateObj,
              this.hass.entities,
              condition.attribute
            )
          : condition.attribute;
      const states = formatListWithOrs(
        this.hass.locale,
        values.map((v) =>
          stateObj
            ? condition.attribute
              ? this.hass
                  .formatEntityAttributeValue(stateObj, condition.attribute, v)
                  .toString()
              : this.hass.formatEntityState(stateObj, v)
            : v
        )
      );
      const invert = condition.state_not !== undefined;
      const variant = invert ? "is_not" : "is";
      return this.hass.localize(
        `ui.panel.lovelace.editor.condition-editor.condition.state.description.${
          attribute ? `${variant}_attribute` : variant
        }`,
        { entity, state: states, attribute }
      );
    }

    if (condition.condition === "numeric_state") {
      const { above, below } = condition;
      if (above === undefined && below === undefined) {
        return undefined;
      }
      const attribute =
        condition.attribute && stateObj
          ? computeAttributeNameDisplay(
              this.hass.localize,
              stateObj,
              this.hass.entities,
              condition.attribute
            )
          : condition.attribute;
      const variant =
        above !== undefined && below !== undefined
          ? "above_below"
          : above !== undefined
            ? "above"
            : "below";
      return this.hass.localize(
        `ui.panel.lovelace.editor.condition-editor.condition.numeric_state.description.${
          attribute ? `${variant}_attribute` : variant
        }`,
        { entity, above, below, attribute }
      );
    }

    return undefined;
  }

  protected render() {
    const condition = this._condition;

    if (!condition) return nothing;

    const hideLiveTest = this._hideLiveTest(condition);

    const contextEntityId =
      condition.condition === "state" || condition.condition === "numeric_state"
        ? ("entity_id" in condition
            ? (condition as { entity_id?: string }).entity_id
            : (condition as StateCondition | NumericStateCondition).entity) ||
          (this._entityContext?.mode === "current"
            ? this._entityContext.entityId
            : undefined)
        : undefined;

    const description = this._describeCondition(condition, contextEntityId);

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
            ${description ||
            this.hass.localize(
              `ui.panel.lovelace.editor.condition-editor.condition.${condition.condition}.label`
            ) ||
            condition.condition}
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

            ${
              hideLiveTest
                ? nothing
                : html`<ha-dropdown-item value="test">
                    ${this.hass.localize(
                      "ui.panel.lovelace.editor.condition-editor.test"
                    )}
                    <ha-svg-icon slot="icon" .path=${mdiFlask}></ha-svg-icon>
                  </ha-dropdown-item>`
            }

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
                : this._usesAutomationEditor
                  ? html`
                      <ha-automation-condition-editor
                        .hass=${this.hass}
                        .condition=${condition}
                        .uiSupported=${true}
                        @ui-mode-not-available=${this._handleUiModeNotAvailable}
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
                    `
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
    // Skip the chip when the result is still unknown or already invalid.
    const result = this._conditionEvaluator.result;
    if (result === "unknown" || this._conditionEvaluator.error !== undefined) {
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

  // Automation editors emit this when UI mode can't handle the config.
  private _handleUiModeNotAvailable(ev: CustomEvent) {
    ev.stopPropagation();
    this._uiWarnings = handleStructError(this.hass, ev.detail).warnings;
    this._uiAvailable = false;
    if (!this._yamlMode) {
      this._yamlMode = true;
    }
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
    "duplicate-condition": { value: VisibilityCondition };
  }
}
