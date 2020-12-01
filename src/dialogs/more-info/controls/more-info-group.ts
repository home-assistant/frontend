import { HassEntity } from "home-assistant-js-websocket";
import {
  LitElement,
  property,
  CSSResult,
  css,
  internalProperty,
  PropertyValues,
} from "lit-element";
import { html, TemplateResult } from "lit-html";
import { dynamicElement } from "../../../common/dom/dynamic-element-directive";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { GroupEntity } from "../../../data/group";
import "../../../state-summary/state-card-content";
import { HomeAssistant } from "../../../types";
import {
  importMoreInfoControl,
  domainMoreInfoType,
} from "../state_more_info_control";

class MoreInfoGroup extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public stateObj?: GroupEntity;

  @internalProperty() private _groupDomainStateObj?: HassEntity;

  @internalProperty() private _moreInfoType?: string;

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
      .filter((state) => state);

    if (!states.length) {
      this._groupDomainStateObj = undefined;
      this._moreInfoType = undefined;
      return;
    }

    const baseStateObj = states.find((s) => s.state === "on") || states[0];
    const groupDomain = computeStateDomain(baseStateObj);

    // Groups need to be filtered out or we'll show content of
    // first child above the children of the current group
    if (
      groupDomain !== "group" &&
      states.every((state) => groupDomain === computeStateDomain(state))
    ) {
      this._groupDomainStateObj = {
        ...baseStateObj,
        entity_id: this.stateObj.entity_id,
        attributes: { ...baseStateObj.attributes },
      };
      const type = domainMoreInfoType(groupDomain);
      importMoreInfoControl(type);
      this._moreInfoType = type === "hidden" ? undefined : `more-info-${type}`;
    } else {
      this._groupDomainStateObj = undefined;
      this._moreInfoType = undefined;
    }
  }

  protected render(): TemplateResult {
    if (!this.hass || !this.stateObj) {
      return html``;
    }
    return html`${this._moreInfoType
      ? dynamicElement(this._moreInfoType, {
          hass: this.hass,
          stateObj: this._groupDomainStateObj,
        })
      : ""}
    ${this.stateObj.attributes.entity_id.map((entity_id) => {
      const state = this.hass!.states[entity_id];
      if (!state) {
        return "";
      }
      return html`
        <state-card-content
          .stateObj=${state}
          .hass=${this.hass}
        ></state-card-content>
      `;
    })}`;
  }

  static get styles(): CSSResult {
    return css`
      state-card-content {
        display: block;
        margin-top: 8px;
      }
    `;
  }
}

customElements.define("more-info-group", MoreInfoGroup);

declare global {
  interface HTMLElementTagNameMap {
    "more-info-group": MoreInfoGroup;
  }
}
