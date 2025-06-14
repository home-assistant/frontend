import type { HassEntity } from "home-assistant-js-websocket";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import type { ExtEntityRegistryEntry } from "../../data/entity_registry";
import { importMoreInfoControl } from "../../panels/lovelace/custom-card-helpers";
import type { HomeAssistant } from "../../types";
import { stateMoreInfoType } from "./state_more_info_control";
import { dynamicElement } from "../../common/dom/dynamic-element-directive";
import { computeStateName } from "../../common/entity/compute_state_name";
import { stripPrefixFromEntityName } from "../../common/entity/strip_prefix_from_entity_name";

interface RenderItem {
  stateObj: HassEntity;
  type: string | undefined;
}
@customElement("more-info-group-content")
class MoreInfoGroupContent extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @property({ attribute: false }) public entry?: ExtEntityRegistryEntry | null;

  @property({ attribute: false }) public editMode?: boolean;

  protected render() {
    const items = this._getRenderItems();
    if (items.length === 0) return nothing;

    return items.map((item) => {
      if (!item.type) return nothing;
      return html`
        <div class="group-item">
          <div class="header-title">
            ${this._formattedFriendlyName(item.stateObj)}
          </div>
          ${dynamicElement(item.type, {
            hass: this.hass,
            stateObj: item.stateObj,
            entry: this.entry,
            editMode: this.editMode,
          })}
        </div>
      `;
    });
  }

  private _formattedFriendlyName(stateObj: HassEntity): string {
    const parentName = computeStateName(this.stateObj!);
    const currentName = computeStateName(stateObj);

    return stripPrefixFromEntityName(currentName, parentName) || currentName;
  }

  private _getRenderItems(): RenderItem[] {
    const moreInfoType = (t: string): string | undefined =>
      t === "hidden" ? undefined : `more-info-${t}`;

    if (!this.stateObj || !this.hass) return [];

    if (
      this.stateObj.attributes &&
      "custom_ui_more_info" in this.stateObj.attributes
    ) {
      return [
        {
          stateObj: this.stateObj,
          type: this.stateObj.attributes.custom_ui_more_info,
        },
      ];
    }

    const type = stateMoreInfoType(this.stateObj);
    importMoreInfoControl(type);

    const renderItems: RenderItem[] = [];
    if (
      this.stateObj.attributes &&
      "entity_id" in this.stateObj.attributes &&
      "length" in this.stateObj.attributes.entity_id &&
      this.stateObj.attributes.entity_id.length > 1
    ) {
      this.stateObj.attributes.entity_id.forEach((entityId: string) => {
        if (!entityId) return;

        const stateObj = this.hass!.states[entityId] as HassEntity | undefined;
        if (!stateObj) return;

        const newType = stateMoreInfoType(stateObj);
        importMoreInfoControl(newType);

        renderItems.push({
          stateObj: stateObj,
          type: moreInfoType(newType),
        });
      });
    }

    return renderItems;
  }

  static styles = css`
    .group-item {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .header-title {
      font-size: var(--ha-font-size-xl);
      line-height: var(--ha-line-height-condensed);
      font-weight: var(--ha-font-weight-normal);
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin: 0 16px 4px;
      padding: 2px 6px;
      background-color: var(--secondary-background-color);
      border-radius: 6px;
    }

    @media all and (max-width: 450px), all and (max-height: 500px) {
      .header-title {
        font-size: var(--ha-font-size-3xl);
      }
    }
  `;
}
declare global {
  interface HTMLElementTagNameMap {
    "more-info-group-content": MoreInfoGroupContent;
  }
}
