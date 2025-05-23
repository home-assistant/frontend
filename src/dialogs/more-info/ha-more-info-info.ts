import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../common/entity/compute_domain";
import type { ExtEntityRegistryEntry } from "../../data/entity_registry";
import type { HomeAssistant } from "../../types";
import {
  computeShowHistoryComponent,
  computeShowLogBookComponent,
  computeShowNewMoreInfo,
  DOMAINS_FULL_HEIGHT_MORE_INFO,
  DOMAINS_NO_INFO,
  DOMAINS_WITH_MORE_INFO,
} from "./const";
import "./ha-more-info-history";
import "./ha-more-info-logbook";
import "./more-info-content";
import { getSensorNumericDeviceClasses } from "../../data/sensor";

@customElement("ha-more-info-info")
export class MoreInfoInfo extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entityId!: string;

  @property({ attribute: false }) public entry?: ExtEntityRegistryEntry | null;

  @property({ attribute: false }) public editMode?: boolean;

  @state() private _sensorNumericDeviceClasses?: string[] = [];

  private async _loadNumericDeviceClasses() {
    const deviceClasses = await getSensorNumericDeviceClasses(this.hass);
    this._sensorNumericDeviceClasses = deviceClasses.numeric_device_classes;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this._loadNumericDeviceClasses();
  }

  protected render() {
    const entityId = this.entityId;
    const stateObj = this.hass.states[entityId] as HassEntity | undefined;
    const entityRegObj = this.hass.entities[entityId];
    const domain = computeDomain(entityId);
    const isNewMoreInfo = stateObj && computeShowNewMoreInfo(stateObj);
    const isFullHeight =
      isNewMoreInfo || DOMAINS_FULL_HEIGHT_MORE_INFO.includes(domain);

    return html`
      <div class="container" data-domain=${domain}>
        ${!stateObj
          ? html`<ha-alert alert-type="warning">
              ${this.entry?.disabled_by
                ? this.hass.localize(
                    "ui.dialogs.entity_registry.editor.entity_disabled"
                  )
                : this.hass.localize(
                    "ui.dialogs.entity_registry.editor.unavailable"
                  )}
            </ha-alert>`
          : nothing}
        ${stateObj?.attributes.restored && entityRegObj
          ? html`<ha-alert alert-type="warning">
              ${this.hass.localize(
                "ui.dialogs.more_info_control.restored.no_longer_provided",
                {
                  integration: entityRegObj.platform,
                }
              )}
            </ha-alert>`
          : nothing}
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
          !computeShowLogBookComponent(
            this.hass,
            entityId,
            this._sensorNumericDeviceClasses
          )
            ? ""
            : html`<ha-more-info-logbook
                .hass=${this.hass}
                .entityId=${this.entityId}
              ></ha-more-info-logbook>`}
          <more-info-content
            ?full-height=${isFullHeight}
            .stateObj=${stateObj}
            .hass=${this.hass}
            .entry=${this.entry}
            .editMode=${this.editMode}
          ></more-info-content>
        </div>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .container {
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    .content {
      display: flex;
      flex-direction: column;
      flex: 1;
      padding: 24px max(24px, var(--safe-area-inset-right)) 24px
        max(24px, var(--safe-area-inset-left));
    }

    [data-domain="camera"] .content {
      padding: 0;
      /* max height of the video is full screen, minus the height of the header of the dialog (79px) and the max height of the dialog (mdc-dialog-max-height: calc(100% - 72px)) and the actions bar 60px */
      --video-max-height: calc(100vh - 72px - 79px - 60px);
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

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-info": MoreInfoInfo;
  }
}
