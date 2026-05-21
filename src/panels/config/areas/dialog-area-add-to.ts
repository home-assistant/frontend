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
import "../../../components/ha-list";
import "../../../components/ha-list-item";
import "../../../components/ha-svg-icon";
import {
  areasContext,
  internationalizationContext,
} from "../../../data/context";
import type { SceneEntities } from "../../../data/scene";
import { showSceneEditor } from "../../../data/scene";
import {
  addToActionHandler,
  type AddToActionKey,
} from "../../../dialogs/more-info/add-to";
import { haStyle, haStyleDialog } from "../../../resources/styles";
import type { AreaAddToDialogParams } from "./show-dialog-area-add-to";

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
          "ui.dialogs.more_info_control.add_to.title"
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

    const area = this._areas[this._params.areaId];
    const areaName = computeAreaName(area) || this._params.areaId;

    return html`
      <h3 class="section-header">
        ${this._i18n.localize(
          "ui.panel.config.devices.automation.automations_heading"
        )}
      </h3>
      <ha-list>
        ${this._renderActionItem(
          "automation_trigger",
          mdiRobotOutline,
          "ui.dialogs.more_info_control.add_to.actions.automation_trigger",
          areaName
        )}
        ${this._renderActionItem(
          "automation_condition",
          mdiPlaylistCheck,
          "ui.dialogs.more_info_control.add_to.actions.automation_condition",
          areaName
        )}
        ${this._renderActionItem(
          "automation_action",
          mdiPlayCircleOutline,
          "ui.dialogs.more_info_control.add_to.actions.automation_action",
          areaName
        )}
      </ha-list>
      <h3 class="section-header">
        ${this._i18n.localize("ui.panel.config.devices.script.scripts_heading")}
      </h3>
      <ha-list>
        ${this._renderActionItem(
          "script_action",
          mdiScriptTextOutline,
          "ui.dialogs.more_info_control.add_to.actions.script_action",
          areaName
        )}
      </ha-list>
      ${this._renderSceneSection(areaName)}
    `;
  }

  private _renderSceneSection(areaName: string) {
    if (!this._params?.entityIds.length) {
      return nothing;
    }

    return html`
      <h3 class="section-header">
        ${this._i18n.localize("ui.panel.config.devices.scene.scenes_heading")}
      </h3>
      <ha-list>
        <ha-list-item
          graphic="icon"
          @click=${this._handleCreateScene}
          data-dialog="close"
        >
          <ha-svg-icon slot="graphic" .path=${mdiPalette}></ha-svg-icon>
          ${this._i18n.localize(
            "ui.dialogs.more_info_control.add_to.actions.scene",
            { target: areaName }
          )}
        </ha-list-item>
      </ha-list>
    `;
  }

  private _renderActionItem(
    key: AddToActionKey,
    path: string,
    translationKey:
      | "ui.dialogs.more_info_control.add_to.actions.automation_trigger"
      | "ui.dialogs.more_info_control.add_to.actions.automation_condition"
      | "ui.dialogs.more_info_control.add_to.actions.automation_action"
      | "ui.dialogs.more_info_control.add_to.actions.script_action",
    areaName: string
  ) {
    return html`
      <ha-list-item
        graphic="icon"
        data-type=${key}
        @click=${this._handleAction}
        data-dialog="close"
      >
        <ha-svg-icon slot="graphic" .path=${path}></ha-svg-icon>
        ${this._i18n.localize(translationKey, { target: areaName })}
      </ha-list-item>
    `;
  }

  private _handleAction(ev: Event) {
    if (!this._params) {
      return;
    }

    const key = (ev.currentTarget as HTMLElement).dataset
      .type as AddToActionKey;

    this.closeDialog();
    addToActionHandler(key, { area_id: this._params.areaId });
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
    showSceneEditor({ entities }, this._params.areaId);
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-adaptive-dialog {
          --dialog-content-padding: 0;
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
    "dialog-area-add-to": DialogAreaAddTo;
  }
}
