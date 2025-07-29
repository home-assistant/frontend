import "@material/mwc-button/mwc-button";
import {
  mdiClose,
  mdiDotsVertical,
  mdiHelpCircle,
  mdiIdentifier,
  mdiPlaylistEdit,
} from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { load } from "js-yaml";
import {
  any,
  array,
  assert,
  assign,
  object,
  optional,
  string,
  union,
} from "superstruct";
import { ensureArray } from "../../../common/array/ensure-array";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-card";
import "../../../components/ha-icon-button";
import "../../../components/ha-markdown";
import type {
  AutomationConfig,
  Condition,
  ManualAutomationConfig,
  Trigger,
} from "../../../data/automation";
import {
  isCondition,
  isTrigger,
  normalizeAutomationConfig,
} from "../../../data/automation";
import { getActionType, type Action } from "../../../data/script";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import "./action/ha-automation-action";
import "./condition/ha-automation-condition";
import "./trigger/ha-automation-trigger";
import type HaAutomationTrigger from "./trigger/ha-automation-trigger";
import type HaAutomationAction from "./action/ha-automation-action";
import type HaAutomationCondition from "./condition/ha-automation-condition";
import {
  extractSearchParam,
  removeSearchParam,
} from "../../../common/url/search-params";
import { constructUrlCurrentPath } from "../../../common/url/construct-url";
import { canOverrideAlphanumericInput } from "../../../common/dom/can-override-input";
import { showToast } from "../../../util/toast";
import { showPasteReplaceDialog } from "./paste-replace-dialog/show-dialog-paste-replace";
import "@shoelace-style/shoelace/dist/components/split-panel/split-panel";
import "@shoelace-style/shoelace/dist/components/drawer/drawer";
import { dynamicElement } from "../../../common/dom/dynamic-element-directive";
import { classMap } from "lit/directives/class-map";
import { getType } from "./action/ha-automation-action-row";
import { storage } from "../../../common/decorators/storage";
import { nextRender } from "../../../common/util/render-status";
import {
  DIRECTION_ALL,
  DIRECTION_VERTICAL,
  Manager,
  Pan,
  Swipe,
} from "@egjs/hammerjs";

function findNestedItem(
  obj: any,
  path: ItemPath,
  createNonExistingPath?: boolean
): any {
  return path.reduce((ac, p, index, array) => {
    if (ac === undefined) return undefined;
    if (!ac[p] && createNonExistingPath) {
      const nextP = array[index + 1];
      // Create object or array depending on next path
      if (nextP === undefined || typeof nextP === "number") {
        ac[p] = [];
      } else {
        ac[p] = {};
      }
    }
    return ac[p];
  }, obj);
}

function updateNestedItem(obj: any, path: ItemPath, newValue): any {
  const lastKey = path.pop()!;
  const parent = findNestedItem(obj, path);
  parent[lastKey] = newValue
    ? newValue
    : Array.isArray(parent[lastKey])
      ? [...parent[lastKey]]
      : [parent[lastKey]];
  return obj;
}

const baseConfigStruct = object({
  alias: optional(string()),
  description: optional(string()),
  triggers: optional(array(any())),
  conditions: optional(array(any())),
  actions: optional(array(any())),
  mode: optional(string()),
  max_exceeded: optional(string()),
  id: optional(string()),
});

const automationConfigStruct = union([
  assign(baseConfigStruct, object({ triggers: array(any()) })),
  assign(baseConfigStruct, object({ conditions: array(any()) })),
  assign(baseConfigStruct, object({ actions: array(any()) })),
]);

