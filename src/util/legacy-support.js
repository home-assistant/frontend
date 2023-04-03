/**
 * Provide legacy support to HTML imports by exposing Polymer and
 * Polymer.Element on the window object.
 */
/* eslint-plugin-disable lit */
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";
import { Polymer } from "@polymer/polymer/polymer-legacy";

const message =
  "WARNING: Polymer will be removed from window in Home Assistant 2023.5. More info: https://developers.home-assistant.io/blog/2023/04/04/deprecating_polymer";

const handler = {
  get(target, prop, receiver) {
    // eslint-disable-next-line no-console
    console.warn(message);
    document
      .querySelector("home-assistant")
      .dispatchEvent(new CustomEvent("write_log", { detail: { message } }));
    return Reflect.get(target, prop, receiver);
  },
  apply: function (target, thisArg, argumentsList) {
    // eslint-disable-next-line no-console
    console.warn(message);
    document
      .querySelector("home-assistant")
      .dispatchEvent(new CustomEvent("write_log", { detail: { message } }));
    return Reflect.apply(target, thisArg, argumentsList);
  },
};

Polymer.Element = PolymerElement;
Polymer.html = html;

window.Polymer = new Proxy(Polymer, handler);
