import { css, html, LitElement, nothing } from "lit";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { consume, type ContextType } from "@lit/context";
import { customElement, state } from "lit/decorators";
import {
  mdiPalette,
  mdiPlayCircleOutline,
  mdiPlaylistCheck,
  mdiRobotOutline,
  mdiScriptTextOutline,
} from "@mdi/js";
import { computeDeviceNameDisplay } from "../../../../common/entity/compute_device_name";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-adaptive-dialog";
import "../../../../components/ha-list";
import "../../../../components/ha-list-item";
import "../../../../components/ha-spinner";
import type { AutomationConfig } from "../../../../data/automation";
import { showAutomationEditor } from "../../../../data/automation";
import {
  apiContext,
  internationalizationContext,
  statesContext,
} from "../../../../data/context";
import type {
  DeviceAction,
  DeviceCondition,
  DeviceTrigger,
} from "../../../../data/device/device_automation";
import {
  fetchDeviceActions,
  fetchDeviceConditions,
  fetchDeviceTriggers,
  sortDeviceAutomations,
} from "../../../../data/device/device_automation";
import type { ScriptConfig } from "../../../../data/script";
import { showScriptEditor } from "../../../../data/script";
import type { SceneEntities } from "../../../../data/scene";
import { showSceneEditor } from "../../../../data/scene";
import {
  addToActionHandler,
  type AddToActionKey,
} from "../../../../dialogs/more-info/add-to";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { DeviceAddToDialogParams } from "./show-dialog-device-add-to";
import type { LocalizeKeys } from "../../../../common/translations/localize";

type DeviceAddToActionType = AddToActionKey | "trigger" | "condition";

@customElement("dialog-device-add-to")
export class DialogDeviceAddTo extends LitElement {
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state()
  @consume({ context: statesContext, subscribe: true })
  private _states!: ContextType<typeof statesContext>;

  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @state() private _params?: DeviceAddToDialogParams;

  @state() private _open = false;

  @state() private _triggers?: DeviceTrigger[];

  @state() private _conditions?: DeviceCondition[];

  @state() private _actions?: DeviceAction[];

  public showDialog(params: DeviceAddToDialogParams): void {
    this._params = params;
    this._open = true;

    // When new_triggers_conditions labs feature is promoted, this whole check can be removed.
    if (!params.newTriggersConditions && this._api) {
      this._fetchDeviceAutomations(params);
    }
  }

  public closeDialog(): void {
    this._open = false;
  }

