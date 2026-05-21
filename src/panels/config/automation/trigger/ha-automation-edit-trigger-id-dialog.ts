import { consume, type ContextType } from "@lit/context";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../../../common/array/ensure-array";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-footer";
import "../../../../components/input/ha-input";
import type { HaInput } from "../../../../components/input/ha-input";
import {
  automationConfigContext,
  type AutomationConfig,
  type Trigger,
} from "../../../../data/automation";
import { internationalizationContext } from "../../../../data/context";
import {
  getNextNumericTriggerId,
  getTriggerIds,
} from "../../../../data/trigger";
import { DialogMixin } from "../../../../dialogs/dialog-mixin";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { EditTriggerIdDialogParams } from "./show-edit-trigger-id";

@customElement("ha-automation-edit-trigger-id-dialog")
class HaAutomationEditTriggerIdDialog extends DialogMixin<EditTriggerIdDialogParams>(
  LitElement
) {
  @state() private _newId = "";

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  protected _i18n!: ContextType<typeof internationalizationContext>;

  @state() private _duplicateWarning = false;

  @consume({ context: automationConfigContext, subscribe: true })
  private _automationConfig?: AutomationConfig;

  connectedCallback() {
    super.connectedCallback();
    this._setInitialId();
  }

  private _setInitialId() {
    if (this.params?.id) {
      this._newId = this.params.id;
      return;
    }

    if (this._automationConfig?.triggers) {
      this._newId = getNextNumericTriggerId(
        ensureArray(this._automationConfig.triggers)
      );
    }
  }

  protected render() {
    if (!this.params) {
      return nothing;
    }

    const title = this._i18n.localize(
      `ui.panel.config.automation.editor.triggers.${
        this.params.id ? "edit_id" : "add_id"
      }`
    );

    return html`
      <ha-dialog open header-title=${title}>
        <ha-input
          autofocus
          .label=${this._i18n.localize(
            "ui.panel.config.automation.editor.triggers.id"
          )}
          .value=${this._newId}
          @input=${this._idChanged}
          @keydown=${this._handleKeyDown}
        ></ha-input>
        <ha-alert .alertType=${this._duplicateWarning ? "warning" : "info"}>
          ${this._i18n.localize(
            `ui.panel.config.automation.editor.triggers.${this._duplicateWarning ? "duplicate_id_warning" : "id_description"}`
          )}
        </ha-alert>
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this.closeDialog}
          >
            ${this._i18n.localize("ui.common.cancel")}
          </ha-button>
          <ha-button slot="primaryAction" @click=${this._save}>
            ${this._i18n.localize("ui.common.save")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _getTriggerIds = memoizeOne((triggers: Trigger | Trigger[]) =>
    getTriggerIds(ensureArray(triggers))
  );

  private _idChanged(ev: InputEvent) {
    const target = ev.target as HaInput;
    this._newId = target.value ?? "";

    if (this._automationConfig?.triggers) {
      const existingTriggerIds = this._getTriggerIds(
        this._automationConfig.triggers
      );
      this._duplicateWarning = existingTriggerIds.includes(this._newId);
    }
  }

  private _handleKeyDown(ev: KeyboardEvent) {
    if (ev.key === "Enter") {
      ev.preventDefault();
      this._save();
    }
  }

  private _save(): void {
    const trimmed = this._newId.trim();
    this.params!.onUpdate(trimmed || undefined);
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-input {
          width: 100%;
        }
        ha-alert {
          display: block;
          margin-top: var(--ha-space-6);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-edit-trigger-id-dialog": HaAutomationEditTriggerIdDialog;
  }
}
