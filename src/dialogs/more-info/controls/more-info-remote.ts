import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-attributes";
import "../../../components/ha-paper-dropdown-menu";
import { RemoteEntity, REMOTE_SUPPORT_ACTIVITY } from "../../../data/remote";
import { HomeAssistant } from "../../../types";

const filterExtraAttributes = "activity_list,current_activity";

@customElement("more-info-remote")
class MoreInfoRemote extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public stateObj?: RemoteEntity;

  protected render(): TemplateResult {
    if (!this.hass || !this.stateObj) {
      return html``;
    }

    const stateObj = this.stateObj;

    return html`
      ${supportsFeature(stateObj, REMOTE_SUPPORT_ACTIVITY)
        ? html`
            <ha-paper-dropdown-menu
              .label=${this.hass!.localize(
                "ui.dialogs.more_info_control.remote.activity"
              )}
            >
              <paper-listbox
                slot="dropdown-content"
                .selected=${stateObj.attributes.current_activity}
                @iron-select=${this.handleActivityChanged}
                attr-for-selected="item-name"
              >
                ${stateObj.attributes.activity_list!.map(
                  (activity) => html`
                    <paper-item .itemName=${activity}> ${activity} </paper-item>
                  `
                )}
              </paper-listbox>
            </ha-paper-dropdown-menu>
          `
        : ""}

      <ha-attributes
        .hass=${this.hass}
        .stateObj=${this.stateObj}
        .extraFilters=${filterExtraAttributes}
      ></ha-attributes>
    `;
  }

  private handleActivityChanged(ev: CustomEvent) {
    const oldVal = this.stateObj!.attributes.current_activity;
    const newVal = ev.detail.item.itemName;

    if (!newVal || oldVal === newVal) {
      return;
    }

    this.hass.callService("remote", "turn_on", {
      entity_id: this.stateObj!.entity_id,
      activity: newVal,
    });
  }

  static get styles(): CSSResultGroup {
    return css`
      paper-item {
        cursor: pointer;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-remote": MoreInfoRemote;
  }
}
