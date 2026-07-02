import { css, html, LitElement, nothing } from "lit";
import type { CSSResultGroup } from "lit";
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
import {
  internationalizationContext,
  statesContext,
} from "../../../../data/context";
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

type DeviceAddToAction =
  | (AddToActionListItem & {
      kind: "add-to";
      key: AddToAutomationScriptActionKey;
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

  @state() private _params?: DeviceAddToDialogParams;

  @state() private _open = false;

  public showDialog(params: DeviceAddToDialogParams): void {
    this._params = params;
    this._open = true;
  }

  public closeDialog(): void {
    this._open = false;
  }

  protected firstUpdated() {
    this._i18n.loadBackendTranslation("device_automation");
  }

  private _dialogClosed(): void {
    this._params = undefined;
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
        ${this._renderOptions()}
      </ha-adaptive-dialog>
    `;
  }

  private _renderOptions() {
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
              "ui.dialogs.more_info_control.add_to.action_options.automation_trigger"
            ),
          },
          {
            kind: "add-to",
            key: "automation_condition",
            iconPath: mdiPlaylistCheck,
            name: this._i18n.localize(
              "ui.dialogs.more_info_control.add_to.action_options.automation_condition"
            ),
          },
          {
            kind: "add-to",
            key: "automation_action",
            iconPath: mdiPlayCircleOutline,
            name: this._i18n.localize(
              "ui.dialogs.more_info_control.add_to.action_options.automation_action"
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
              "ui.dialogs.more_info_control.add_to.action_options.script_action"
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

  private _addSceneSection(
    sections: AddToActionListSection<DeviceAddToAction>[]
  ): void {
    if (!this._params?.canCreateScene || !this._params.entityIds.length) {
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
            "ui.dialogs.more_info_control.add_to.action_options.scene"
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

    this._handleAddToAction(action.key);
  }

  private _handleAddToAction(key: AddToAutomationScriptActionKey) {
    if (!this._params) {
      return;
    }

    this.closeDialog();
    addToActionHandler(key, { device_id: this._params.device.id });
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-device-add-to": DialogDeviceAddTo;
  }
}
