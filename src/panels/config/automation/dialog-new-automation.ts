import "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { fireEvent } from "../../../common/dom/fire_event";
import { nextRender } from "../../../common/util/render-status";
import "../../../components/ha-blueprint-picker";
import "../../../components/ha-card";
import "../../../components/ha-circular-progress";
import { createCloseHeading } from "../../../components/ha-dialog";
import {
  AutomationConfig,
  showAutomationEditor,
} from "../../../data/automation";
import {
  HassDialog,
  replaceDialog,
} from "../../../dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { showThingtalkDialog } from "./thingtalk/show-dialog-thingtalk";

@customElement("ha-dialog-new-automation")
class DialogNewAutomation extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _opened = false;

  public showDialog(): void {
    this._opened = true;
  }

  public closeDialog(): void {
    this._opened = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
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
          this.hass.localize("ui.panel.config.automation.dialog_new.header")
        )}
      >
        <div>
          ${this.hass.localize("ui.panel.config.automation.dialog_new.how")}
          <div class="container">
            ${isComponentLoaded(this.hass, "cloud")
              ? html`<ha-card outlined>
                  <div>
                    <h3>
                      ${this.hass.localize(
                        "ui.panel.config.automation.dialog_new.thingtalk.header"
                      )}
                    </h3>
                    ${this.hass.localize(
                      "ui.panel.config.automation.dialog_new.thingtalk.intro"
                    )}
                    <div class="side-by-side">
                      <paper-input
                        id="input"
                        .label=${this.hass.localize(
                          "ui.panel.config.automation.dialog_new.thingtalk.input_label"
                        )}
                      ></paper-input>
                      <mwc-button @click=${this._thingTalk}
                        >${this.hass.localize(
                          "ui.panel.config.automation.dialog_new.thingtalk.create"
                        )}</mwc-button
                      >
                    </div>
                  </div>
                </ha-card>`
              : html``}
            ${isComponentLoaded(this.hass, "blueprint")
              ? html`<ha-card outlined>
                  <div>
                    <h3>
                      ${this.hass.localize(
                        "ui.panel.config.automation.dialog_new.blueprint.use_blueprint"
                      )}
                    </h3>
                    <ha-blueprint-picker
                      @value-changed=${this._blueprintPicked}
                      .hass=${this.hass}
                    ></ha-blueprint-picker>
                  </div>
                </ha-card>`
              : html``}
          </div>
        </div>
        <mwc-button slot="primaryAction" @click=${this._blank}>
          ${this.hass.localize(
            "ui.panel.config.automation.dialog_new.start_empty"
          )}
        </mwc-button>
      </ha-dialog>
    `;
  }

  private _thingTalk() {
    replaceDialog();
    showThingtalkDialog(this, {
      callback: (config: Partial<AutomationConfig> | undefined) =>
        showAutomationEditor(config),
      input: this.shadowRoot!.querySelector("paper-input")!.value as string,
    });
    this.closeDialog();
  }

  private async _blueprintPicked(ev: CustomEvent) {
    this.closeDialog();
    await nextRender();
    showAutomationEditor({ use_blueprint: { path: ev.detail.value } });
  }

  private async _blank() {
    this.closeDialog();
    await nextRender();
    showAutomationEditor();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        .container {
          display: flex;
        }
        ha-card {
          width: calc(50% - 8px);
          margin: 4px;
        }
        ha-card div {
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        ha-card {
          box-sizing: border-box;
          padding: 8px;
        }
        ha-blueprint-picker {
          width: 100%;
        }
        .side-by-side {
          display: flex;
          flex-direction: row;
          align-items: flex-end;
        }
        @media all and (max-width: 500px) {
          .container {
            flex-direction: column;
          }
          ha-card {
            width: 100%;
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-new-automation": DialogNewAutomation;
  }
}
