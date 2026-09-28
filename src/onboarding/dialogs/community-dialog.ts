import { mdiAccountGroup, mdiOpenInNew } from "@mdi/js";
import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators";
import { consumeLocalize } from "../../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../../common/translations/localize";
import "../../components/ha-dialog";
import "../../components/ha-svg-icon";
import "../../components/item/ha-list-item-button";
import "../../components/list/ha-list-nav";
import { DialogMixin } from "../../dialogs/dialog-mixin";

@customElement("community-dialog")
class DialogCommunity extends DialogMixin(LitElement) {
  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  protected render() {
    return html`<ha-dialog
      open
      header-title=${this._localize(
        "ui.panel.page-onboarding.welcome.community"
      )}
    >
      <ha-list-nav>
        <ha-list-item-button
          target="_blank"
          rel="noreferrer noopener"
          href="https://community.home-assistant.io/"
        >
          <img
            src="/static/icons/favicon-192x192.png"
            slot="start"
            alt="Home Assistant Logo"
          />
          <span slot="headline">
            ${this._localize("ui.panel.page-onboarding.welcome.forums")}
          </span>
          <ha-svg-icon slot="end" .path=${mdiOpenInNew}></ha-svg-icon>
        </ha-list-item-button>
        <ha-list-item-button
          target="_blank"
          rel="noreferrer noopener"
          href="https://newsletter.openhomefoundation.org/"
        >
          <img
            src="/static/icons/logo_ohf.svg"
            slot="start"
            alt="Open Home Foundation Logo"
          />
          <span slot="headline">
            ${this._localize(
              "ui.panel.page-onboarding.welcome.open_home_newsletter"
            )}
          </span>
          <ha-svg-icon slot="end" .path=${mdiOpenInNew}></ha-svg-icon>
        </ha-list-item-button>
        <ha-list-item-button
          target="_blank"
          rel="noreferrer noopener"
          href="https://www.home-assistant.io/join-chat"
        >
          <img
            src="/static/images/logo_discord.png"
            slot="start"
            alt="Discord Logo"
          />
          <span slot="headline">
            ${this._localize("ui.panel.page-onboarding.welcome.discord")}
          </span>
          <ha-svg-icon slot="end" .path=${mdiOpenInNew}></ha-svg-icon>
        </ha-list-item-button>
        <ha-list-item-button
          target="_blank"
          rel="noreferrer noopener"
          href="https://fosstodon.org/@homeassistant"
        >
          <ha-svg-icon .path=${mdiAccountGroup} slot="start"></ha-svg-icon>
          <span slot="headline">
            ${this._localize("ui.panel.page-onboarding.welcome.social_media")}
          </span>
          <ha-svg-icon slot="end" .path=${mdiOpenInNew}></ha-svg-icon>
        </ha-list-item-button>
      </ha-list-nav>
    </ha-dialog>`;
  }

  static styles = css`
    ha-dialog {
      --dialog-content-padding: 0;
    }
    img {
      width: 32px;
      height: 32px;
    }
    ha-svg-icon {
      color: var(--ha-color-text-secondary);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "community-dialog": DialogCommunity;
  }
}
