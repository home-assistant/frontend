import "@material/mwc-button";

import { mdiClose, mdiHelpCircle } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-md-list-item";
import "../../../../components/ha-md-list";
import "../../../../components/ha-radio";
import "../../../../components/ha-textfield";
import "../../../../components/ha-dialog";
import "../../../../components/ha-select";
import "../../../../components/ha-list-item";

import type { AutomationConfigMaxExceeded } from "../../../../data/automation";
import {
  AUTOMATION_DEFAULT_MAX,
  AUTOMATION_DEFAULT_MODE,
  AUTOMATION_DEFAULT_MAX_EXCEEDED,
  automationConfigMaxExceededOptions,
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

  @state() private _opened = false;

  private _params!: AutomationModeDialog;

  @state() private _newMode: (typeof MODES)[number] = AUTOMATION_DEFAULT_MODE;

  @state() private _newMax?: number;

  @state() private _maxExceeded?: AutomationConfigMaxExceeded =
    AUTOMATION_DEFAULT_MAX_EXCEEDED;

  @state() private _newMaxExceeded?: AutomationConfigMaxExceeded;

  public showDialog(params: AutomationModeDialog): void {
    this._opened = true;
    this._params = params;
    this._newMode = params.config.mode || AUTOMATION_DEFAULT_MODE;
    this._newMax = isMaxMode(this._newMode)
      ? params.config.max || AUTOMATION_DEFAULT_MAX
      : undefined;
    this._maxExceeded =
      params.config.max_exceeded || AUTOMATION_DEFAULT_MAX_EXCEEDED;
  }

  public closeDialog() {
    this._params.onClose();

    if (this._opened) {
      fireEvent(this, "dialog-closed", { dialog: this.localName });
    }
    this._opened = false;
    return true;
  }

  protected render() {
    if (!this._opened) {
      return nothing;
    }

    const title = this.hass.localize(
      "ui.panel.config.automation.editor.change_mode"
    );

    return html`
      <ha-dialog
        open
        scrimClickAction
        @closed=${this.closeDialog}
        .heading=${title}
      >
        <ha-dialog-header slot="heading">
          <ha-icon-button
            slot="navigationIcon"
            dialogAction="cancel"
            .label=${this.hass.localize("ui.common.close")}
            .path=${mdiClose}
          ></ha-icon-button>
          <div slot="title">${title}</div>
          <a
            href=${documentationUrl(this.hass, "/docs/automation/modes/")}
            slot="actionItems"
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
        </ha-dialog-header>
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

        <div class="options">
          <ha-select
            .label=${this.hass.localize(
              "ui.panel.config.automation.editor.max_exceeded"
            )}
            .value=${this._maxExceeded}
            name="max_exceeded"
            @selected=${this._valueChanged}
            @closed=${stopPropagation}
            naturalMenuWidth
          >
            ${automationConfigMaxExceededOptions.map(
              (option) => html`
                <ha-list-item .value=${option}>${option}</ha-list-item>
              `
            )}
          </ha-select>
        </div>

        <mwc-button @click=${this.closeDialog} slot="secondaryAction">
          ${this.hass.localize("ui.common.cancel")}
        </mwc-button>
        <mwc-button @click=${this._save} slot="primaryAction">
          ${this.hass.localize("ui.panel.config.automation.editor.change_mode")}
        </mwc-button>
      </ha-dialog>
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
    } else if (target.name === "max_exceeded") {
      this._newMaxExceeded = target.value;
    }
  }

  private _save(): void {
    this._params.updateConfig({
      ...this._params.config,
      mode: this._newMode,
      max: this._newMax,
      max_exceeded: this._newMaxExceeded,
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
        ha-dialog {
          --dialog-content-padding: 0;
        }
        .options {
          padding: 0 24px 24px 24px;
        }
        ha-dialog-header a {
          color: inherit;
        }
        ha-select {
          width: 100%;
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
