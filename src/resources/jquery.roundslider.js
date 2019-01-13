import { html } from "lit-element";
// jQuery import should come before plugin import
import { jQuery as jQuery_ } from "./jquery";
import "round-slider";
// eslint-disable-next-line
import roundSliderCSS from "round-slider/dist/roundslider.min.css";

export const jQuery = jQuery_;

export const roundSliderStyle = html`
  <style>
    ${roundSliderCSS}
  </style>
`;
