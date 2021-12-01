import "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { nextRender } from "../../../common/util/render-status";
import "../../../components/ha-blueprint-picker";
import "../../../components/ha-card";
import "../../../components/ha-circular-progress";
import { createCloseHeading } from "../../../components/ha-dialog";
import { showAutomationEditor } from "../../../data/automation";
import { HassDialog } from "../../../dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import "@material/mwc-list/mwc-list-item";
import "../../../components/ha-icon-next";

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
        hideActions
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize("ui.panel.config.automation.dialog_new.how")
        )}
      >
        <mwc-list>
          <mwc-list-item twoline class="blueprint" @click=${this._blueprint}>
            ${this.hass.localize(
              "ui.panel.config.automation.dialog_new.blueprint.use_blueprint"
            )}
            <span slot="secondary">
              <ha-blueprint-picker
                @value-changed=${this._blueprintPicked}
                .hass=${this.hass}
              ></ha-blueprint-picker>
            </span>
          </mwc-list-item>
          <li divider role="separator"></li>
          <mwc-list-item hasmeta twoline @click=${this._blank}>
            Start empty
            <span slot="secondary">Create a new automation from scratch</span>
            <ha-icon-next slot="meta"></ha-icon-next
          ></mwc-list-item>
        </mwc-list>
      </ha-dialog>
    `;
  }

  private async _blueprintPicked(ev: CustomEvent) {
    this.closeDialog();
    await nextRender();
    showAutomationEditor({ use_blueprint: { path: ev.detail.value } });
  }

  private async _blueprint() {
    this.shadowRoot!.querySelector("ha-blueprint-picker")!.open();
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
        mwc-list-item.blueprint {
          height: 92px;
        }
        ha-blueprint-picker {
          margin-top: -16px;
        }
        ha-dialog {
          --dialog-content-padding: 0;
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
