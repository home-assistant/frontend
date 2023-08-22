import { LitElement, TemplateResult, html } from "lit";
import { customElement, property } from "lit/decorators";
import { showConfirmationDialog } from "../../dialogs/generic/show-dialog-box";
import "./ha-progress-button";
import { HomeAssistant } from "../../types";
import { fireEvent } from "../../common/dom/fire_event";

@customElement("ha-call-service-button")
class HaCallServiceButton extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public progress = false;

  @property() public domain!: string;

  @property() public service!: string;

  @property({ type: Object }) public serviceData = {};

  @property() public confirmation?;

  public render(): TemplateResult {
    return html`
      <ha-progress-button
        .progress=${this.progress}
        .disabled=${this.disabled}
        @click=${this._buttonTapped}
        tabindex="0"
      >
        <slot></slot
      ></ha-progress-button>
    `;
  }

  private async _callService() {
    this.progress = true;
    const eventData = {
      domain: this.domain,
      service: this.service,
      serviceData: this.serviceData,
      success: false,
    };

    const progressElement =
      this.shadowRoot!.querySelector("ha-progress-button")!;

    try {
      await this.hass.callService(this.domain, this.service, this.serviceData);
      this.progress = false;
      progressElement.actionSuccess();
      eventData.success = true;
    } catch (e) {
      this.progress = false;
      progressElement.actionError();
      eventData.success = false;
      return;
    } finally {
      fireEvent(this, "hass-service-called", eventData);
    }
  }

  private _buttonTapped() {
    if (this.confirmation) {
      showConfirmationDialog(this, {
        text: this.confirmation,
        confirm: () => this._callService(),
      });
    } else {
      this._callService();
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-call-service-button": HaCallServiceButton;
  }
}

declare global {
  // for fire event
  interface HASSDomEvents {
    "hass-service-called": {
      domain: string;
      service: string;
      serviceData: object;
      success: boolean;
    };
  }
}
