import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-button";
import "../../../components/ha-dialog";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-expansion-panel";
import "../../../components/ha-icon";
import type { SecurityFrontendSystemData } from "../../../data/frontend";
import type { HassDialog } from "../../../dialogs/make-dialog-manager";
import { DirtyStateProviderMixin } from "../../../mixins/dirty-state-provider-mixin";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant, ValueChangedEvent } from "../../../types";
import "../components/security-alerts-editor";
import type { EditSecurityDialogParams } from "./show-dialog-edit-security";

@customElement("dialog-edit-security")
export class DialogEditSecurity
  extends DirtyStateProviderMixin<SecurityFrontendSystemData>()(LitElement)
  implements HassDialog<EditSecurityDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: EditSecurityDialogParams;

  @state() private _state?: SecurityFrontendSystemData;

  @state() private _open = false;

  @state() private _submitting = false;

  public showDialog(params: EditSecurityDialogParams): void {
    this._params = params;
    this._state = {
      ...params.config,
      alert_entities: params.config.alert_entities
        ? [...params.config.alert_entities]
        : [],
    };
    this._initDirtyTracking({ type: "shallow" }, this._state);
    this._open = true;
  }

  public closeDialog(): boolean {
    this._open = false;
    return true;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    this._state = undefined;
    this._submitting = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params || !this._state) {
      return nothing;
    }

    return html`
      <ha-dialog
        .open=${this._open}
        width="medium"
        .headerTitle=${this.hass.localize("ui.panel.security.editor.title")}
        .headerSubtitle=${this.hass.localize(
          "ui.panel.security.editor.description"
        )}
        .preventScrimClose=${this.isDirtyState}
        @closed=${this._dialogClosed}
      >
        ${this._renderMainEditor()}

        <ha-dialog-footer slot="footer">
          <ha-button
            appearance="plain"
            slot="secondaryAction"
            @click=${this.closeDialog}
            .disabled=${this._submitting}
          >
            ${this.hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-button
            slot="primaryAction"
            @click=${this._save}
            .disabled=${this._submitting || !this.isDirtyState}
          >
            ${this.hass.localize("ui.common.save")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _renderMainEditor() {
    return html`
      <ha-expansion-panel
        outlined
        expanded
        no-collapse
        .header=${this.hass.localize(
          "ui.panel.security.editor.active_alert_entities"
        )}
        .secondary=${this.hass.localize(
          "ui.panel.security.editor.active_alert_entities_description"
        )}
      >
        <ha-icon slot="leading-icon" icon="mdi:shield-alert"></ha-icon>
        <div class="expansion-content">
          <security-alerts-editor
            .hass=${this.hass}
            .alertEntities=${this._state?.alert_entities ?? []}
            @value-changed=${this._alertEntitiesChanged}
          ></security-alerts-editor>
        </div>
      </ha-expansion-panel>
    `;
  }

  private _alertEntitiesChanged(
    ev: ValueChangedEvent<SecurityFrontendSystemData["alert_entities"]>
  ): void {
    this._state = {
      ...this._state,
      alert_entities: ev.detail.value,
    };
    this._updateDirtyState(this._state);
  }

  private async _save(): Promise<void> {
    if (!this._params || !this._state) return;

    this._submitting = true;

    try {
      await this._params.saveConfig({
        ...this._params.config,
        alert_entities: this._state.alert_entities?.length
          ? this._state.alert_entities
          : undefined,
      });
      this._markDirtyStateClean();
      this.closeDialog();
    } catch {
      return;
    } finally {
      this._submitting = false;
    }
  }

  static styles = [
    haStyleDialog,
    css`
      ha-dialog {
        --dialog-content-padding: var(--ha-space-6);
      }

      ha-expansion-panel {
        display: block;
        --expansion-panel-content-padding: 0;
        border-radius: var(--ha-border-radius-md);
        --ha-card-border-radius: var(--ha-border-radius-md);
      }

      .expansion-content {
        padding: var(--ha-space-3);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-edit-security": DialogEditSecurity;
  }
}
