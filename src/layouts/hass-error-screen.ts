import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-button/paper-button";
import {
  LitElement,
  CSSResultArray,
  css,
  TemplateResult,
  html,
  property,
  customElement,
} from "lit-element";
import "../components/ha-menu-button";
import { haStyle } from "../resources/ha-style";

@customElement("hass-error-screen")
class HassErrorScreen extends LitElement {
  @property({ type: Boolean })
  public narrow?: boolean;

  @property({ type: Boolean })
  public showMenu?: boolean;

  @property()
  public error?: string;

  protected render(): TemplateResult | void {
    return html`
      <app-toolbar>
        <ha-menu-button
          .narrow=${this.narrow}
          .showMenu=${this.showMenu}
        ></ha-menu-button>
        <div main-title>${this.title}</div>
      </app-toolbar>
      <div class="content">
        <h3>${this.error}</h3>
        <slot>
          <paper-button @click=${this._backTapped}>go back</paper-button>
        </slot>
      </div>
    `;
  }

  private _backTapped(): void {
    history.back();
  }

  static get styles(): CSSResultArray {
    return [
      haStyle,
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
