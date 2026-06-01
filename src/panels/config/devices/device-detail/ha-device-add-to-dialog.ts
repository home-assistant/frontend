import { css, html, LitElement, nothing } from "lit";
import type { CSSResultGroup, PropertyValues } from "lit";
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
import { showSceneEditor } from "../../../../data/scene";
import "../../../../dialogs/add-to/ha-add-to-action-list";
import type {
  AddToActionListActionSelectedEvent,
  AddToActionListItem,
  AddToActionListSection,
} from "../../../../dialogs/add-to/ha-add-to-action-list";
import {
  addToActionHandler,
  createAddToSceneEntities,
  type AddToAutomationScriptActionKey,
} from "../../../../dialogs/add-to/add-to";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { DeviceAddToDialogParams } from "./show-dialog-device-add-to";

type DeviceLegacyAddToActionType =
  | "trigger"
  | "condition"
  | "automation_action"
  | "script_action";

type DeviceAddToAction =
  | (AddToActionListItem & {
      kind: "add-to";
      key: AddToAutomationScriptActionKey;
    })
  | (AddToActionListItem & {
      kind: "legacy";
      legacyType: DeviceLegacyAddToActionType;
    })
  | (AddToActionListItem & { kind: "scene" });

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

    const sections: AddToActionListSection<DeviceAddToAction>[] = [
      {
        title: this._i18n.localize(
          "ui.panel.config.devices.automation.automations_heading"
        ),
        actions: [
          {
            kind: "add-to",
            key: "automation_trigger",
            iconPath: mdiRobotOutline,
            name: this._i18n.localize(
              "ui.dialogs.more_info_control.add_to.actions.automation_trigger"
            ),
          },
          {
            kind: "add-to",
            key: "automation_condition",
            iconPath: mdiPlaylistCheck,
            name: this._i18n.localize(
              "ui.dialogs.more_info_control.add_to.actions.automation_condition"
            ),
          },
          {
            kind: "add-to",
            key: "automation_action",
            iconPath: mdiPlayCircleOutline,
            name: this._i18n.localize(
              "ui.dialogs.more_info_control.add_to.actions.automation_action"
            ),
          },
        ],
      },
      {
        title: this._i18n.localize(
          "ui.panel.config.devices.script.scripts_heading"
        ),
        actions: [
          {
            kind: "add-to",
            key: "script_action",
            iconPath: mdiScriptTextOutline,
            name: this._i18n.localize(
              "ui.dialogs.more_info_control.add_to.actions.script_action"
            ),
          },
        ],
      },
    ];
    this._addSceneSection(sections);

    return html`
      <ha-add-to-action-list
        .sections=${sections}
        @add-to-list-action-selected=${this._handleActionSelected}
      ></ha-add-to-action-list>
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

    const automationActions: DeviceAddToAction[] = [];
    if (hasTriggers) {
      automationActions.push({
        kind: "legacy",
        legacyType: "trigger",
        iconPath: mdiRobotOutline,
        name: this._i18n.localize(
          "ui.dialogs.more_info_control.add_to.actions.automation_trigger"
        ),
      });
    }
    if (hasConditions) {
      automationActions.push({
        kind: "legacy",
        legacyType: "condition",
        iconPath: mdiPlaylistCheck,
        name: this._i18n.localize(
          "ui.dialogs.more_info_control.add_to.actions.automation_condition"
        ),
      });
    }
    if (hasActions) {
      automationActions.push({
        kind: "legacy",
        legacyType: "automation_action",
        iconPath: mdiPlayCircleOutline,
        name: this._i18n.localize(
          "ui.dialogs.more_info_control.add_to.actions.automation_action"
        ),
      });
    }

    const scriptActions: DeviceAddToAction[] = hasActions
      ? [
          {
            kind: "legacy",
            legacyType: "script_action",
            iconPath: mdiScriptTextOutline,
            name: this._i18n.localize(
              "ui.dialogs.more_info_control.add_to.actions.script_action"
            ),
          },
        ]
      : [];

    const sections: AddToActionListSection<DeviceAddToAction>[] = [
      {
        title: this._i18n.localize(
          "ui.panel.config.devices.automation.automations_heading"
        ),
        actions: automationActions,
        empty: automationActions.length
          ? undefined
          : this._i18n.localize(
              "ui.panel.config.devices.automation.no_automations"
            ),
      },
      {
        title: this._i18n.localize(
          "ui.panel.config.devices.script.scripts_heading"
        ),
        actions: scriptActions,
        empty: scriptActions.length
          ? undefined
          : this._i18n.localize("ui.panel.config.devices.script.no_scripts"),
      },
    ];
    this._addSceneSection(sections);

    return html`
      <ha-add-to-action-list
        .sections=${sections}
        @add-to-list-action-selected=${this._handleActionSelected}
      ></ha-add-to-action-list>
    `;
  }

  private _addSceneSection(
    sections: AddToActionListSection<DeviceAddToAction>[]
  ): void {
    if (!this._params?.entityIds.length) {
      return;
    }

    sections.push({
      title: this._i18n.localize(
        "ui.panel.config.devices.scene.scenes_heading"
      ),
      actions: [
        {
          kind: "scene",
          iconPath: mdiPalette,
          name: this._i18n.localize(
            "ui.dialogs.more_info_control.add_to.actions.scene"
          ),
        },
      ],
    });
  }

  private _handleActionSelected(
    ev: AddToActionListActionSelectedEvent<DeviceAddToAction>
  ) {
    if (!this._params) {
      return;
    }

    const { action } = ev.detail;
    if (action.kind === "scene") {
      this._handleCreateScene();
      return;
    }

    if (action.kind === "add-to") {
      this._handleAddToAction(action.key);
      return;
    }

    this._handleLegacyAction(action.legacyType);
  }

  private _handleAddToAction(key: AddToAutomationScriptActionKey) {
    if (!this._params) {
      return;
    }

    this.closeDialog();
    addToActionHandler(key, { device_id: this._params.device.id });
  }

  // When new_triggers_conditions labs feature is promoted, this whole method can be removed.
  private _handleLegacyAction(type: DeviceLegacyAddToActionType) {
    this.closeDialog();

    if (type === "script_action") {
      const newScript = {} as ScriptConfig;
      if (this._actions?.length) {
        newScript.sequence = [this._actions[0]];
      }
      showScriptEditor(newScript, true);
      return;
    }

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

  private _handleCreateScene() {
    if (!this._params) {
      return;
    }
    this.closeDialog();
    showSceneEditor({
      entities: createAddToSceneEntities(this._params.entityIds),
    });
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-device-add-to": DialogDeviceAddTo;
  }
}
