import { PropertyValues, property, UpdatingElement } from "lit-element";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { HomeAssistant, Constructor } from "../types";

export interface HassSubscribeElement {
  hassSubscribe(): UnsubscribeFunc[];
}

/* tslint:disable-next-line:variable-name */
export const SubscribeMixin = <T extends Constructor<UpdatingElement>>(
  superClass: T
) => {
  class SubscribeClass extends superClass {
    @property() public hass?: HomeAssistant;

    /* tslint:disable-next-line:variable-name */
    private __unsubs?: UnsubscribeFunc[];

    public connectedCallback() {
      super.connectedCallback();
      this.__checkSubscribed();
    }

    public disconnectedCallback() {
      super.disconnectedCallback();
      if (this.__unsubs) {
        while (this.__unsubs.length) {
          this.__unsubs.pop()!();
        }
        this.__unsubs = undefined;
      }
    }

    protected updated(changedProps: PropertyValues) {
      super.updated(changedProps);
      if (changedProps.has("hass")) {
        this.__checkSubscribed();
      }
    }

    protected hassSubscribe(): UnsubscribeFunc[] {
      return [];
    }

    private __checkSubscribed(): void {
      if (
        this.__unsubs !== undefined ||
        !((this as unknown) as Element).isConnected ||
        this.hass === undefined
      ) {
        return;
      }
      this.__unsubs = this.hassSubscribe();
    }
  }
  return SubscribeClass;
};
