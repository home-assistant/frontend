import type { ContextType } from "@lit/context";
import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { navigate } from "../../../../../common/navigate";
import { isNavigationClick } from "../../../../../common/dom/is-navigation-click";
import { consume } from "../../../../../common/decorators/consume";
import { uiContext, connectionContext } from "../../../../../data/context";
import type { LoRaWANDevice } from "../../../../../data/lorawan";
import { brandsUrl } from "../../../../../util/brands-url";

@customElement("lorawan-connection-link")
export class LoRaWANConnectionLink extends LitElement {
  @property({ attribute: false })
  public connection!: LoRaWANDevice["connection"];

  @state()
  @consume({ context: uiContext, subscribe: true })
  private _ui!: ContextType<typeof uiContext>;

  @state()
  @consume({ context: connectionContext, subscribe: true })
  private _connection!: ContextType<typeof connectionContext>;

  protected render() {
    return html` <a
      href=${`/config/integrations/integration/${this.connection.domain}${__DEMO__ ? "?" : "#"}config_entry=${this.connection.entry_id}`}
      @click=${this._navigate}
    >
      <img
        alt=""
        src=${brandsUrl({ domain: this.connection.domain, type: "icon", darkOptimized: this._ui?.themes.darkMode }, this._connection?.hassUrl())}
      />
      <span>${this.connection.title}</span>
    </a>`;
  }

  private _navigate(ev: MouseEvent) {
    ev.stopPropagation();
    const path = isNavigationClick(ev);
    if (path) navigate(path);
  }

  static styles = css`
    a {
      display: inline-flex;
      align-items: center;
      gap: var(--ha-space-2);
      color: var(--primary-color);
      text-decoration: none;
      min-height: 44px;
    }
    a:hover {
      text-decoration: underline;
    }
    img {
      width: 24px;
      height: 24px;
      object-fit: contain;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "lorawan-connection-link": LoRaWANConnectionLink;
  }
}
