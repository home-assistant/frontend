import { mdiBookshelf, mdiCog, mdiDotsVertical, mdiOpenInNew } from "@mdi/js";
import { LitElement, TemplateResult, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../../common/dom/fire_event";
import {
  ATTENTION_SOURCES,
  DISCOVERY_SOURCES,
  ignoreConfigFlow,
  localizeConfigFlowTitle,
} from "../../../data/config_flow";
import type { IntegrationManifest } from "../../../data/integration";
import { showConfigFlowDialog } from "../../../dialogs/config-flow/show-dialog-config-flow";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import type { DataEntryFlowProgressExtended } from "./ha-config-integrations";
import "./ha-integration-action-card";
import "../../../components/ha-button-menu";
import "../../../components/ha-button";
import "../../../components/ha-list-item";

@customElement("ha-config-flow-card")
export class HaConfigFlowCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public flow!: DataEntryFlowProgressExtended;

  @property() public manifest?: IntegrationManifest;

  protected render(): TemplateResult {
    const attention = ATTENTION_SOURCES.includes(this.flow.context.source);
    return html`
      <ha-integration-action-card
        class=${classMap({
          attention: attention,
        })}
        .hass=${this.hass}
        .manifest=${this.manifest}
        .domain=${this.flow.handler}
        .label=${this.flow.localized_title}
      >
        <ha-button
          unelevated
          @click=${this._continueFlow}
          .label=${this.hass.localize(
            `ui.panel.config.integrations.${
              attention ? "reconfigure" : "configure"
            }`
          )}
        ></ha-button>
        ${DISCOVERY_SOURCES.includes(this.flow.context.source) &&
        this.flow.context.unique_id
          ? html`<ha-button
              @click=${this._ignoreFlow}
              .label=${this.hass.localize(
                "ui.panel.config.integrations.ignore.ignore"
              )}
            ></ha-button>`
          : ""}
        ${this.flow.context.configuration_url || this.manifest
          ? html`<ha-button-menu slot="header-button">
              <ha-icon-button
                slot="trigger"
                .label=${this.hass.localize("ui.common.menu")}
                .path=${mdiDotsVertical}
              ></ha-icon-button>
              ${this.flow.context.configuration_url
                ? html`<a
                    href=${this.flow.context.configuration_url.replace(
                      /^homeassistant:\/\//,
                      ""
                    )}
                    rel="noreferrer"
                    target=${this.flow.context.configuration_url.startsWith(
                      "homeassistant://"
                    )
                      ? "_self"
                      : "_blank"}
                  >
                    <ha-list-item graphic="icon" hasMeta>
                      ${this.hass.localize(
                        "ui.panel.config.integrations.config_entry.open_configuration_url"
                      )}
                      <ha-svg-icon slot="graphic" .path=${mdiCog}></ha-svg-icon>
                      <ha-svg-icon
                        slot="meta"
                        .path=${mdiOpenInNew}
                      ></ha-svg-icon>
                    </ha-list-item>
                  </a>`
                : ""}
              ${this.manifest
                ? html`<a
                    href=${this.manifest.is_built_in
                      ? documentationUrl(
                          this.hass,
                          `/integrations/${this.manifest.domain}`
                        )
                      : this.manifest.documentation}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <ha-list-item graphic="icon" hasMeta>
                      ${this.hass.localize(
                        "ui.panel.config.integrations.config_entry.documentation"
                      )}
                      <ha-svg-icon
                        slot="graphic"
                        .path=${mdiBookshelf}
                      ></ha-svg-icon>
                      <ha-svg-icon
                        slot="meta"
                        .path=${mdiOpenInNew}
                      ></ha-svg-icon>
                    </ha-list-item>
                  </a>`
                : ""}
            </ha-button-menu>`
          : ""}
      </ha-integration-action-card>
    `;
  }

  private _continueFlow() {
    showConfigFlowDialog(this, {
      continueFlowId: this.flow.flow_id,
      dialogClosedCallback: () => {
        this._handleFlowUpdated();
      },
    });
  }

  private async _ignoreFlow() {
    const confirmed = await showConfirmationDialog(this, {
      title: this.hass!.localize(
        "ui.panel.config.integrations.ignore.confirm_ignore_title",
        "name",
        localizeConfigFlowTitle(this.hass.localize, this.flow)
      ),
      text: this.hass!.localize(
        "ui.panel.config.integrations.ignore.confirm_ignore"
      ),
      confirmText: this.hass!.localize(
        "ui.panel.config.integrations.ignore.ignore"
      ),
    });
    if (!confirmed) {
      return;
    }
    await ignoreConfigFlow(
      this.hass,
      this.flow.flow_id,
      localizeConfigFlowTitle(this.hass.localize, this.flow)
    );
    this._handleFlowUpdated();
  }

  private _handleFlowUpdated() {
    fireEvent(this, "change", undefined, {
      bubbles: false,
    });
  }

  static styles = css`
    a {
      text-decoration: none;
      color: var(--primary-color);
    }
    ha-button-menu {
      color: var(--secondary-text-color);
    }
    ha-svg-icon[slot="meta"] {
      width: 18px;
      height: 18px;
    }
    .attention {
      --mdc-theme-primary: var(--error-color);
      --ha-card-border-color: var(--error-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-flow-card": HaConfigFlowCard;
  }
}
