import "@polymer/app-layout/app-toolbar/app-toolbar";
import {
  css,
  CSSResultArray,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { haStyle } from "../resources/styles";
import { HomeAssistant } from "../types";
import { fireEvent } from "../common/dom/fire_event";

@customElement("hass-suspended-screen")
class HassSuspendedScreen extends LitElement {
  @property({ type: Boolean }) public rootnav? = false;

  @property() public hass?: HomeAssistant;

  @property() public narrow?: boolean;

  protected render(): TemplateResult {
    return html`
      <app-toolbar> </app-toolbar>
      <div class="content" @click=${this._unsuspend}>
        App is suspended<br /><br />
        tap to continue
      </div>
    `;
  }

  private _unsuspend() {
    fireEvent(this, "unsuspend-app");
  }

  static get styles(): CSSResultArray {
    return [
      haStyle,
      css`
        :host {
          display: block;
          height: 100%;
          background-color: var(--primary-background-color);
        }
        .content {
          height: calc(100% - 64px);
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hass-suspended-screen": HassSuspendedScreen;
  }
}
