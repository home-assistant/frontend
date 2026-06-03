import { mdiPencil } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-selector/ha-selector-boolean";
import type {
  ActionConfig,
  ConfirmationRestrictionConfig,
} from "../../../../data/lovelace/config/action";
import type { HomeAssistant } from "../../../../types";

@customElement("hui-action-confirmation-toggle")
export class HuiActionConfirmationToggle extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config?: ActionConfig;

  @property() public label?: string;

  protected render() {
    if (!this.hass || !this.config?.action || this.config.action === "none") {
      return nothing;
    }

    return html`
      <div class="confirmation-row">
        <ha-selector-boolean
          .label=${this.hass.localize(
            "ui.panel.lovelace.editor.action-editor.confirmation.enable"
          )}
          .value=${!!this.config.confirmation}
          @value-changed=${this._toggleConfirmation}
        ></ha-selector-boolean>
        <ha-icon-button
          .path=${mdiPencil}
          .disabled=${!this.config.confirmation}
          .label=${this.hass.localize(
            "ui.panel.lovelace.editor.action-editor.confirmation.edit"
          )}
          @click=${this._editConfirmation}
        ></ha-icon-button>
      </div>
    `;
  }

  private _toggleConfirmation(ev: CustomEvent): void {
    ev.stopPropagation();
    const enabled = ev.detail.value as boolean;
    if (enabled) {
      const existing = this.config!.confirmation;
      fireEvent(this, "value-changed", {
        value: {
          ...this.config!,
          confirmation:
            existing && typeof existing === "object" ? existing : {},
        },
      });
    } else {
      const { confirmation: _removed, ...rest } = this
        .config as ActionConfig & {
        confirmation?: ConfirmationRestrictionConfig | boolean;
      };
      fireEvent(this, "value-changed", { value: rest });
    }
  }

  private _editConfirmation(): void {
    if (!this.config?.confirmation) {
      return;
    }
    const confirmation =
      typeof this.config.confirmation === "object"
        ? this.config.confirmation
        : {};
    fireEvent(this, "edit-sub-element", {
      type: "confirmation",
      config: confirmation,
      context: { label: this.label, actionConfig: this.config },
      saveConfig: (newConfirmation: ConfirmationRestrictionConfig) => {
        fireEvent(this, "value-changed", {
          value: { ...this.config!, confirmation: newConfirmation },
        });
      },
    });
  }

  static styles = css`
    .confirmation-row {
      display: flex;
      align-items: center;
      margin-top: 8px;
    }
    ha-selector-boolean {
      flex-grow: 1;
    }
    ha-icon-button {
      --ha-icon-button-size: var(--ha-space-9);
      color: var(--secondary-text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-action-confirmation-toggle": HuiActionConfirmationToggle;
  }
}
