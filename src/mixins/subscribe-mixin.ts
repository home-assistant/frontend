import {
  LitElement,
  Constructor,
  PropertyValues,
  PropertyDeclarations,
} from "lit-element";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { HomeAssistant } from "../types";

export interface HassSubscribeElement {
  hassSubscribe(): UnsubscribeFunc[];
}

/* tslint:disable-next-line */
export const SubscribeMixin = <T extends LitElement>(
  superClass: Constructor<T>
): Constructor<T & HassSubscribeElement> =>
  // @ts-ignore
  class extends superClass {
    private hass?: HomeAssistant;
    /* tslint:disable-next-line */
    private __unsubs?: UnsubscribeFunc[];

    static get properties(): PropertyDeclarations {
      return {
        hass: {},
      };
    }

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
      super.hassSubscribe();
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
  };
