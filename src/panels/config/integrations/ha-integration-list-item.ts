import type { GraphicType } from "@material/mwc-list/mwc-list-item-base";
import { ListItemBase } from "@material/mwc-list/mwc-list-item-base";
import { styles } from "@material/mwc-list/mwc-list-item.css";
import { mdiFileCodeOutline, mdiPackageVariant, mdiWeb } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { domainToName } from "../../../data/integration";
import type { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import type { IntegrationListItem } from "./dialog-add-integration";
import "../../../components/ha-svg-icon";
import "../../../components/ha-icon-next";
import "../../../components/ha-tooltip";

@customElement("ha-integration-list-item")
export class HaIntegrationListItem extends ListItemBase {
  public hass!: HomeAssistant;

  @property({ attribute: false }) public integration?: IntegrationListItem;

  @property({ type: String, reflect: true }) graphic: GraphicType = "medium";

  // eslint-disable-next-line lit/attribute-names
  @property({ type: Boolean }) hasMeta = true;

  @property({ type: Boolean }) brand = false;

  // @ts-expect-error
  protected override renderSingleLine() {
    if (!this.integration) {
      return nothing;
    }
    return html`${this.integration.name ||
    domainToName(this.hass.localize, this.integration.domain)}
    ${this.integration.is_helper ? " (helper)" : ""}`;
  }

  // @ts-expect-error
  protected override renderGraphic() {
    if (!this.integration) {
      return nothing;
    }
    const graphicClasses = {
      multi: this.multipleGraphics,
    };

    return html` <span
      class="mdc-deprecated-list-item__graphic material-icons ${classMap(
        graphicClasses
      )}"
    >
      <img
        alt=""
        loading="lazy"
        src=${brandsUrl({
          domain: this.integration.domain,
          type: "icon",
          useFallback: true,
          darkOptimized: this.hass.themes?.darkMode,
          brand: this.brand,
        })}
        crossorigin="anonymous"
        referrerpolicy="no-referrer"
      />
    </span>`;
  }

  // @ts-expect-error
  protected override renderMeta() {
    if (!this.integration) {
      return nothing;
    }
    return html`<span class="mdc-deprecated-list-item__meta material-icons">
      ${this.integration.cloud
        ? html` <ha-svg-icon id="icon-cloud" .path=${mdiWeb}></ha-svg-icon>
            <ha-tooltip for="icon-cloud" placement="left"
              >${this.hass.localize(
                "ui.panel.config.integrations.config_entry.depends_on_cloud"
              )}
            </ha-tooltip>`
        : nothing}
      ${!this.integration.is_built_in
        ? html`<span
            class=${this.integration.overwrites_built_in
              ? "overwrites"
              : "custom"}
          >
            <ha-svg-icon
              id="icon-custom"
              .path=${mdiPackageVariant}
            ></ha-svg-icon>
            <ha-tooltip for="icon-custom" placement="left"
              >${this.hass.localize(
                this.integration.overwrites_built_in
                  ? "ui.panel.config.integrations.config_entry.custom_overwrites_core"
                  : "ui.panel.config.integrations.config_entry.custom_integration"
              )}</ha-tooltip
            ></span
          >`
        : nothing}
      ${!this.integration.config_flow &&
      !this.integration.integrations &&
      !this.integration.iot_standards
        ? html` <ha-svg-icon
              id="icon-yaml"
              .path=${mdiFileCodeOutline}
              class="open-in-new"
            ></ha-svg-icon>
            <ha-tooltip for="icon-yaml" placement="left">
              ${this.hass.localize(
                "ui.panel.config.integrations.config_entry.yaml_only"
              )}
            </ha-tooltip>`
        : html`<ha-icon-next></ha-icon-next>`}
    </span>`;
  }

  static get styles(): CSSResultGroup {
    return [
      styles,
      css`
        :host {
          --mdc-list-side-padding: 24px;
          --mdc-list-item-graphic-size: 40px;
        }
        :host([graphic="avatar"]:not([twoLine])),
        :host([graphic="icon"]:not([twoLine])) {
          height: 48px;
        }
        span.material-icons:first-of-type {
          margin-inline-start: 0px !important;
          margin-inline-end: var(
            --mdc-list-item-graphic-margin,
            16px
          ) !important;
          direction: var(--direction);
        }
        span.material-icons:last-of-type {
          margin-inline-start: auto !important;
          margin-inline-end: 0px !important;
          direction: var(--direction);
        }
        img {
          width: 40px;
          height: 40px;
        }
        .mdc-deprecated-list-item__meta {
          width: auto;
          white-space: nowrap;
        }
        .mdc-deprecated-list-item__meta > * {
          margin-right: 8px;
          margin-inline-end: 8px;
          margin-inline-start: initial;
        }
        .mdc-deprecated-list-item__meta > *:last-child {
          margin-right: 0px;
          margin-inline-end: 0px;
          margin-inline-start: initial;
        }
        ha-icon-next {
          margin-right: 8px;
          margin-inline-end: 8px;
          margin-inline-start: initial;
        }
        .open-in-new {
          --mdc-icon-size: 22px;
          padding: 1px;
        }
        .custom {
          color: var(--warning-color);
        }
        .overwrites {
          color: var(--error-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-integration-list-item": HaIntegrationListItem;
  }
}
