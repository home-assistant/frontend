import { customElement, property, state } from "lit/decorators";
import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import CBOR from "cbor-js";
import { HomeAssistant } from "../../../../types";
import { fireEvent } from "../../../../common/dom/fire_event";
import { HaFormElement, HaFormFrontendComponent } from "../../types";

@customElement("frontend-fido2-register-field")
export class FrontendFido2RegisterField
  extends LitElement
  implements HaFormElement
{
  private static decode_cbor(data: string): ArrayBuffer {
    return CBOR.decode(
      Uint8Array.from(atob(data), (c) => c.charCodeAt(0)).buffer
    );
  }

  private static encode_cbor(data: any): string {
    return btoa(String.fromCharCode(...new Uint8Array(CBOR.encode(data))));
  }

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public schema!: HaFormFrontendComponent;

  @property({ attribute: false }) public data!: any;

  @property({ attribute: false }) public submit_fn!: (
    evt: Event
  ) => Promise<void> | null;

  @property() public label!: string;

  @property({ type: Boolean }) public disabled = false;

  @state() private error_message?: string | null = "";

  private reg_data: any = null;

  protected firstUpdated(_changedProperties: PropertyValues) {
    super.firstUpdated(_changedProperties);

    // store decode registration data
    this.reg_data = FrontendFido2RegisterField.decode_cbor(
      this.schema.options.registration_data
    );
  }

  private _register(evt: Event) {
    navigator.credentials
      .create(this.reg_data)
      .then((attestation: any) => {
        if (!attestation) {
          this.error_message =
            "Cannot complete registration. credentials.create() returned null";
          fireEvent(this, "value-changed", {
            value: FrontendFido2RegisterField.encode_cbor({
              result: false,
              cause: "null_attestation",
            }),
          });
        } else {
          fireEvent(this, "value-changed", {
            value: FrontendFido2RegisterField.encode_cbor({
              attestationObject: new Uint8Array(
                attestation.response.attestationObject
              ),
              clientData: new Uint8Array(attestation.response.clientDataJSON),
            }),
          });
          this.submit_fn(evt);
        }
      })
      .catch((err) => {
        this.error_message = err.toString();
        fireEvent(this, "value-changed", {
          value: FrontendFido2RegisterField.encode_cbor({
            result: false,
            cause: err.toString(),
          }),
        });
      });
  }

  protected render(): TemplateResult {
    if (!navigator || !navigator.credentials) {
      fireEvent(this, "value-changed", {
        value: FrontendFido2RegisterField.encode_cbor({
          result: false,
          cause: "no_validator",
        }),
      });
      this.error_message =
        "navigator.credentials is not supported in this browser";
    }

    return html` ${this.error_message !== null
        ? html`<div class="error">${this.error_message}</div>`
        : ""}
      <mwc-button @click=${this._register}>Register FIDO2 Device</mwc-button>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "frontend-fido2-register-field": FrontendFido2RegisterField;
  }
}
