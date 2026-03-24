import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-button";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-dialog";
import "../../../components/ha-form/ha-form";
import type { HaFormSchema } from "../../../components/ha-form/types";
import type { MaintenanceFrontendSystemData } from "../../../data/frontend";
import type { HassDialog } from "../../../dialogs/make-dialog-manager";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { DEFAULT_BATTERY_ATTENTION_THRESHOLD } from "../maintenance-battery-data";
import type { EditMaintenanceDialogParams } from "./show-dialog-edit-maintenance";

const THRESHOLD_SCHEMA = [
  {
    name: "battery_attention_threshold",
    selector: {
      number: {
        min: 0,
        max: 100,
        mode: "slider",
        slider_ticks: true,
      },
    },
  },
] as const satisfies HaFormSchema[];

@customElement("dialog-edit-maintenance")
export class DialogEditMaintenance
  extends LitElement
  implements HassDialog<EditMaintenanceDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: EditMaintenanceDialogParams;

  @state() private _config?: MaintenanceFrontendSystemData;

  @state() private _open = false;

  @state() private _submitting = false;

  public showDialog(params: EditMaintenanceDialogParams): void {
    this._params = params;
    this._config = { ...params.config };
    this._open = true;
  }

  public closeDialog(): boolean {
    this._open = false;
    return true;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    this._config = undefined;
    this._submitting = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    return html`
      <ha-dialog
        .hass=${this.hass}
        .open=${this._open}
        .headerTitle=${this.hass.localize("ui.panel.maintenance.editor.title")}
        prevent-scrim-close
        @closed=${this._dialogClosed}
      >
        <p class="description">
          ${this.hass.localize("ui.panel.maintenance.editor.description")}
        </p>

        <ha-form
          autofocus
          .hass=${this.hass}
          .data=${{
            battery_attention_threshold:
              this._config?.battery_attention_threshold ??
              DEFAULT_BATTERY_ATTENTION_THRESHOLD,
          }}
          .schema=${THRESHOLD_SCHEMA}
          .computeLabel=${this._computeLabel}
          .computeHelper=${this._computeHelper}
          @value-changed=${this._valueChanged}
        ></ha-form>

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
            .disabled=${this._submitting}
          >
            ${this.hass.localize("ui.common.save")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    const threshold = ev.detail.value.battery_attention_threshold as number;

    this._config = {
      battery_attention_threshold:
        threshold === DEFAULT_BATTERY_ATTENTION_THRESHOLD
          ? undefined
          : threshold,
    };
  }

  private _computeLabel = (schema: HaFormSchema) =>
    schema.name === "battery_attention_threshold"
      ? this.hass.localize(
          "ui.panel.maintenance.editor.battery_attention_threshold"
        )
      : "";

  private _computeHelper = (schema: HaFormSchema) =>
    schema.name === "battery_attention_threshold"
      ? this.hass.localize(
          "ui.panel.maintenance.editor.battery_attention_threshold_helper"
        )
      : "";

  private async _save(): Promise<void> {
    if (!this._params || !this._config) {
      return;
    }

    this._submitting = true;

    try {
      await this._params.saveConfig(this._config);
      this.closeDialog();
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

      .description {
        margin: 0 0 var(--ha-space-4) 0;
        color: var(--secondary-text-color);
      }

      ha-form {
        display: block;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-edit-maintenance": DialogEditMaintenance;
  }
}
