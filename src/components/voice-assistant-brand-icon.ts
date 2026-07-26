import { consume, type ContextType } from "@lit/context";
import { customElement, property, state } from "lit/decorators";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html } from "lit";
import { haStyle } from "../resources/styles";
import { configContext, uiContext } from "../data/context";
import { voiceAssistants } from "../data/expose";
import { brandsUrl } from "../util/brands-url";

@customElement("voice-assistant-brand-icon")
export class VoiceAssistantBrandicon extends LitElement {
  @state()
  @consume({ context: uiContext, subscribe: true })
  private _ui!: ContextType<typeof uiContext>;

  @state()
  @consume({ context: configContext, subscribe: true })
  private _config!: ContextType<typeof configContext>;

  @property({ attribute: false }) public voiceAssistantId!: string;

  protected render() {
    return html`
      <img
        class="logo"
        alt=${voiceAssistants[this.voiceAssistantId].name}
        src=${brandsUrl(
          {
            domain: voiceAssistants[this.voiceAssistantId].domain,
            type: "icon",
            darkOptimized: this._ui.themes?.darkMode,
          },
          this._config.auth.data.hassUrl
        )}
        crossorigin="anonymous"
        referrerpolicy="no-referrer"
      />
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          display: inline;
        }
        .logo {
          position: relative;
          vertical-align: middle;
          height: 24px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "voice-assistant-brand-icon": VoiceAssistantBrandicon;
  }
}
