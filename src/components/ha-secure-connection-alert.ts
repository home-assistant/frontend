import type { ContextType } from "@lit/context";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../common/decorators/consume";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../common/translations/localize";
import { configContext } from "../data/context";
import {
  documentationUrl,
  SECURE_CONNECTION_DOCUMENTATION_PATH,
} from "../util/documentation-url";
import "./ha-alert";

export type SecureConnectionFeature =
  "microphone" | "camera" | "push_notifications";

@customElement("ha-secure-connection-alert")
class HaSecureConnectionAlert extends LitElement {
  @property() public feature!: SecureConnectionFeature;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: configContext, subscribe: true })
  private _config!: ContextType<typeof configContext>;

  protected render() {
    if (!this._localize || !this._config) {
      return nothing;
    }

    return html`
      <ha-alert alert-type="warning">
        ${this._localize(
          `ui.components.secure_connection_required.${this.feature}`
        )}
        ${this._localize(
          "ui.components.secure_connection_required.learn_more",
          {
            documentation_link: html`<a
              href=${documentationUrl(
                this._config,
                SECURE_CONNECTION_DOCUMENTATION_PATH
              )}
              target="_blank"
              rel="noopener noreferrer"
              >${this._localize(
                "ui.components.secure_connection_required.documentation_link"
              )}</a
            >`,
          }
        )}
      </ha-alert>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }

    a {
      color: var(--primary-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-secure-connection-alert": HaSecureConnectionAlert;
  }
}
