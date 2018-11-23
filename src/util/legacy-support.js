/**
 * Provide legacy support to HTML imports by exposing Polymer and
 * Polymer.Element on the window object.
 */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import { Polymer } from "@polymer/polymer/polymer-legacy";
import { html as polymerHtml } from "@polymer/polymer/lib/utils/html-tag";
import { html as litHtml, LitElement } from "@polymer/lit-element";

Polymer.Element = PolymerElement;
Polymer.html = polymerHtml;
window.Polymer = Polymer;

LitElement.html = litHtml;
window.LitElement = LitElement;
