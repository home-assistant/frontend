import { consume, type ContextType } from "@lit/context";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import "../../../components/ha-button";
import "../../../components/ha-dialog";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-expansion-panel";
import "../../../components/ha-icon";
import type { SecurityFrontendSystemData } from "../../../data/frontend";
import { internationalizationContext } from "../../../data/context";
import { DialogMixin } from "../../../dialogs/dialog-mixin";
import { DirtyStateProviderMixin } from "../../../mixins/dirty-state-provider-mixin";
import { haStyleDialog } from "../../../resources/styles";
import type { ValueChangedEvent } from "../../../types";
import "../components/security-alerts-editor";
import type { EditSecurityDialogParams } from "./show-dialog-edit-security";

@customElement("dialog-edit-security")
export class DialogEditSecurity extends DirtyStateProviderMixin<SecurityFrontendSystemData>()(
  DialogMixin<EditSecurityDialogParams>(LitElement)
) {
  @state() private _state?: SecurityFrontendSystemData;

  @state() private _submitting = false;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  public connectedCallback(): void {
    super.connectedCallback();
    if (!this.params) {
      return;
    }
    this._state = {
      ...this.params.config,
      alert_entities: this.params.config.alert_entities
        ? [...this.params.config.alert_entities]
        : [],
    };
    this._initDirtyTracking({ type: "deep" }, this._state);
  }

  protected render() {
    if (!this.params || !this._state) {
      return nothing;
    }
    return html`
      <ha-dialog
        open
        width="medium"
        .headerTitle=${this._i18n.localize("ui.panel.security.editor.title")}
        .headerSubtitle=${this._i18n.localize(
          "ui.panel.security.editor.description"
        )}
        .preventScrimClose=${this.isDirtyState}
      >
        ${this._renderMainEditor()}

        <ha-dialog-footer slot="footer">
          <ha-button
            autofocus
            appearance="plain"
            slot="secondaryAction"
            @click=${this.closeDialog}
            .disabled=${this._submitting}
          >
            ${this._i18n.localize("ui.common.cancel")}
          </ha-button>
          <ha-button
            slot="primaryAction"
            @click=${this._save}
            .disabled=${this._submitting || !this.isDirtyState}
          >
            ${this._i18n.localize("ui.common.save")}
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
        .header=${this._i18n.localize(
          "ui.panel.security.editor.active_alert_entities"
        )}
        .secondary=${this._i18n.localize(
          "ui.panel.security.editor.active_alert_entities_description"
        )}
      >
        <ha-icon slot="leading-icon" icon="mdi:shield-alert-outline"></ha-icon>
        <div class="expansion-content">
          <security-alerts-editor
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
    if (!this.params || !this._state) return;

    this._submitting = true;

    try {
      await this.params.saveConfig({
        ...this.params.config,
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
