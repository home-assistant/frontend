import "@home-assistant/webawesome/dist/components/divider/divider";
import { mdiHelpCircleOutline, mdiStarFourPoints } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-select-box";
import "../../../../components/ha-svg-icon";
import "../../../../components/input/ha-input";

import type { HaInput } from "../../../../components/input/ha-input";
import {
  AUTOMATION_DEFAULT_MAX,
  AUTOMATION_DEFAULT_MODE,
} from "../../../../data/automation";
import { MODES, isMaxMode } from "../../../../data/script";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { DirtyStateProviderMixin } from "../../../../mixins/dirty-state-provider-mixin";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { documentationUrl } from "../../../../util/documentation-url";
import type { AutomationModeDialog } from "./show-dialog-automation-mode";

interface AutomationModeState {
  mode: (typeof MODES)[number];
  max?: number;
}

@customElement("ha-dialog-automation-mode")
class DialogAutomationMode
  extends DirtyStateProviderMixin<AutomationModeState>()(LitElement)
  implements HassDialog
{
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
    this._initDirtyTracking(
      { type: "shallow" },
      { mode: this._newMode, max: this._newMax }
    );
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
    const previous = this._params.previousConfig;

    return html`
      <ha-dialog
        .open=${this._open}
        header-title=${title}
        .preventScrimClose=${this.isDirtyState}
        @closed=${this._dialogClosed}
      >
        <ha-icon-button
          .label=${this.hass.localize(
            "ui.panel.config.automation.editor.modes.learn_more"
          )}
          .path=${mdiHelpCircleOutline}
          href=${documentationUrl(this.hass, "/docs/automation/modes/")}
          slot="headerActionItems"
          target="_blank"
          rel="noopener noreferrer"
        ></ha-icon-button>
        ${previous ? this._renderChanges(previous) : nothing}
        <ha-select-box
          .disabled=${!!previous}
          .options=${MODES.map((mode) => ({
            label: this.hass.localize(
              `ui.panel.config.automation.editor.modes.${mode}`
            ),
            description: this.hass.localize(
              `ui.panel.config.automation.editor.modes.${mode}_description`
            ),
            value: mode,
          }))}
          .value=${this._newMode}
          @value-changed=${this._modeChanged}
          .maxColumns=${1}
        ></ha-select-box>

        ${
          isMaxMode(this._newMode)
            ? html`
                <div class="max-value">
                  <wa-divider></wa-divider>
                  <ha-input
                    .label=${this.hass.localize(
                      `ui.panel.config.automation.editor.max.${this._newMode}`
                    )}
                    type="number"
                    name="max"
                    .value=${this._newMax?.toString() ?? ""}
                    .disabled=${!!previous}
                    @input=${this._valueChanged}
                  >
                  </ha-input>
                </div>
              `
            : nothing
        }

        <ha-dialog-footer slot="footer">
          ${
            previous
              ? html`<ha-button slot="primaryAction" @click=${this.closeDialog}>
                  ${this.hass.localize("ui.common.close")}
                </ha-button>`
              : html`<ha-button
                    slot="secondaryAction"
                    appearance="plain"
                    @click=${this.closeDialog}
                  >
                    ${this.hass.localize("ui.common.cancel")}
                  </ha-button>
                  <ha-button
                    slot="primaryAction"
                    @click=${this._save}
                    .disabled=${!this.isDirtyState}
                  >
                    ${this.hass.localize(
                      "ui.panel.config.automation.editor.change_mode"
                    )}
                  </ha-button>`
          }
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _renderChanges(
    previous: NonNullable<AutomationModeDialog["previousConfig"]>
  ) {
    const oldMode = previous.mode || AUTOMATION_DEFAULT_MODE;
    const oldMax = isMaxMode(oldMode)
      ? previous.max || AUTOMATION_DEFAULT_MAX
      : undefined;
    const modeLabel = (mode: (typeof MODES)[number]) =>
      this.hass.localize(`ui.panel.config.automation.editor.modes.${mode}`);
    const changes = [
      ...(oldMode !== this._newMode
        ? [
            this.hass.localize(
              "ui.panel.config.automation.editor.ai.changes.value_changed",
              {
                name: this.hass.localize(
                  "ui.panel.config.automation.editor.modes.label"
                ),
                old: modeLabel(oldMode),
                new: modeLabel(this._newMode),
              }
            ),
          ]
        : []),
      ...(isMaxMode(this._newMode) && oldMax !== this._newMax
        ? [
            this.hass.localize(
              "ui.panel.config.automation.editor.ai.changes.value_changed",
              {
                name: this.hass.localize(
                  `ui.panel.config.automation.editor.max.${this._newMode}`
                ),
                old: oldMax ?? "—",
                new: this._newMax ?? "—",
              }
            ),
          ]
        : []),
    ];
    if (!changes.length) {
      return nothing;
    }
    return html`<ha-alert
      alert-type="warning"
      .title=${this.hass.localize(
        "ui.panel.config.automation.editor.ai.changes.title"
      )}
    >
      <ha-svg-icon slot="icon" .path=${mdiStarFourPoints}></ha-svg-icon>
      <ul>
        ${changes.map((change) => html`<li>${change}</li>`)}
      </ul>
    </ha-alert>`;
  }

  private _modeChanged(ev) {
    const mode = ev.detail.value;
    this._newMode = mode;
    if (!isMaxMode(mode)) {
      this._newMax = undefined;
    } else if (!this._newMax) {
      this._newMax = AUTOMATION_DEFAULT_MAX;
    }
    this._updateDirtyState({ mode: this._newMode, max: this._newMax });
  }

  private _valueChanged(ev: InputEvent) {
    ev.stopPropagation();
    const target = ev.target as HaInput;
    if (target.name === "max") {
      this._newMax = Number(target.value);
      this._updateDirtyState({ mode: this._newMode, max: this._newMax });
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
        .max-value {
          margin-top: var(--ha-space-3);
        }
        ha-alert {
          display: block;
          margin-bottom: var(--ha-space-4);
        }
        ha-alert ul {
          margin: 0;
          padding-inline-start: var(--ha-space-5);
        }
        ha-wa-dialog ha-icon-button[slot="headerActionItems"] {
          color: var(--secondary-text-color);
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
