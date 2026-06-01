import type { CSSResultGroup, TemplateResult } from "lit";
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
import type { LocalizeKeys } from "../../../common/translations/localize";
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

    return html`
      ${this._renderActionSection(
        "ui.panel.config.devices.automation.automations_heading",
        this._renderActionList([
          this._renderActionItem(
            "automation_trigger",
            mdiRobotOutline,
            "ui.dialogs.more_info_control.add_to.actions.automation_trigger",
            this._handleAction
          ),
          this._renderActionItem(
            "automation_condition",
            mdiPlaylistCheck,
            "ui.dialogs.more_info_control.add_to.actions.automation_condition",
            this._handleAction
          ),
          this._renderActionItem(
            "automation_action",
            mdiPlayCircleOutline,
            "ui.dialogs.more_info_control.add_to.actions.automation_action",
            this._handleAction
          ),
        ])
      )}
      ${this._renderActionSection(
        "ui.panel.config.devices.script.scripts_heading",
        this._renderActionList([
          this._renderActionItem(
            "script_action",
            mdiScriptTextOutline,
            "ui.dialogs.more_info_control.add_to.actions.script_action",
            this._handleAction
          ),
        ])
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

  private _renderActionList(items: TemplateResult[]) {
    return html`<ha-list>${items}</ha-list>`;
  }

  private _renderSceneSection() {
    if (!this._params?.entityIds.length) {
      return nothing;
    }

    const sceneAction = this._renderActionItem(
      undefined,
      mdiPalette,
      "ui.dialogs.more_info_control.add_to.actions.scene",
      this._handleCreateScene
    );

    return this._renderActionSection(
      "ui.panel.config.devices.scene.scenes_heading",
      this._renderActionList([sceneAction])
    );
  }

  private _renderActionItem(
    key: AddToActionKey | undefined,
    path: string,
    labelKey: LocalizeKeys,
    handler: (ev: Event) => void
  ) {
    return html`
      <ha-list-item
        graphic="icon"
        data-type=${key ?? nothing}
        @click=${handler}
        data-dialog="close"
      >
        <ha-svg-icon slot="graphic" .path=${path}></ha-svg-icon>
        ${this._i18n.localize(labelKey)}
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
