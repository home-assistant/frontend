import {
  LitElement,
  CSSResultArray,
  css,
  TemplateResult,
  html,
  property,
  customElement,
} from "lit-element";
import "./hass-subpage";

@customElement("hass-error-screen")
class HassErrorScreen extends LitElement {
  @property()
  public error?: string;

  protected render(): TemplateResult | void {
    return html`
      <hass-subpage>
        <div class="content">
          <h3>${this.error}</h3>
          <slot>
            <paper-button @click=${this._backTapped}>go back</paper-button>
          </slot>
        </div>
      </hass-subpage>
    `;
  }

  private _backTapped(): void {
    history.back();
  }

  static get styles(): CSSResultArray {
    return [
      css`
        .content {
          height: calc(100% - 64px);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
        }

        paper-button {
          font-weight: bold;
          color: var(--primary-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hass-error-screen": HassErrorScreen;
  }
}
