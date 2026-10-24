import type { TemplateResult } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { pushSupported } from "../../components/ha-push-notifications-toggle";
import "../../components/item/ha-row-item";
import type { HomeAssistant } from "../../types";
import {
  documentationUrl,
  SECURE_CONNECTION_DOCUMENTATION_PATH,
} from "../../util/documentation-url";

@customElement("ha-push-notifications-row")
class HaPushNotificationsRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  protected render(): TemplateResult {
    const platformLoaded = isComponentLoaded(this.hass.config, "html5.notify");
    let description: string;
    let documentationPath = "/integrations/html5";

    if (!window.isSecureContext) {
      description = this.hass.localize(
        "ui.components.secure_connection_required.push_notifications"
      );
      documentationPath = SECURE_CONNECTION_DOCUMENTATION_PATH;
    } else if (!pushSupported) {
      description = this.hass.localize(
        "ui.panel.profile.push_notifications.error_not_supported"
      );
    } else if (!platformLoaded) {
      description = this.hass.localize(
        "ui.panel.profile.push_notifications.error_load_platform"
      );
    } else {
      description = this.hass.localize(
        "ui.panel.profile.push_notifications.description"
      );
    }

    const isDisabled = !platformLoaded || !pushSupported;

    return html`
      <ha-row-item>
        <span slot="headline"
          >${this.hass.localize(
            "ui.panel.profile.push_notifications.header"
          )}</span
        >
        <span slot="supporting-text"
          >${description}
          <a
            href=${documentationUrl(this.hass, documentationPath)}
            target="_blank"
            rel="noreferrer"
            >${this.hass.localize(
              "ui.panel.profile.push_notifications.link_promo"
            )}</a
          ></span
        >
        <ha-push-notifications-toggle
          slot="end"
          .hass=${this.hass}
          .disabled=${isDisabled}
        ></ha-push-notifications-toggle>
      </ha-row-item>
    `;
  }

  static styles = css`
    a {
      color: var(--primary-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-push-notifications-row": HaPushNotificationsRow;
  }
}
