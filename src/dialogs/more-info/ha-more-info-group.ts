import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { computeDomain } from "../../common/entity/compute_domain";
import type { ExtEntityRegistryEntry } from "../../data/entity_registry";
import type { HomeAssistant } from "../../types";
import { computeShowNewMoreInfo, DOMAINS_FULL_HEIGHT_MORE_INFO } from "./const";
import "./ha-more-info-history";
import "./ha-more-info-logbook";
import "./more-info-group-content";

@customElement("ha-more-info-group")
export class MoreInfoGroup extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entityId!: string;

  @property({ attribute: false }) public entry?: ExtEntityRegistryEntry | null;

  @property({ attribute: false }) public editMode?: boolean;

  protected render() {
    const entityId = this.entityId;
    const stateObj = this.hass.states[entityId] as HassEntity | undefined;
    const domain = computeDomain(entityId);
    const isNewMoreInfo = stateObj && computeShowNewMoreInfo(stateObj);
    const isFullHeight =
      isNewMoreInfo || DOMAINS_FULL_HEIGHT_MORE_INFO.includes(domain);

    return html`
      <div class="container" data-domain=${domain}>
        <div class="content">
          <more-info-group-content
            ?full-height=${isFullHeight}
            .stateObj=${stateObj}
            .hass=${this.hass}
            .entry=${this.entry}
            .editMode=${this.editMode}
          ></more-info-group-content>
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
      padding: 24px;
      padding-bottom: max(var(--safe-area-inset-bottom), 24px);
    }

    more-info-group-content {
      position: relative;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      justify-content: center;
      row-gap: 16px;
    }

    more-info-group-content[full-height] {
      flex: 1;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-group": MoreInfoGroup;
  }
}
