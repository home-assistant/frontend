import { mdiHelpCircle } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-wa-dialog";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-md-list-item";
import "../../../../components/ha-md-list";
import "../../../../components/ha-radio";
import "../../../../components/ha-button";
import "../../../../components/ha-textfield";

import {
  AUTOMATION_DEFAULT_MAX,
  AUTOMATION_DEFAULT_MODE,
} from "../../../../data/automation";
import { MODES, isMaxMode } from "../../../../data/script";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { documentationUrl } from "../../../../util/documentation-url";
import type { AutomationModeDialog } from "./show-dialog-automation-mode";

@customElement("ha-dialog-automation-mode")
class DialogAutomationMode extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _open = false;

  @state() private _params?: AutomationModeDialog;

  @state() private _newMode: (typeof MODES)[number] = AUTOMATION_DEFAULT_MODE;

  @state() private _newMax?: number;

  public showDialog(params: AutomationModeDialog): void {
    this._open = true;
    this._params = params;
    this._newMode = params.config.mode || AUTOMATION_DEFAULT_MODE;
    this._newMax = isMaxMode(this._newMode)
      ? params.config.max || AUTOMATION_DEFAULT_MAX
      : undefined;
  }

  public closeDialog(): boolean {
    this._open = false;
    return true;
  }

  private _dialogClosed() {
    if (this._params?.onClose) {
      this._params.onClose();
    }
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const title = this.hass.localize(
      "ui.panel.config.automation.editor.change_mode"
    );

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        header-title=${title}
        @closed=${this._dialogClosed}
      >
        <a
          href=${documentationUrl(this.hass, "/docs/automation/modes/")}
          slot="headerActionItems"
          target="_blank"
          rel="noopener noreferer"
        >
          <ha-icon-button
            .label=${this.hass.localize(
              "ui.panel.config.automation.editor.modes.learn_more"
            )}
            .path=${mdiHelpCircle}
          ></ha-icon-button>
        </a>
        <ha-md-list
          role="listbox"
          tabindex="0"
          aria-activedescendant="option-${this._newMode}"
          aria-label=${this.hass.localize(
            "ui.panel.config.automation.editor.modes.label"
          )}
        >
          ${MODES.map((mode) => {
            const label = this.hass.localize(
              `ui.panel.config.automation.editor.modes.${mode}`
            );
            return html`
              <ha-md-list-item
                class="option"
                type="button"
                @click=${this._modeChanged}
                .value=${mode}
                id="option-${mode}"
                role="option"
                aria-label=${label}
                aria-selected=${this._newMode === mode}
              >
                <div slot="start">
                  <ha-radio
                    inert
                    .checked=${this._newMode === mode}
                    value=${mode}
                    @change=${this._modeChanged}
                    name="mode"
                  ></ha-radio>
                </div>
                <div slot="headline">
                  ${this.hass.localize(
                    `ui.panel.config.automation.editor.modes.${mode}`
                  )}
                </div>
                <div slot="supporting-text">
                  ${this.hass.localize(
                    `ui.panel.config.automation.editor.modes.${mode}_description`
                  )}
                </div>
              </ha-md-list-item>
            `;
          })}
        </ha-md-list>

        ${isMaxMode(this._newMode)
          ? html`
              <div class="options">
                <ha-textfield
                  .label=${this.hass.localize(
                    `ui.panel.config.automation.editor.max.${this._newMode}`
                  )}
                  type="number"
                  name="max"
                  .value=${this._newMax?.toString() ?? ""}
                  @input=${this._valueChanged}
                  class="max"
                >
                </ha-textfield>
              </div>
            `
          : nothing}

        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this.closeDialog}
          >
            ${this.hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-button slot="primaryAction" @click=${this._save}>
            ${this.hass.localize(
              "ui.panel.config.automation.editor.change_mode"
            )}
          </ha-button>
        </ha-dialog-footer>
      </ha-wa-dialog>
    `;
  }

  private _modeChanged(ev) {
    const mode = ev.currentTarget.value;
    this._newMode = mode;
    if (!isMaxMode(mode)) {
      this._newMax = undefined;
    } else if (!this._newMax) {
      this._newMax = AUTOMATION_DEFAULT_MAX;
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
    if (!this._params) {
      return;
    }
    this._params.updateConfig({
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
        ha-textfield {
          display: block;
        }
        ha-wa-dialog {
          --dialog-content-padding: 0;
        }
        .options {
          padding: 0 24px 24px 24px;
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
