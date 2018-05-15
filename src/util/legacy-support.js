/**
 * Provide legacy support to HTML imports by exposing Polymer and
 * Polymer.Element on the window object.
 */
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import { Polymer } from '@polymer/polymer/polymer-legacy.js';

Polymer.Element = PolymerElement;
window.Polymer = Polymer;
