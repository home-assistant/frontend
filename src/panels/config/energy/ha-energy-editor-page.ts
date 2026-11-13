import { mdiDelete, mdiDotsVertical } from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { keyed } from "lit/directives/keyed";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { goBack, navigate } from "../../../common/navigate";
import { afterNextRender } from "../../../common/util/render-status";
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-dropdown";
import type { HaDropdownSelectEvent } from "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-subpage";
import { PreventUnsavedMixin } from "../../../mixins/prevent-unsaved-mixin";
import type { HomeAssistant } from "../../../types";
import type {
  EnergyEditorConfig,
  EnergyEditorElement,
  EnergyEditorStatus,
} from "./editors/energy-editor";
import { renderEnergyEditor } from "./editors/render-energy-editor";

export interface EnergyEditorPageConfig {
  editor: EnergyEditorConfig;
  title: string;
  /** Resolves to whether the item was deleted */
  delete?: { label: string; action: () => Promise<boolean> };
}

@customElement("ha-energy-editor-page")
export class HaEnergyEditorPage extends PreventUnsavedMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  /** The list the page returns to */
  @property({ attribute: false }) public backPath!: string;

  /** Undefined when the item doesn't exist */
  @property({ attribute: false }) public config?: EnergyEditorPageConfig;

  @state() private _status?: EnergyEditorStatus;

  @state() private _deleting = false;

  @query(".energy-editor") private _editor?: EnergyEditorElement;

  public isDirtyState = false;

  protected updated(changedProps: PropertyValues<this>) {
    super.updated(changedProps);
    // The item is gone or the link was wrong
    if (!this.config) {
      navigate(this.backPath, { replace: true });
    }
  }

  protected render() {
    if (!this.config) {
      return nothing;
    }

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.config.title}
        .backPath=${this.backPath}
        .backCallback=${this._backTapped}
      >
        ${
          this.config.delete
            ? html`
                <ha-dropdown
                  slot="toolbar-icon"
                  @wa-select=${this._handleMenuAction}
                >
                  <ha-icon-button
                    slot="trigger"
                    .label=${this.hass.localize("ui.common.menu")}
                    .path=${mdiDotsVertical}
                  ></ha-icon-button>
                  <ha-dropdown-item
                    value="delete"
                    variant="danger"
                    .disabled=${!!this._status?.saving || this._deleting}
                  >
                    <ha-svg-icon slot="icon" .path=${mdiDelete}></ha-svg-icon>
                    ${this.config.delete.label}
                  </ha-dropdown-item>
                </ha-dropdown>
              `
            : nothing
        }
        <div class="content">
          <!-- The list around the page saves the preferences on its own value-changed -->
          <ha-card
            @energy-editor-status-changed=${this._statusChanged}
            @value-changed=${stopPropagation}
          >
            <div class="card-content">
              ${keyed(this.config, renderEnergyEditor(this.config.editor))}
            </div>
            <div class="card-actions">
              <ha-button
                appearance="filled"
                .disabled=${
                  !this._status?.dirty ||
                  !this._status.valid ||
                  this._status.saving ||
                  this._deleting
                }
                .loading=${!!this._status?.saving}
                @click=${this._save}
              >
                ${this.hass.localize("ui.common.save")}
              </ha-button>
            </div>
          </ha-card>
        </div>
      </hass-subpage>
    `;
  }

  private _statusChanged(
    ev: HASSDomEvent<HASSDomEvents["energy-editor-status-changed"]>
  ) {
    this._status = ev.detail;
    this.isDirtyState = ev.detail.dirty;
  }

  private async _save() {
    if (await this._editor?.save()) {
      this._leave();
    }
  }

  private async _handleMenuAction(ev: HaDropdownSelectEvent) {
    if (ev.detail?.item?.value !== "delete" || !this.config?.delete) {
      return;
    }
    // Saving and deleting both write all preferences, so they never overlap
    this._deleting = true;
    try {
      if (await this.config.delete.action()) {
        this._leave();
      }
    } finally {
      this._deleting = false;
    }
  }

  private _leave() {
    // The user can leave while a save or delete runs
    if (!this.isConnected) {
      return;
    }
    this.isDirtyState = false;
    goBack(this.backPath);
  }

  private _backTapped = async () => {
    if (await this._confirmDiscard()) {
      afterNextRender(() => goBack(this.backPath));
    }
  };

  private async _confirmDiscard(addHistory = true): Promise<boolean> {
    if (!this._status?.dirty) {
      return true;
    }
    return showConfirmationDialog(this, {
      addHistory,
      title: this.hass.localize("ui.panel.config.energy.unsaved_confirm_title"),
      text: this.hass.localize("ui.panel.config.energy.unsaved_confirm_text"),
      confirmText: this.hass.localize("ui.common.leave"),
      dismissText: this.hass.localize("ui.common.stay"),
      destructive: true,
    });
  }

  protected async promptDiscardChanges(): Promise<boolean> {
    return this._confirmDiscard(false);
  }

  static styles = css`
    :host {
      display: block;
      height: 100%;
    }
    .content {
      padding: var(--ha-space-7) var(--ha-space-5) 0;
    }
    ha-card {
      max-width: 600px;
      margin: 0 auto var(--ha-space-6);
    }
    .card-actions {
      display: flex;
      justify-content: flex-end;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-energy-editor-page": HaEnergyEditorPage;
  }
}
