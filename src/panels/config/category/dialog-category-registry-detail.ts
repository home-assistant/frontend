import { consume, type ContextType } from "@lit/context";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-dialog";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-icon-picker";
import "../../../components/input/ha-input";
import type { HaInput } from "../../../components/input/ha-input";
import type {
  CategoryRegistryEntry,
  CategoryRegistryEntryMutableParams,
} from "../../../data/category_registry";
import { internationalizationContext } from "../../../data/context";
import { DialogMixin } from "../../../dialogs/dialog-mixin";
import { DirtyStateProviderMixin } from "../../../mixins/dirty-state-provider-mixin";
import { haStyleDialog } from "../../../resources/styles";
import type { ValueChangedEvent } from "../../../types";
import type { CategoryRegistryDetailDialogParams } from "./show-dialog-category-registry-detail";

interface CategoryFormState {
  name: string;
  icon: string | null;
}

@customElement("dialog-category-registry-detail")
class DialogCategoryDetail extends DirtyStateProviderMixin<CategoryFormState>()(
  DialogMixin<CategoryRegistryDetailDialogParams>(LitElement)
) {
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state() private _name!: string;

  @state() private _icon!: string | null;

  @state() private _error?: string;

  @state() private _submitting?: boolean;

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.params?.entry) {
      this._name = this.params.entry.name || "";
      this._icon = this.params.entry.icon || null;
    } else {
      this._name = this.params?.suggestedName || "";
      this._icon = null;
    }
    this._initDirtyTracking(
      { type: "shallow" },
      { name: this._name, icon: this._icon }
    );
  }

  protected render() {
    if (!this.params) {
      return nothing;
    }
    const entry = this.params.entry;
    const nameInvalid = !this._isNameValid();
    const isCreate = !entry;
    return html`
      <ha-dialog
        open
        header-title=${
          entry
            ? this._i18n.localize("ui.panel.config.category.editor.edit")
            : this._i18n.localize("ui.panel.config.category.editor.create")
        }
        .preventScrimClose=${this.isDirtyState}
      >
        ${
          this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : ""
        }
        <div class="form">
          <ha-input
            .value=${this._name}
            @input=${this._nameChanged}
            .label=${this._i18n.localize(
              "ui.panel.config.category.editor.name"
            )}
            .validationMessage=${this._i18n.localize(
              "ui.panel.config.category.editor.required_error_msg"
            )}
            required
            autofocus
          ></ha-input>

          <ha-icon-picker
            .value=${this._icon ?? undefined}
            @value-changed=${this._iconChanged}
            .label=${this._i18n.localize(
              "ui.panel.config.category.editor.icon"
            )}
          ></ha-icon-picker>
        </div>
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this.closeDialog}
          >
            ${this._i18n.localize("ui.common.cancel")}
          </ha-button>
          <ha-button
            slot="primaryAction"
            @click=${this._updateEntry}
            .disabled=${
              nameInvalid ||
              !!this._submitting ||
              (!isCreate && !this.isDirtyState)
            }
          >
            ${
              entry
                ? this._i18n.localize("ui.common.save")
                : this._i18n.localize("ui.common.add")
            }
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _isNameValid() {
    return this._name.trim() !== "";
  }

  private _nameChanged(ev: InputEvent) {
    this._error = undefined;
    this._name = (ev.target as HaInput).value ?? "";
    this._updateDirtyState({ name: this._name, icon: this._icon });
  }

  private _iconChanged(ev: ValueChangedEvent<string>) {
    this._error = undefined;
    this._icon = ev.detail.value;
    this._updateDirtyState({ name: this._name, icon: this._icon });
  }

  private async _updateEntry() {
    const create = !this.params?.entry;
    this._submitting = true;
    let newValue: CategoryRegistryEntry | undefined;
    try {
      const values: CategoryRegistryEntryMutableParams = {
        name: this._name.trim(),
        icon: this._icon || (create ? undefined : null),
      };
      if (create) {
        newValue = await this.params?.createEntry?.(values);
      } else {
        newValue = await this.params?.updateEntry?.(values);
      }
      this._markDirtyStateClean();
      this.closeDialog();
    } catch (err: any) {
      this._error =
        err.message ||
        this._i18n.localize("ui.panel.config.category.editor.unknown_error");
    } finally {
      this._submitting = false;
    }
    return newValue;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-icon-picker {
          margin-bottom: var(--ha-space-3);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-category-registry-detail": DialogCategoryDetail;
  }
}
