import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-markdown";
import "../../../components/ha-textfield";
import type { HomeAssistant } from "../../../types";

@customElement("more-info-configurator")
export class MoreInfoConfigurator extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @state() private _isConfiguring = false;

  private _fieldInput = {};

  protected render() {
    if (this.stateObj?.state !== "configure") {
      return nothing;
    }

    return html`
      <div class="container">
        <ha-markdown
          breaks
          .content=${this.stateObj.attributes.description}
        ></ha-markdown>

        ${this.stateObj.attributes.errors
          ? html`<ha-alert alert-type="error">
              ${this.stateObj.attributes.errors}
            </ha-alert>`
          : ""}
        ${this.stateObj.attributes.fields.map(
          (field) =>
            html`<ha-textfield
              .label=${field.name}
              .name=${field.id}
              .type=${field.type}
              @change=${this._fieldChanged}
            ></ha-textfield>`
        )}
        ${this.stateObj.attributes.submit_caption
          ? html`<p class="submit">
              <ha-button
                .disabled=${this._isConfiguring}
                @click=${this._submitClicked}
                .loading=${this._isConfiguring}
              >
                ${this.stateObj.attributes.submit_caption}
              </ha-button>
            </p>`
          : ""}
      </div>
    `;
  }

  private _fieldChanged(ev) {
    const el = ev.target;
    this._fieldInput[el.name] = el.value;
  }

  private _submitClicked() {
    const data = {
      configure_id: this.stateObj!.attributes.configure_id,
      fields: this._fieldInput,
    };

    this._isConfiguring = true;

    this.hass.callService("configurator", "configure", data).then(
      () => {
        this._isConfiguring = false;
      },
      () => {
        this._isConfiguring = false;
      }
    );
  }

  static styles = css`
    .container {
      display: flex;
      flex-direction: column;
    }
    p {
      margin: 8px 0;
    }

    a {
      color: var(--primary-color);
    }

    p > img {
      max-width: 100%;
    }

    p.center {
      text-align: center;
    }

    p.submit {
      text-align: center;
      height: 41px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-configurator": MoreInfoConfigurator;
  }
}
