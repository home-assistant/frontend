import { LitElement, TemplateResult, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { pushSupported } from "../../components/ha-push-notifications-toggle";
import "../../components/ha-settings-row";
import { documentationUrl } from "../../util/documentation-url";
import { HomeAssistant } from "../../types";

@customElement("ha-push-notifications-row")
class HaPushNotificationsRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  protected render(): TemplateResult {
    const platformLoaded = isComponentLoaded(this.hass, "html5.notify");
    let descriptionKey:
      | "error_use_https"
      | "error_load_platform"
      | "description";
    if (!pushSupported) {
      descriptionKey = "error_use_https";
    } else if (!platformLoaded) {
      descriptionKey = "error_load_platform";
    } else {
      descriptionKey = "description";
    }

    const isDisabled = !platformLoaded || !pushSupported;

    return html`
      <ha-settings-row .narrow=${this.narrow}>
        <span slot="heading"
          >${this.hass.localize(
            "ui.panel.profile.push_notifications.header"
          )}</span
        >
        <span slot="description">
          ${this.hass.localize(
            `ui.panel.profile.push_notifications.${descriptionKey}`
          )}
          <a
            href=${documentationUrl(this.hass, "/integrations/html5")}
            target="_blank"
            rel="noreferrer"
            >${this.hass.localize(
              "ui.panel.profile.push_notifications.link_promo"
            )}</a
          >
        </span>
        <ha-push-notifications-toggle
          .hass=${this.hass}
          .disabled=${isDisabled}
        ></ha-push-notifications-toggle>
      </ha-settings-row>
    `;
  }

  static get styles() {
    return css`
      a {
        color: var(--primary-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-push-notifications-row": HaPushNotificationsRow;
  }
}
