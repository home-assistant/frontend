import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { computeDomain } from "../../common/entity/compute_domain";
import type { HomeAssistant } from "../../types";
import {
  computeShowHistoryComponent,
  computeShowLogBookComponent,
  computeShowNewMoreInfo,
  DOMAINS_NO_INFO,
  DOMAINS_WITH_MORE_INFO,
} from "./const";
import "./ha-more-info-history";
import "./ha-more-info-logbook";
import "./more-info-content";

@customElement("ha-more-info-info")
export class MoreInfoInfo extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public entityId!: string;

  protected render() {
    const entityId = this.entityId;
    const stateObj = this.hass.states[entityId] as HassEntity | undefined;
    const entityRegObj = this.hass.entities[entityId];
    const domain = computeDomain(entityId);
    const isNewMoreInfo = stateObj && computeShowNewMoreInfo(stateObj);

    return html`
      <div class="container" data-domain=${domain}>
        ${!stateObj
          ? html`<ha-alert alert-type="warning">
              ${this.hass.localize(
                "ui.dialogs.entity_registry.editor.unavailable"
              )}
            </ha-alert>`
          : ""}
        ${stateObj?.attributes.restored && entityRegObj
          ? html`<ha-alert alert-type="warning">
              ${this.hass.localize(
                "ui.dialogs.more_info_control.restored.no_longer_provided",
                {
                  integration: entityRegObj.platform,
                }
              )}
            </ha-alert>`
          : ""}
        <div class="content">
          ${DOMAINS_NO_INFO.includes(domain) || isNewMoreInfo
            ? ""
            : html`
                <state-card-content
                  in-dialog
                  .stateObj=${stateObj}
                  .hass=${this.hass}
                ></state-card-content>
              `}
          ${DOMAINS_WITH_MORE_INFO.includes(domain) ||
          !computeShowHistoryComponent(this.hass, entityId)
            ? ""
            : html`<ha-more-info-history
                .hass=${this.hass}
                .entityId=${this.entityId}
              ></ha-more-info-history>`}
          ${DOMAINS_WITH_MORE_INFO.includes(domain) ||
          !computeShowLogBookComponent(this.hass, entityId)
            ? ""
            : html`<ha-more-info-logbook
                .hass=${this.hass}
                .entityId=${this.entityId}
              ></ha-more-info-logbook>`}
          <more-info-content
            ?full-height=${isNewMoreInfo}
            .stateObj=${stateObj}
            .hass=${this.hass}
          ></more-info-content>
          <div class="toto"></div>
        </div>
      </div>
    `;
  }

  static get styles() {
    return css`
      .container {
        display: flex;
        flex-direction: column;
      }

      @media all and (max-width: 450px) {
        .container {
          min-height: calc(100vh - var(--header-height));
        }
      }

      .content {
        display: flex;
        flex-direction: column;
        flex: 1;
        padding: 24px;
        padding-bottom: max(env(safe-area-inset-bottom), 24px);
      }

      [data-domain="camera"] .content {
        padding: 0;
        /* max height of the video is full screen, minus the height of the header of the dialog and the padding of the dialog (mdc-dialog-max-height: calc(100% - 72px)) */
        --video-max-height: calc(100vh - 65px - 72px);
      }

      more-info-content {
        position: relative;
        display: flex;
        flex-direction: column;
      }
      more-info-content[full-height] {
        flex: 1;
      }

      state-card-content,
      ha-more-info-history,
      ha-more-info-logbook:not(:last-child) {
        display: block;
        margin-bottom: 16px;
      }

      ha-alert {
        display: block;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-info": MoreInfoInfo;
  }
}