@customElement("manual-automation-editor")
export class HaManualAutomationEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ attribute: false }) public config!: ManualAutomationConfig;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @property({ attribute: false }) public dirty = false;

  @state() private _pastedConfig?: ManualAutomationConfig;

  @state() private _selectedElement?: any;

  @state()
  @storage({ key: "automationSidebarPosition" })
  private _sidebarWidth = 99999;

  @state() private _yamlMode = false;

  private _previousConfig?: ManualAutomationConfig;

  public connectedCallback() {
    super.connectedCallback();
    window.addEventListener("paste", this._handlePaste);
  }

  public disconnectedCallback() {
    window.removeEventListener("paste", this._handlePaste);
    super.disconnectedCallback();
  }

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);
    const expanded = extractSearchParam("expanded");
    if (expanded === "1") {
      this._clearParam("expanded");
      const items = this.shadowRoot!.querySelectorAll<
        HaAutomationTrigger | HaAutomationCondition | HaAutomationAction
      >("ha-automation-trigger, ha-automation-condition, ha-automation-action");

      items.forEach((el) => {
        el.updateComplete.then(() => {
          el.expandAll();
        });
      });
    }
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (changedProps.has("narrow") && this.narrow && this._selectedElement) {
      this.renderRoot.querySelector("sl-drawer").show();
    }
  }

  private _clearParam(param: string) {
    window.history.replaceState(
      null,
      "",
      constructUrlCurrentPath(removeSearchParam(param))
    );
  }

  protected render() {
    const selectedElement = this._selectedElement?.element;
    const selectedElementType = this._selectedElement?.type;
    const path = this._selectedElement?.path || [];

    const type = "";
    const supported = true;
    const yamlMode = this._yamlMode;

    const sidePanel = this._selectedElement
      ? html`<ha-dialog-header>
            <ha-icon-button
              slot="navigationIcon"
              .label=${this.hass.localize("ui.common.close")}
              .path=${mdiClose}
              @click=${this._closeSidebar}
            ></ha-icon-button>
            <span slot="title">${`Edit ${selectedElementType}`}</span>
            <ha-button-menu slot="actionItems" fixed>
              <ha-icon-button
                .path=${mdiDotsVertical}
                slot="trigger"
              ></ha-icon-button>
              ${selectedElementType === "trigger"
                ? html`<ha-md-menu-item
                    .clickAction=${this._showTriggerId}
                    .disabled=${this.disabled || type === "list"}
                  >
                    ${this.hass.localize(
                      "ui.panel.config.automation.editor.triggers.edit_id"
                    )}
                    <ha-svg-icon
                      slot="start"
                      .path=${mdiIdentifier}
                    ></ha-svg-icon>
                  </ha-md-menu-item>`
                : nothing}
              <ha-md-menu-item
                @click=${this._toggleYamlMode}
                .disabled=${!supported}
              >
                ${this.hass.localize(
                  `ui.panel.config.automation.editor.edit_${!yamlMode ? "yaml" : "ui"}`
                )}
                <ha-svg-icon
                  slot="start"
                  .path=${mdiPlaylistEdit}
                ></ha-svg-icon>
              </ha-md-menu-item>
            </ha-button-menu>
          </ha-dialog-header>
          <div
            class=${classMap({
              "card-content": true,
              disabled:
                "enabled" in this._selectedElement &&
                this._selectedElement.enabled === false,
            })}
          >
            ${this._yamlMode
              ? html`<ha-yaml-editor
                  .hass=${this.hass}
                  .defaultValue=${selectedElement}
                  .readOnly=${this.disabled}
                  @value-changed=${this._onYamlChange}
                ></ha-yaml-editor>`
              : selectedElementType === "trigger"
                ? html`<div
                    @ui-mode-not-available=${this._handleUiModeNotAvailable}
                    @value-changed=${this._onUiChanged}
                    .path=${path}
                  >
                    ${dynamicElement(
                      `ha-automation-trigger-${selectedElement.trigger}`,
                      {
                        hass: this.hass,
                        trigger: selectedElement,
                        disabled: this.disabled,
                      }
                    )}
                  </div>`
                : selectedElementType === "condition"
                  ? html`<ha-automation-condition-editor
                      @ui-mode-not-available=${this._handleUiModeNotAvailable}
                      @value-changed=${this._onUiChanged}
                      .path=${path}
                      .yamlMode=${this._yamlMode}
                      .disabled=${this.disabled}
                      .hass=${this.hass}
                      .condition=${selectedElement}
                    ></ha-automation-condition-editor>`
                  : selectedElementType === "action"
                    ? html`<div
                        @ui-mode-not-available=${this._handleUiModeNotAvailable}
                        @value-changed=${this._onUiChanged}
                        .path=${path}
                      >
                        ${dynamicElement(
                          `ha-automation-action-${getType(selectedElement)}`,
                          {
                            hass: this.hass,
                            action: selectedElement,
                            narrow: true,
                            disabled: this.disabled,
                          }
                        )}
                      </div>`
                    : nothing}
          </div>`
      : nothing;

    return html`
      ${this.narrow
        ? html`<sl-drawer
            no-header
            placement="bottom"
            class="drawer-placement-bottom"
            @sl-show=${this._drawerOpen}
            @sl-hide=${this._drawerClose}
          >
            ${sidePanel}
          </sl-drawer>`
        : nothing}
      <sl-split-panel
        primary="start"
        .positionInPixels=${selectedElement && !this.narrow
          ? this.clientWidth - 40 - this._sidebarWidth || 99999
          : 0}
        style=${selectedElement && !this.narrow
          ? "--min: 300px; --max: calc(100% - 300px); --divider-width: 32px;"
          : "--min: 100%; --max: 100%;"}
        @sl-reposition=${this._splitPanelRepositioned}
      >
        <div slot="start" style="overflow: auto; height: 100%">
          ${this.stateObj?.state === "off"
            ? html`
                <ha-alert alert-type="info">
                  ${this.hass.localize(
                    "ui.panel.config.automation.editor.disabled"
                  )}
                  <mwc-button slot="action" @click=${this._enable}>
                    ${this.hass.localize(
                      "ui.panel.config.automation.editor.enable"
                    )}
                  </mwc-button>
                </ha-alert>
              `
            : nothing}
          ${this.config.description
            ? html`<ha-markdown
                class="description"
                breaks
                .content=${this.config.description}
              ></ha-markdown>`
            : nothing}
          <div class="header">
            <h2 id="triggers-heading" class="name">
              ${this.hass.localize(
                "ui.panel.config.automation.editor.triggers.header"
              )}
            </h2>
            <a
              href=${documentationUrl(this.hass, "/docs/automation/trigger/")}
              target="_blank"
              rel="noreferrer"
            >
              <ha-icon-button
                .path=${mdiHelpCircle}
                .label=${this.hass.localize(
                  "ui.panel.config.automation.editor.triggers.learn_more"
                )}
              ></ha-icon-button>
            </a>
          </div>
          ${!ensureArray(this.config.triggers)?.length
            ? html`<p>
                ${this.hass.localize(
                  "ui.panel.config.automation.editor.triggers.description"
                )}
              </p>`
            : nothing}

          <ha-automation-trigger
            role="region"
            aria-labelledby="triggers-heading"
            .triggers=${this.config.triggers || []}
            .highlightedTriggers=${this._pastedConfig?.triggers || [
              selectedElement,
            ]}
            .path=${["triggers"]}
            @value-changed=${this._triggerChanged}
            .hass=${this.hass}
            .disabled=${this.disabled}
            @element-selected=${this._elementSelected}
          ></ha-automation-trigger>

          <div class="header">
            <h2 id="conditions-heading" class="name">
              ${this.hass.localize(
                "ui.panel.config.automation.editor.conditions.header"
              )}
              <span class="small"
                >(${this.hass.localize("ui.common.optional")})</span
              >
            </h2>
            <a
              href=${documentationUrl(this.hass, "/docs/automation/condition/")}
              target="_blank"
              rel="noreferrer"
            >
              <ha-icon-button
                .path=${mdiHelpCircle}
                .label=${this.hass.localize(
                  "ui.panel.config.automation.editor.conditions.learn_more"
                )}
              ></ha-icon-button>
            </a>
          </div>
          ${!ensureArray(this.config.conditions)?.length
            ? html`<p>
                ${this.hass.localize(
                  "ui.panel.config.automation.editor.conditions.description",
                  { user: this.hass.user?.name || "Alice" }
                )}
              </p>`
            : nothing}

          <ha-automation-condition
            role="region"
            aria-labelledby="conditions-heading"
            .conditions=${this.config.conditions || []}
            .highlightedConditions=${this._pastedConfig?.conditions || [
              selectedElement,
            ]}
            .path=${["conditions"]}
            @value-changed=${this._conditionChanged}
            .hass=${this.hass}
            .disabled=${this.disabled}
            @element-selected=${this._elementSelected}
          ></ha-automation-condition>

          <div class="header">
            <h2 id="actions-heading" class="name">
              ${this.hass.localize(
                "ui.panel.config.automation.editor.actions.header"
              )}
            </h2>
            <div>
              <a
                href=${documentationUrl(this.hass, "/docs/automation/action/")}
                target="_blank"
                rel="noreferrer"
              >
                <ha-icon-button
                  .path=${mdiHelpCircle}
                  .label=${this.hass.localize(
                    "ui.panel.config.automation.editor.actions.learn_more"
                  )}
                ></ha-icon-button>
              </a>
            </div>
          </div>
          ${!ensureArray(this.config.actions)?.length
            ? html`<p>
                ${this.hass.localize(
                  "ui.panel.config.automation.editor.actions.description"
                )}
              </p>`
            : nothing}

          <ha-automation-action
            role="region"
            aria-labelledby="actions-heading"
            .actions=${this.config.actions || []}
            .highlightedActions=${this._pastedConfig?.actions || [
              selectedElement,
            ]}
            .path=${["actions"]}
            @value-changed=${this._actionChanged}
            .hass=${this.hass}
            .narrow=${this.narrow}
            .disabled=${this.disabled}
            @element-selected=${this._elementSelected}
          ></ha-automation-action>
        </div>
        ${!this.narrow && selectedElement
          ? html`<ha-card
              slot="end"
              style="--ha-card-border-color: var(--primary-color); --ha-card-border-width: 2px;"
            >
              ${sidePanel}
            </ha-card>`
          : nothing}
      </sl-split-panel>
    `;
  }

  private _onUiChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const path = ev.currentTarget?.path || [];

    const newConfig = updateNestedItem(
      { ...this.config },
      path,
      ev.detail.value
    );

    console.log(newConfig);

    fireEvent(this, "value-changed", { value: newConfig });
  }

  private async _toggleYamlMode() {
    this._yamlMode = !this._yamlMode;
    if (this._yamlMode) {
      await this.updateComplete;
      // this.renderRoot.querySelector("ha-yaml-editor").positionInPixels = 0;
    }
  }

  private async _elementSelected(ev) {
    console.log(ev);
    this._selectedElement = ev.detail;
    console.log("repo", this._sidebarWidth);
    const target = ev.target;
    await this.updateComplete;
    this.renderRoot.querySelector("sl-split-panel").positionInPixels =
      this.clientWidth - 40 - this._sidebarWidth;
    if (this.narrow) {
      this.renderRoot.querySelector("sl-drawer").show();
      console.log(target);
      this._targetEl = target;
    }
  }

  private _splitPanelRepositioned(ev: CustomEvent): void {
    if (!this._selectedElement) {
      return;
    }
    console.log(ev);
    console.log("reposition", ev.target.positionInPixels);
    let sidebarWidth = ev.target.clientWidth - ev.target.positionInPixels;
    if (this._oldClientWidth && this._oldClientWidth !== this.clientWidth) {
      // If the client width has changed, we need to subtract the difference
      sidebarWidth = sidebarWidth + (this._oldClientWidth - this.clientWidth);
    }
    this._oldClientWidth = this.clientWidth;
    console.log(sidebarWidth);
    console.log(this.clientWidth);
    console.log(this.clientWidth - 40 - sidebarWidth);
    // if (Math.abs(sidebarWidth - this._sidebarWidth) > 20) {
    //   this._sidebarWidth = sidebarWidth;
    // }
    this._sidebarWidth = sidebarWidth;
  }

  private _closeSidebar() {
    if (this.narrow) {
      this.renderRoot.querySelector("sl-drawer").hide();
    }
    this._selectedElement = undefined;
  }

  private async _drawerOpen() {
    // this._oldScrollPosition = window.scrollY;
    this.renderRoot.querySelector("div[slot='start']").style.paddingBottom =
      "66vh";
    await nextRender();
    fireEvent(this, "scroll-to", {
      up: this._targetEl.getBoundingClientRect().top,
    });
    this._setupListeners();
  }

  private _setupListeners() {
    const mc = new Manager(this.renderRoot.querySelector("ha-dialog-header"), {
      touchAction: "pan-y",
    });

    mc.add(
      new Swipe({
        direction: DIRECTION_VERTICAL,
      })
    );
    mc.on("swipeup", (e) => {
      console.log("up", e);
      this.toggleAttribute("big-drawer", true);
    });

    mc.on("swipedown", (e) => {
      console.log("down", e);
      if (this.hasAttribute("big-drawer")) {
        this.toggleAttribute("big-drawer", false);
      } else {
        this.renderRoot.querySelector("sl-drawer").hide();
      }
    });

    this._manager = mc;
  }

  private _drawerClose() {
    this.renderRoot.querySelector("div[slot='start']").style.paddingBottom =
      "0";
  }

  private _triggerChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    this.resetPastedConfig();
    fireEvent(this, "value-changed", {
      value: { ...this.config!, triggers: ev.detail.value as Trigger[] },
    });
  }

  private _conditionChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    this.resetPastedConfig();
    fireEvent(this, "value-changed", {
      value: {
        ...this.config!,
        conditions: ev.detail.value as Condition[],
      },
    });
  }

  private _actionChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    this.resetPastedConfig();
    fireEvent(this, "value-changed", {
      value: { ...this.config!, actions: ev.detail.value as Action[] },
    });
  }

  private async _enable(): Promise<void> {
    if (!this.hass || !this.stateObj) {
      return;
    }
    await this.hass.callService("automation", "turn_on", {
      entity_id: this.stateObj.entity_id,
    });
  }

  private _handlePaste = async (ev: ClipboardEvent) => {
    if (!canOverrideAlphanumericInput(ev.composedPath())) {
      return;
    }

    const paste = ev.clipboardData?.getData("text");
    if (!paste) {
      return;
    }

    let loaded: any;
    try {
      loaded = load(paste);
    } catch (_err: any) {
      showToast(this, {
        message: this.hass.localize(
          "ui.panel.config.automation.editor.paste_invalid_yaml"
        ),
        duration: 4000,
        dismissable: true,
      });
      return;
    }

    if (!loaded || typeof loaded !== "object") {
      return;
    }

    let config = loaded;

    if ("automation" in config) {
      config = config.automation;
      if (Array.isArray(config)) {
        config = config[0];
      }
    }

    if (Array.isArray(config)) {
      if (config.length === 1) {
        config = config[0];
      } else {
        const newConfig: AutomationConfig = {
          triggers: [],
          conditions: [],
          actions: [],
        };
        let found = false;
        config.forEach((cfg: any) => {
          if (isTrigger(cfg)) {
            found = true;
            (newConfig.triggers as Trigger[]).push(cfg);
          }
          if (isCondition(cfg)) {
            found = true;
            (newConfig.conditions as Condition[]).push(cfg);
          }
          if (getActionType(cfg) !== "unknown") {
            found = true;
            (newConfig.actions as Action[]).push(cfg);
          }
        });
        if (found) {
          config = newConfig;
        }
      }
    }

    if (isTrigger(config)) {
      config = { triggers: [config] };
    }
    if (isCondition(config)) {
      config = { conditions: [config] };
    }
    if (getActionType(config) !== "unknown") {
      config = { actions: [config] };
    }

    let normalized: AutomationConfig;

    try {
      normalized = normalizeAutomationConfig(config);
    } catch (_err: any) {
      return;
    }

    try {
      assert(normalized, automationConfigStruct);
    } catch (_err: any) {
      showToast(this, {
        message: this.hass.localize(
          "ui.panel.config.automation.editor.paste_invalid_config"
        ),
        duration: 4000,
        dismissable: true,
      });
      return;
    }

    if (normalized) {
      ev.preventDefault();

      if (this.dirty) {
        const result = await new Promise<boolean>((resolve) => {
          showPasteReplaceDialog(this, {
            domain: "automation",
            pastedConfig: normalized,
            onClose: () => resolve(false),
            onAppend: () => {
              this._appendToExistingConfig(normalized);
              resolve(false);
            },
            onReplace: () => resolve(true),
          });
        });

        if (!result) {
          return;
        }
      }

      // replace the config completely
      this._replaceExistingConfig(normalized);
    }
  };

  private _appendToExistingConfig(config: ManualAutomationConfig) {
    // make a copy otherwise we will reference the original config
    this._previousConfig = { ...this.config } as ManualAutomationConfig;
    this._pastedConfig = config;

    if (!this.config) {
      return;
    }

    if ("triggers" in config) {
      this.config.triggers = ensureArray(this.config.triggers || []).concat(
        ensureArray(config.triggers)
      );
    }
    if ("conditions" in config) {
      this.config.conditions = ensureArray(this.config.conditions || []).concat(
        ensureArray(config.conditions)
      );
    }
    if ("actions" in config) {
      this.config.actions = ensureArray(this.config.actions || []).concat(
        ensureArray(config.actions)
      ) as Action[];
    }

    this._showPastedToastWithUndo();

    fireEvent(this, "value-changed", {
      value: {
        ...this.config!,
      },
    });
  }

  private _replaceExistingConfig(config: ManualAutomationConfig) {
    // make a copy otherwise we will reference the original config
    this._previousConfig = { ...this.config } as ManualAutomationConfig;
    this._pastedConfig = config;
    this.config = config;

    this._showPastedToastWithUndo();

    fireEvent(this, "value-changed", {
      value: {
        ...this.config,
      },
    });
  }

  private _showPastedToastWithUndo() {
    showToast(this, {
      message: this.hass.localize(
        "ui.panel.config.automation.editor.paste_toast_message"
      ),
      duration: 4000,
      action: {
        text: this.hass.localize("ui.common.undo"),
        action: () => {
          fireEvent(this, "value-changed", {
            value: {
              ...this._previousConfig!,
            },
          });

          this._previousConfig = undefined;
          this._pastedConfig = undefined;
        },
      },
    });
  }

  public resetPastedConfig() {
    if (!this._previousConfig) {
      return;
    }

    this._pastedConfig = undefined;
    this._previousConfig = undefined;

    showToast(this, {
      message: "",
      duration: 0,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          display: block;
        }
        ha-card {
          overflow: hidden;
        }
        .description {
          margin: 0;
        }
        p {
          margin-top: 0;
        }
        .header {
          margin-top: 16px;

          display: flex;
          align-items: center;
        }
        .header:first-child {
          margin-top: -16px;
        }
        .header .name {
          font-weight: var(--ha-font-weight-normal);
          flex: 1;
          margin-bottom: 16px;
        }
        .header a {
          color: var(--secondary-text-color);
        }
        .header .small {
          font-size: small;
          font-weight: var(--ha-font-weight-normal);
          line-height: 0;
        }

        sl-split-panel {
          height: calc(100vh - var(--header-height, 64px) - 28px - 20px - 1px);
        }

        sl-drawer {
          --sl-z-index-drawer: 9999;
          --size: 66vh;
          --sl-panel-background-color: var(--ha-card-background, white);
          --sl-overlay-background-color: rgba(0, 0, 0, 0.32);
          --sl-shadow-x-large: var(
            --ha-card-box-shadow,
            0px -1px 4px 1px rgba(0, 0, 0, 0.2),
            0px 1px 1px 0px rgba(0, 0, 0, 0.14),
            0px 1px 3px 0px rgba(0, 0, 0, 0.12)
          );
          --sl-panel-border-color: var(--ha-card-border-color, #e0e0e0);
        }
        :host([big-drawer]) sl-drawer {
          --size: 90vh;
        }
        sl-drawer::part(panel) {
          border-radius: 12px 12px 0 0;
          border: 1px solid var(--ha-card-border-color, #e0e0e0);
        }
        sl-drawer .card-content {
          padding: 12px;
        }
        sl-drawer ha-dialog-header {
          position: sticky;
          top: 0;
          background: var(--card-background-color);
          z-index: 999;
        }
        .card-content {
          overflow: auto;
          height: 100%;
          padding-bottom: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "manual-automation-editor": HaManualAutomationEditor;
  }
}
