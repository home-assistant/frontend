import { LitElement, nothing } from "lit";
import type { HassEntity, HassServices } from "home-assistant-js-websocket";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../common/decorators/consume";
import { consumeEntityStates } from "../common/decorators/consume-context-entry";
import { dynamicElement } from "../common/dom/dynamic-element-directive";
import { stateCardType } from "../common/entity/state_card_type";
import { servicesContext } from "../data/context";
import "./state-card-alert";
import "./state-card-button";
import "./state-card-climate";
import "./state-card-configurator";
import "./state-card-cover";
import "./state-card-display";
import "./state-card-event";
import "./state-card-humidifier";
import "./state-card-input_button";
import "./state-card-input_number";
import "./state-card-input_select";
import "./state-card-input_text";
import "./state-card-lawn_mower";
import "./state-card-lock";
import "./state-card-media_player";
import "./state-card-number";
import "./state-card-scene";
import "./state-card-script";
import "./state-card-select";
import "./state-card-text";
import "./state-card-timer";
import "./state-card-toggle";
import "./state-card-update";
import "./state-card-vacuum";
import "./state-card-water_heater";

@customElement("state-card-content")
class StateCardContent extends LitElement {
  @property({ attribute: false }) public stateObj!: HassEntity;

  @property({ attribute: "in-dialog", type: Boolean }) public inDialog = false;

  @state()
  @consume({ context: servicesContext, subscribe: true })
  private _services?: HassServices | null;

  @state()
  @consumeEntityStates({
    entityIdPath: ["stateObj", "attributes", "entity_id"],
  })
  private _memberStates?: Record<string, HassEntity>;

  protected render() {
    let stateCard: string;
    if (!this.stateObj) return nothing;
    if (
      this.stateObj.attributes &&
      "custom_ui_state_card" in this.stateObj.attributes
    ) {
      stateCard = this.stateObj.attributes.custom_ui_state_card;
    } else {
      stateCard =
        "state-card-" +
        stateCardType(
          this._memberStates ?? {},
          this._services ?? {},
          this.stateObj
        );
    }

    return dynamicElement(stateCard, {
      stateObj: this.stateObj,
      inDialog: this.inDialog,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "state-card-content": StateCardContent;
  }
}
