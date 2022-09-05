import "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { createCloseHeading } from "../../../../components/ha-dialog";
import "../../../../components/ha-textfield";
import "../../../../components/ha-select";
import { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type { AutomationModeDialog } from "./show-dialog-automation-mode";
import { AUTOMATION_DEFAULT_MODE } from "../../../../data/automation";
import { documentationUrl } from "../../../../util/documentation-url";
import { isMaxMode, MODES } from "../../../../data/script";
import "@material/mwc-list/mwc-list-item";
import { stopPropagation } from "../../../../common/dom/stop_propagation";

@customElement("ha-dialog-automation-mode")
class DialogAutomationMode extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _opened = false;

  private _params!: AutomationModeDialog;

  @state() private _newMode?: typeof MODES[number];

  @state() private _newMax?: number;

  public showDialog(params: AutomationModeDialog): void {
    this._opened = true;
    this._params = params;
    this._newMode = params.config.mode || AUTOMATION_DEFAULT_MODE;
    this._newMax = params.config.max;
  }

  public closeDialog(): void {
    this._params.onClose();

    if (this._opened) {
      fireEvent(this, "dialog-closed", { dialog: this.localName });
    }
    this._opened = false;
  }

  protected render(): TemplateResult {
    if (!this._opened) {
      return html``;
    }

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize("ui.panel.config.automation.editor.change_mode")
        )}
      >
        <ha-select
          .label=${this.hass.localize(
            "ui.panel.config.automation.editor.modes.label"
          )}
          .value=${this._newMode}
          @selected=${this._modeChanged}
          @closed=${stopPropagation}
          fixedMenuPosition
          .helper=${html`
            <a
              style="color: var(--secondary-text-color)"
              href=${documentationUrl(this.hass, "/docs/automation/modes/")}
              target="_blank"
              rel="noreferrer"
              >${this.hass.localize(
                "ui.panel.config.automation.editor.modes.learn_more"
              )}</a
            >
          `}
        >
          ${MODES.map(
            (mode) => html`
              <mwc-list-item .value=${mode}>
                ${this.hass.localize(
                  `ui.panel.config.automation.editor.modes.${mode}`
                ) || mode}
              </mwc-list-item>
            `
          )}
        </ha-select>
        ${this._newMode && isMaxMode(this._newMode)
          ? html`
              <br /><ha-textfield
                .label=${this.hass.localize(
                  `ui.panel.config.automation.editor.max.${this._newMode}`
                )}
                type="number"
                name="max"
                .value=${this._newMax || "10"}
                @change=${this._valueChanged}
                class="max"
              >
              </ha-textfield>
            `
          : html``}

        <mwc-button @click=${this.closeDialog} slot="secondaryAction">
          ${this.hass.localize("ui.dialogs.generic.cancel")}
        </mwc-button>
        <mwc-button @click=${this._save} slot="primaryAction">
          ${this.hass.localize("ui.panel.config.automation.editor.change_mode")}
        </mwc-button>
      </ha-dialog>
    `;
  }

  private _modeChanged(ev) {
    const mode = ev.target.value;
    this._newMode = mode;
    if (!isMaxMode(mode)) {
      this._newMax = undefined;
    }
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const target = ev.target as any;
    if (target.name === "max") {
      this._newMax = Number(target.value);
    }
  }

  private _save(): void {
    this._params.updateAutomation({
      ...this._params.config,
      mode: this._newMode,
      max: this._newMax,
    });
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-textfield,
        ha-textarea {
          display: block;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-automation-mode": DialogAutomationMode;
  }
}