  protected willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);

    // When new_triggers_conditions labs feature is promoted, this whole check can be removed.
    if (
      changedProps.has("_api") &&
      this._api &&
      this._params &&
      !this._params.newTriggersConditions &&
      !this._triggers
    ) {
      this._fetchDeviceAutomations(this._params);
    }
  }

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    this._i18n.loadBackendTranslation("device_automation");
  }

  // When new_triggers_conditions labs feature is promoted, this whole method can be removed.
  private async _fetchDeviceAutomations(
    params: DeviceAddToDialogParams
  ): Promise<void> {
    const deviceId = params.device.id;

    const [triggers, conditions, actions] = await Promise.all([
      fetchDeviceTriggers(this._api.callWS, deviceId),
      fetchDeviceConditions(this._api.callWS, deviceId),
      fetchDeviceActions(this._api.callWS, deviceId),
    ]);

    this._triggers = triggers.sort(sortDeviceAutomations);
    this._conditions = conditions.sort(sortDeviceAutomations);
    this._actions = actions.sort(sortDeviceAutomations);
  }

  private _dialogClosed(): void {
    this._params = undefined;
    this._triggers = undefined;
    this._conditions = undefined;
    this._actions = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const deviceName = computeDeviceNameDisplay(
      this._params.device,
      this._i18n.localize,
      this._states
    );

    return html`
      <ha-adaptive-dialog
        .open=${this._open}
        header-title=${this._i18n.localize(
          "ui.dialogs.more_info_control.add_to.title",
          { target: deviceName }
        )}
        @closed=${this._dialogClosed}
      >
        ${this._params.newTriggersConditions
          ? this._renderNewOptions()
          : this._renderLegacyOptions()}
      </ha-adaptive-dialog>
    `;
  }

  private _renderNewOptions() {
    if (!this._params) {
      return nothing;
    }

    return html`
      ${this._renderActionSection(
        "ui.panel.config.devices.automation.automations_heading",
        this._renderNewAutomationActions()
      )}
      ${this._renderActionSection(
        "ui.panel.config.devices.script.scripts_heading",
        this._renderActionList([
          this._renderActionItem(
            "script_action",
            mdiScriptTextOutline,
            "ui.dialogs.more_info_control.add_to.actions.script_action",
            this._handleNewAction
          ),
        ])
      )}
      ${this._renderSceneSection()}
    `;
  }

  // When new_triggers_conditions labs feature is promoted, this whole method can be removed.
  private _renderLegacyOptions() {
    if (!this._triggers && !this._conditions && !this._actions) {
      return html`
        <div class="loading">
          <ha-spinner></ha-spinner>
        </div>
      `;
    }

    if (!this._params) {
      return nothing;
    }

    const hasTriggers = Boolean(this._triggers?.length);
    const hasConditions = Boolean(this._conditions?.length);
    const hasActions = Boolean(this._actions?.length);
    const hasScenes = Boolean(this._params.entityIds.length);

    if (!hasTriggers && !hasConditions && !hasActions && !hasScenes) {
      return html`
        <div class="empty">
          ${this._i18n.localize(
            "ui.panel.config.devices.automation.no_device_automations"
          )}
        </div>
      `;
    }

    return html`
      ${this._renderActionSection(
        "ui.panel.config.devices.automation.automations_heading",
        hasTriggers || hasConditions || hasActions
          ? this._renderLegacyAutomationActions(
              hasTriggers,
              hasConditions,
              hasActions
            )
          : this._renderEmptyList(
              "ui.panel.config.devices.automation.no_automations"
            )
      )}
      ${this._renderActionSection(
        "ui.panel.config.devices.script.scripts_heading",
        hasActions
          ? this._renderActionList([
              this._renderActionItem(
                "script_action",
                mdiScriptTextOutline,
                "ui.dialogs.more_info_control.add_to.actions.script_action",
                this._handleLegacyAction
              ),
            ])
          : this._renderEmptyList("ui.panel.config.devices.script.no_scripts")
      )}
      ${this._renderSceneSection()}
    `;
  }

  private _renderActionSection(titleKey: LocalizeKeys, list: TemplateResult) {
    return html`
      <h3 class="section-header">${this._i18n.localize(titleKey)}</h3>
      ${list}
    `;
  }

  private _renderNewAutomationActions() {
    return this._renderActionList([
      this._renderActionItem(
        "automation_trigger",
        mdiRobotOutline,
        "ui.dialogs.more_info_control.add_to.actions.automation_trigger",
        this._handleNewAction
      ),
      this._renderActionItem(
        "automation_condition",
        mdiPlaylistCheck,
        "ui.dialogs.more_info_control.add_to.actions.automation_condition",
        this._handleNewAction
      ),
      this._renderActionItem(
        "automation_action",
        mdiPlayCircleOutline,
        "ui.dialogs.more_info_control.add_to.actions.automation_action",
        this._handleNewAction
      ),
    ]);
  }

  private _renderLegacyAutomationActions(
    hasTriggers: boolean,
    hasConditions: boolean,
    hasActions: boolean
  ) {
    return this._renderActionList([
      hasTriggers
        ? this._renderActionItem(
            "trigger",
            mdiRobotOutline,
            "ui.dialogs.more_info_control.add_to.actions.automation_trigger",
            this._handleLegacyAction
          )
        : nothing,
      hasConditions
        ? this._renderActionItem(
            "condition",
            mdiPlaylistCheck,
            "ui.dialogs.more_info_control.add_to.actions.automation_condition",
            this._handleLegacyAction
          )
        : nothing,
      hasActions
        ? this._renderActionItem(
            "automation_action",
            mdiPlayCircleOutline,
            "ui.dialogs.more_info_control.add_to.actions.automation_action",
            this._handleLegacyAction
          )
        : nothing,
    ]);
  }

  private _renderActionList(items: (TemplateResult | typeof nothing)[]) {
    return html`<ha-list>${items}</ha-list>`;
  }

  private _renderEmptyList(messageKey: LocalizeKeys) {
    return this._renderActionList([
      html`<ha-list-item noninteractive>
        ${this._i18n.localize(messageKey)}
      </ha-list-item>`,
    ]);
  }

  private _renderActionItem(
    type: DeviceAddToActionType | undefined,
    path: string,
    labelKey: LocalizeKeys,
    handler: (ev: Event) => void
  ) {
    return html`
      <ha-list-item
        graphic="icon"
        data-type=${type ?? nothing}
        @click=${handler}
        data-dialog="close"
      >
        <ha-svg-icon slot="graphic" .path=${path}></ha-svg-icon>
        ${this._i18n.localize(labelKey)}
      </ha-list-item>
    `;
  }

  private _renderSceneSection() {
    if (!this._params?.entityIds.length) {
      return nothing;
    }

    return this._renderActionSection(
      "ui.panel.config.devices.scene.scenes_heading",
      this._renderActionList([
        this._renderActionItem(
          undefined,
          mdiPalette,
          "ui.dialogs.more_info_control.add_to.actions.scene",
          this._handleCreateScene
        ),
      ])
    );
  }

  private _handleNewAction(ev: Event) {
    if (!this._params) {
      return;
    }
    const key = (ev.currentTarget as HTMLElement).dataset
      .type as AddToActionKey;
    this.closeDialog();
    addToActionHandler(key, { device_id: this._params.device.id });
  }

  // When new_triggers_conditions labs feature is promoted, this whole method can be removed.
  private _handleLegacyAction(ev: Event) {
    if (!this._params) {
      return;
    }
    const type = (ev.currentTarget as HTMLElement).dataset.type as
      | "trigger"
      | "condition"
      | "automation_action"
      | "script_action";

    this.closeDialog();

    if (type === "script_action") {
      const newScript = {} as ScriptConfig;
      if (this._actions?.length) {
        newScript.sequence = [this._actions[0]];
      }
      showScriptEditor(newScript, true);
    } else {
      const newAutomation = {} as AutomationConfig;
      if (type === "trigger" && this._triggers?.length) {
        newAutomation.triggers = [this._triggers[0]];
      } else if (type === "condition" && this._conditions?.length) {
        newAutomation.conditions = [this._conditions[0]];
      } else if (type === "automation_action" && this._actions?.length) {
        newAutomation.actions = [this._actions[0]];
      }
      showAutomationEditor(newAutomation, true);
    }
  }

  private _handleCreateScene() {
    if (!this._params) {
      return;
    }
    const entities: SceneEntities = {};
    for (const entityId of this._params.entityIds) {
      entities[entityId] = "";
    }
    this.closeDialog();
    showSceneEditor({ entities });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-adaptive-dialog {
          --dialog-content-padding: 0;
        }

        .loading,
        .empty {
          padding: var(--ha-space-4);
          text-align: center;
        }

        .section-header {
          padding: var(--ha-space-2) var(--ha-space-4) 0;
          margin: 0;
          font-size: var(--ha-font-size-m);
          font-weight: var(--ha-font-weight-medium);
          color: var(--secondary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-device-add-to": DialogDeviceAddTo;
  }
}
