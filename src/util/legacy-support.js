/**
 * Provide legacy support to HTML imports by exposing Polymer and
 * Polymer.Element on the window object.
 */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import { Polymer } from "@polymer/polymer/polymer-legacy";
import { html } from "@polymer/polymer/lib/utils/html-tag";

Polymer.Element = PolymerElement;
Polymer.html = html;
window.Polymer = Polymer;
