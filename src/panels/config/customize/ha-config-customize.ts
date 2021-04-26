import {
  css,
  CSSResult,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import "../../../components/ha-card";
import "../../../layouts/hass-loading-screen";
import "../../../layouts/hass-tabs-subpage";
import { HomeAssistant, Route } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import "../ha-config-section";
import "../ha-entity-config";
import { configSections } from "../ha-panel-config";
import "./ha-form-customize";

class HaConfigCustomize extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public isWide?: boolean;

  @property() public narrow?: boolean;

  @property() public route!: Route;

  @property() private _selectedEntityId = "";

  protected render(): TemplateResult {
    return html`
      <style include="ha-style"></style>
      <hass-tabs-subpage
      .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        back-path="/config"
        .tabs=${configSections.advanced}
      >
        <ha-config-section .isWide=${this.isWide}>
            <span slot="header">
            ${this.hass.localize("ui.panel.config.customize.picker.header")}
            </span>
            <span slot="introduction">
            ${this.hass.localize(
              "ui.panel.config.customize.picker.introduction"
            )}
              <br />
              <a
              href=${documentationUrl(
                this.hass,
                "/docs/configuration/customizing-devices/#customization-using-the-ui"
              )}
                target="_blank"
                rel="noreferrer"
              >
              ${this.hass.localize(
                "ui.panel.config.customize.picker.documentation"
              )}
              </a>
            </span>
            <ha-entity-config
              .hass=${this.hass}
              .selectedEntityId=${this._selectedEntityId}
            >
            </ha-entity-config>
          </ha-config-section>
        </div>
      </hass-tabs-subpage>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);

    if (!this.route.path.includes("/edit/")) {
      return;
    }
    const routeSegments = this.route.path.split("/edit/");
    this._selectedEntityId = routeSegments.length > 1 ? routeSegments[1] : "";
  }

  static get styles(): CSSResult {
    return css`
      a {
        color: var(--primary-color);
      }
    `;
  }
}
customElements.define("ha-config-customize", HaConfigCustomize);
