/**
 * Provide legacy support to HTML imports by exposing Polymer and
 * Polymer.Element on the window object.
 */
/* eslint-plugin-disable lit */
import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";
import { Polymer } from "@polymer/polymer/polymer-legacy.js";

Polymer.Element = PolymerElement;
Polymer.html = html;
window.Polymer = Polymer;
