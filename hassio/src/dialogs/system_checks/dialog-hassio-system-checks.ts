import {
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../../../src/common/dom/fire_event";
import "../../../../src/components/ha-circular-progress";
import { createCloseHeading } from "../../../../src/components/ha-dialog";
import "../../../../src/components/ha-settings-row";
import "../../../../src/components/ha-svg-icon";
import { extractApiErrorMessage } from "../../../../src/data/hassio/common";
import { setCheckOptions } from "../../../../src/data/hassio/resolution";
import { Supervisor } from "../../../../src/data/supervisor/supervisor";
import { showAlertDialog } from "../../../../src/dialogs/generic/show-dialog-box";
import { haStyle, haStyleDialog } from "../../../../src/resources/styles";
import type { HomeAssistant } from "../../../../src/types";
import { SystemChecksParams } from "./show-dialog-system-checks";

@customElement("dialog-hassio-system-checks")
class HassioSystemChecksDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor?: Supervisor;

  protected render(): TemplateResult {
    if (!this.supervisor) {
      return html``;
    }

    return html`
      <ha-dialog
        @closing=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          this.supervisor.localize("dialog.system_check.title")
        )}
        hideActions
        open
      >
        <div class="form">
          ${this.supervisor.resolution.checks.map(
            (check) => html`
              <ha-settings-row three-line>
                <span slot="heading">
                  ${this.supervisor!.localize(
                    `dialog.system_check.check.${check.slug}.title`
                  ) || check.slug}
                </span>
                <span slot="description">
                  ${this.supervisor!.localize(
                    `dialog.system_check.check.${check.slug}.description`
                  )}
                </span>
                <ha-switch
                  .slug=${check.slug}
                  @change=${this._checkToggled}
                  .checked=${check.enabled}
                  haptic
                ></ha-switch>
              </ha-settings-row>
            `
          )}
        </div>
      </ha-dialog>
    `;
  }

  public async showDialog(dialogParams: SystemChecksParams): Promise<void> {
    this.supervisor = dialogParams.supervisor;
    await this.updateComplete;
  }

  public closeDialog(): void {
    this.supervisor = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  public focus(): void {
    this.updateComplete.then(() =>
      (this.shadowRoot?.querySelector(
        "[dialogInitialFocus]"
      ) as HTMLElement)?.focus()
    );
  }

  private async _checkToggled(ev: Event): Promise<void> {
    const check = ev.currentTarget as any;

    try {
      await setCheckOptions(this.hass, check.slug, { enabled: check.checked });
      fireEvent(this, "supervisor-collection-refresh", {
        collection: "resolution",
      });
    } catch (err) {
      showAlertDialog(this, {
        title: this.supervisor!.localize(
          "dialog.system_check.failed_to_set_option"
        ),
        text: extractApiErrorMessage(err),
      });
    }
  }

  static get styles(): CSSResult[] {
    return [haStyle, haStyleDialog];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-hassio-system-checks": HassioSystemChecksDialog;
  }
}
