import { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  nothing,
} from "lit";
import { property, state } from "lit/decorators";
import { dynamicElement } from "../../../common/dom/dynamic-element-directive";
import { computeGroupDomain, GroupEntity } from "../../../data/group";
import "../../../state-summary/state-card-content";
import { HomeAssistant } from "../../../types";
import { moreInfoControlStyle } from "../components/ha-more-info-control-style";
import {
  domainMoreInfoType,
  importMoreInfoControl,
} from "../state_more_info_control";

class MoreInfoGroup extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public stateObj?: GroupEntity;

  @state() private _groupDomainStateObj?: HassEntity;

  @state() private _moreInfoType?: string;

  protected updated(changedProperties: PropertyValues) {
    if (
      !this.hass ||
      !this.stateObj ||
      (!changedProperties.has("hass") && !changedProperties.has("stateObj"))
    ) {
      return;
    }

    const states = this.stateObj.attributes.entity_id
      .map((entity_id) => this.hass.states[entity_id])
      .filter((entityState) => entityState);

    if (!states.length) {
      this._groupDomainStateObj = undefined;
      this._moreInfoType = undefined;
      return;
    }

    const baseStateObj =
      states.find((s) => s.state === this.stateObj!.state) || states[0];

    const groupDomain = computeGroupDomain(this.stateObj);

    // Groups need to be filtered out or we'll show content of
    // first child above the children of the current group
    if (groupDomain && groupDomain !== "group") {
      this._groupDomainStateObj = {
        ...baseStateObj,
        entity_id: this.stateObj.entity_id,
        last_updated: this.stateObj.last_updated,
        last_changed: this.stateObj.last_changed,
        attributes: {
          ...baseStateObj.attributes,
          friendly_name: this.stateObj.attributes.friendly_name,
          entity_id: this.stateObj.attributes.entity_id,
        },
      };
      const type = domainMoreInfoType(groupDomain);
      importMoreInfoControl(type);
      this._moreInfoType = type === "hidden" ? undefined : `more-info-${type}`;
    } else {
      this._groupDomainStateObj = undefined;
      this._moreInfoType = undefined;
    }
  }

  protected render() {
    if (!this.hass || !this.stateObj) {
      return nothing;
    }
    return html`${this._moreInfoType
      ? dynamicElement(this._moreInfoType, {
          hass: this.hass,
          stateObj: this._groupDomainStateObj,
        })
      : ""}
    ${this.stateObj.attributes.entity_id.map((entity_id) => {
      const entityState = this.hass!.states[entity_id];
      if (!entityState) {
        return "";
      }
      return html`
        <state-card-content
          .stateObj=${entityState}
          .hass=${this.hass}
        ></state-card-content>
      `;
    })}`;
  }

  static get styles(): CSSResultGroup {
    return [
      moreInfoControlStyle,
      css`
        state-card-content {
          display: block;
          margin-top: 8px;
        }
      `,
    ];
  }
}

customElements.define("more-info-group", MoreInfoGroup);

declare global {
  interface HTMLElementTagNameMap {
    "more-info-group": MoreInfoGroup;
  }
}
