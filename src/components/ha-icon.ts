import { Constructor } from "../types";

import "@polymer/iron-icon/iron-icon";
// Not duplicate, this is for typing.
// tslint:disable-next-line
import { IronIconElement } from "@polymer/iron-icon/iron-icon";
import { html } from "@polymer/polymer/lib/utils/html-tag.js";

const ironIconClass = customElements.get("iron-icon") as Constructor<
  IronIconElement
>;

let loaded = false;

export class HaIcon extends ironIconClass {
  public _template = html`
    ${super._template}
    <style>
      :host([effect="rotate-45"]) {
        -webkit-transform: rotate(45deg);
        -ms-transform: rotate(45deg);
        transform: rotate(45deg);
      }
      :host([effect="rotate-90"]) {
        -webkit-transform: rotate(90deg);
        -ms-transform: rotate(90deg);
        transform: rotate(90deg);
      }
      :host([effect="rotate-135"]) {
        -webkit-transform: rotate(135deg);
        -ms-transform: rotate(135deg);
        transform: rotate(135deg);
      }
      :host([effect="rotate-180"]) {
        -webkit-transform: rotate(180deg);
        -ms-transform: rotate(180deg);
        transform: rotate(180deg);
      }
      :host([effect="rotate-225"]) {
        -webkit-transform: rotate(225deg);
        -ms-transform: rotate(225deg);
        transform: rotate(225deg);
      }
      :host([effect="rotate-270"]) {
        -webkit-transform: rotate(270deg);
        -ms-transform: rotate(270deg);
        transform: rotate(270deg);
      }
      :host([effect="rotate-315"]) {
        -webkit-transform: rotate(315deg);
        -ms-transform: rotate(315deg);
        transform: rotate(315deg);
      }

      :host([effect="flip-h"]) {
        -webkit-transform: scaleX(-1);
        transform: scaleX(-1);
        filter: FlipH;
        -ms-filter: "FlipH";
      }
      :host([effect="flip-v"]) {
        -webkit-transform: scaleY(-1);
        transform: scaleY(-1);
        filter: FlipV;
        -ms-filter: "FlipV";
      }

      @-webkit-keyframes spin {
        0% {
          -webkit-transform: rotate(0deg);
          transform: rotate(0deg);
        }
        100% {
          -webkit-transform: rotate(359deg);
          transform: rotate(359deg);
        }
      }
      @keyframes spin {
        0% {
          -webkit-transform: rotate(0deg);
          transform: rotate(0deg);
        }
        100% {
          -webkit-transform: rotate(359deg);
          transform: rotate(359deg);
        }
      }
      :host([effect="spin"]) {
        -webkit-animation: spin 2s infinite linear;
        animation: spin 2s infinite linear;
      }
    </style>
  `;

  public _iconName?: string;
  public _iconsetName?: string;
  private _iconEffect?: string;

  public listen(
    node: EventTarget | null,
    eventName: string,
    methodName: string
  ): void {
    super.listen(node, eventName, methodName);

    if (!loaded && this._iconsetName === "mdi") {
      loaded = true;
      import(/* webpackChunkName: "mdi-icons" */ "../resources/mdi-icons");
    }
  }

  public _iconChanged(icon) {
    const parts = (icon || "").split(":");
    if (parts.length === 3) {
      this._iconEffect = parts.pop();
    }
    this._iconName = parts.pop();
    this._iconsetName = parts.pop() || this._DEFAULT_ICONSET;
    if (this._iconEffect) {
      this.setAttribute("effect", this._iconEffect);
    } else {
      this.removeAttribute("effect");
    }
    this._updateIcon();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-icon": HaIcon;
  }
}

customElements.define("ha-icon", HaIcon);
