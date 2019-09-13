import { LitElement, Constructor, PropertyValues } from "lit-element";
import { UnsubscribeFunc } from "home-assistant-js-websocket";

export interface HassSubscribeElement {
  hassSubscribe(): UnsubscribeFunc[];
}

/* tslint:disable-next-line */
export const SubscribeMixin = <T extends LitElement>(
  superClass: Constructor<T>
): Constructor<T & HassSubscribeElement> =>
  // @ts-ignore
  class extends superClass {
    private _unsubs?: UnsubscribeFunc[];

    public connectedCallback() {
      super.connectedCallback();
      this._subscribe();
    }

    public disconnectedCallback() {
      super.disconnectedCallback();
      if (this._unsubs) {
        while (this._unsubs.length) {
          this._unsubs.pop()!();
        }
        this._unsubs = undefined;
      }
    }

    protected updated(changedProps: PropertyValues) {
      super.updated(changedProps);
      if (changedProps.has("hass")) {
        this._subscribe();
      }
    }

    private _subscribe(): void {
      if (
        this._unsubs ||
        !((this as unknown) as Element).isConnected ||
        !super.hass
      ) {
        return;
      }

      this._unsubs = super.hassSubscribe();
    }
  };
