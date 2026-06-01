import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { consume, type ContextType } from "@lit/context";
import { customElement, state } from "lit/decorators";
import {
  mdiPalette,
  mdiPlayCircleOutline,
  mdiPlaylistCheck,
  mdiRobotOutline,
  mdiScriptTextOutline,
} from "@mdi/js";
import { computeAreaName } from "../../../common/entity/compute_area_name";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-adaptive-dialog";
import {
  areasContext,
  internationalizationContext,
} from "../../../data/context";
import { showSceneEditor } from "../../../data/scene";
import "../../../dialogs/add-to/ha-add-to-action-list";
import type {
  AddToActionListActionSelectedEvent,
  AddToActionListItem,
  AddToActionListSection,
} from "../../../dialogs/add-to/ha-add-to-action-list";
import {
  addToActionHandler,
  createAddToSceneEntities,
  type AddToAutomationScriptActionKey,
} from "../../../dialogs/add-to/add-to";
import { haStyle, haStyleDialog } from "../../../resources/styles";
import type { AreaAddToDialogParams } from "./show-dialog-area-add-to";

type AreaAddToAction =
  | (AddToActionListItem & {
      type: "automation";
      key: AddToAutomationScriptActionKey;
    })
  | (AddToActionListItem & { type: "scene" });

@customElement("dialog-area-add-to")
class DialogAreaAddTo extends LitElement {
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state()
  @consume({ context: areasContext, subscribe: true })
  private _areas!: ContextType<typeof areasContext>;

  @state() private _params?: AreaAddToDialogParams;

  @state() private _open = false;

  public showDialog(params: AreaAddToDialogParams): void {
    this._params = params;
    this._open = true;
  }

  public closeDialog(): void {
    this._open = false;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    return html`
      <ha-adaptive-dialog
        .open=${this._open}
        header-title=${this._i18n.localize(
          "ui.dialogs.more_info_control.add_to.title",
          {
            target:
              computeAreaName(this._areas[this._params.areaId]) ||
              this._params.areaId,
          }
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

    const sections: AddToActionListSection<AreaAddToAction>[] = [
      {
        title: this._i18n.localize(
          "ui.panel.config.devices.automation.automations_heading"
        ),
        actions: [
          {
            type: "automation",
            key: "automation_trigger",
            iconPath: mdiRobotOutline,
            name: this._i18n.localize(
              "ui.dialogs.more_info_control.add_to.actions.automation_trigger"
            ),
          },
          {
            type: "automation",
            key: "automation_condition",
            iconPath: mdiPlaylistCheck,
            name: this._i18n.localize(
              "ui.dialogs.more_info_control.add_to.actions.automation_condition"
            ),
          },
          {
            type: "automation",
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
            type: "automation",
            key: "script_action",
            iconPath: mdiScriptTextOutline,
            name: this._i18n.localize(
              "ui.dialogs.more_info_control.add_to.actions.script_action"
            ),
          },
        ],
      },
    ];

    if (this._params.entityIds.length) {
      sections.push({
        title: this._i18n.localize(
          "ui.panel.config.devices.scene.scenes_heading"
        ),
        actions: [
          {
            type: "scene",
            iconPath: mdiPalette,
            name: this._i18n.localize(
              "ui.dialogs.more_info_control.add_to.actions.scene"
            ),
          },
        ],
      });
    }

    return html`
      <ha-add-to-action-list
        .sections=${sections}
        @add-to-list-action-selected=${this._handleActionSelected}
      ></ha-add-to-action-list>
    `;
  }

  private _handleActionSelected(
    ev: AddToActionListActionSelectedEvent<AreaAddToAction>
  ) {
    if (!this._params) {
      return;
    }

    const { action } = ev.detail;

    if (action.type === "scene") {
      this._handleCreateScene();
      return;
    }

    this.closeDialog();
    addToActionHandler(action.key, { area_id: this._params.areaId });
  }

  private _handleCreateScene() {
    if (!this._params) {
      return;
    }

    this.closeDialog();
    showSceneEditor(
      { entities: createAddToSceneEntities(this._params.entityIds) },
      this._params.areaId
    );
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
    "dialog-area-add-to": DialogAreaAddTo;
  }
}
