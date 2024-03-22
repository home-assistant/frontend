import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../../components/ha-list-item-new";
import "../../../../../../components/ha-list-new";
import "../../../../../../components/ha-icon-next";
import { HomeAssistant } from "../../../../../../types";
import { fireEvent } from "../../../../../../common/dom/fire_event";

@customElement("matter-add-device-others-code")
class MatterAddDeviceOthersCode extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _code: string = "";

  render() {
    return html`
      <div class="content">
        <p>Paste the code you just received from the other controller.</p>
        <ha-textfield
          label="Pairing code"
          .value=${this._code}
          @input=${this._onCodeChanged}
        ></ha-textfield>
      </div>
    `;
  }

  private _onCodeChanged(ev: any) {
    const value = ev.currentTarget.value;
    this._code = value;
    fireEvent(this, "pairing-code-changed", { code: value });
  }

  static styles = [
    css`
      .content {
        padding: 8px 24px 0 24px;
      }
      p {
        margin: 0 0 8px 0;
      }
      ha-textfield {
        width: 100%;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "matter-add-device-others-code": MatterAddDeviceOthersCode;
  }
}
