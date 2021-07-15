import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { PropertyValues, ReactiveElement } from "lit";
import { property } from "lit/decorators";
import { Constructor, HomeAssistant } from "../types";

export interface HassSubscribeElement {
  hassSubscribe(): UnsubscribeFunc[];
}

export const SubscribeMixin = <T extends Constructor<ReactiveElement>>(
  superClass: T
) => {
  class SubscribeClass extends superClass {
    @property({ attribute: false }) public hass?: HomeAssistant;

    private __unsubs?: Array<UnsubscribeFunc | Promise<UnsubscribeFunc>>;

    public connectedCallback() {
      super.connectedCallback();
      this.__checkSubscribed();
    }

    public disconnectedCallback() {
      super.disconnectedCallback();
      if (this.__unsubs) {
        while (this.__unsubs.length) {
          const unsub = this.__unsubs.pop()!;
          if (unsub instanceof Promise) {
            unsub.then((unsubFunc) => unsubFunc());
          } else {
            unsub();
          }
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

    protected hassSubscribe(): Array<
      UnsubscribeFunc | Promise<UnsubscribeFunc>
    > {
      return [];
    }

    private __checkSubscribed(): void {
      if (
        this.__unsubs !== undefined ||
        !(this as unknown as Element).isConnected ||
        this.hass === undefined
      ) {
        return;
      }
      this.__unsubs = this.hassSubscribe();
    }
  }
  return SubscribeClass;
};
