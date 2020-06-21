import {
  LitElement,
  TemplateResult,
  css,
  property,
  PropertyValues,
  html,
  customElement,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";

// Adapted from polymer element https://github.com/PolymerElements/ha-spinner
/**
@license
Copyright (c) 2015 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at
http://polymer.github.io/LICENSE.txt The complete set of authors may be found at
http://polymer.github.io/AUTHORS.txt The complete set of contributors may be
found at http://polymer.github.io/CONTRIBUTORS.txt Code distributed by Google as
part of the polymer project is also subject to an additional IP rights grant
found at http://polymer.github.io/PATENTS.txt
*/

@customElement("ha-spinner")
class HaSpinner extends LitElement {
  @property({ type: Boolean })
  public active = false;

  @property({ type: Boolean })
  private _coolingDown = false;

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    if (!changedProps.has("active")) {
      return;
    }

    const oldActive = changedProps.get("active") as boolean;
    this._coolingDown = !this.active && oldActive;
  }

  protected render(): TemplateResult | void {
    // prettier-ignore
    // No white space allowed between elements.
    return html`
      <div
        id="spinnerContainer"
        class=${classMap({
          active: this.active || this._coolingDown,
          cooldown: this._coolingDown,
        })}
        @animationend=${this._reset}
        @webkit-animation-end=${this._reset}
      ><div class="spinner-layer"
        ><div class="circle-clipper left"><div class="circle"></div></div
        ><div class="circle-clipper right"><div class="circle"></div></div
      ></div></div>
    `;
  }

  private _reset() {
    this.active = false;
    this._coolingDown = false;
  }

  static get styles() {
    return css`
      /*
    /**************************/
      /* STYLES FOR THE SPINNER */
      /**************************/

      /*
     * Constants:
     *      ARCSIZE     = 270 degrees (amount of circle the arc takes up)
     *      ARCTIME     = 1333ms (time it takes to expand and contract arc)
     *      ARCSTARTROT = 216 degrees (how much the start location of the arc
     *                                should rotate each time, 216 gives us a
     *                                5 pointed star shape (it's 360/5 * 3).
     *                                For a 7 pointed star, we might do
     *                                360/7 * 3 = 154.286)
     *      SHRINK_TIME = 400ms
     */

      :host {
        display: inline-block;
        position: relative;
        width: 28px;
        height: 28px;

        /* 360 * ARCTIME / (ARCSTARTROT + (360-ARCSIZE)) */
        --paper-spinner-container-rotation-duration: 1568ms;

        /* ARCTIME */
        --paper-spinner-expand-contract-duration: 1333ms;

        /* 4 * ARCTIME */
        --paper-spinner-full-cycle-duration: 5332ms;

        /* SHRINK_TIME */
        --paper-spinner-cooldown-duration: 400ms;
      }

      #spinnerContainer {
        width: 100%;
        height: 100%;

        /* The spinner does not have any contents that would have to be
       * flipped if the direction changes. Always use ltr so that the
       * style works out correctly in both cases. */
        direction: ltr;
      }

      #spinnerContainer.active {
        -webkit-animation: container-rotate
          var(--paper-spinner-container-rotation-duration) linear infinite;
        animation: container-rotate
          var(--paper-spinner-container-rotation-duration) linear infinite;
      }

      @-webkit-keyframes container-rotate {
        to {
          -webkit-transform: rotate(360deg);
        }
      }

      @keyframes container-rotate {
        to {
          transform: rotate(360deg);
        }
      }

      .spinner-layer {
        position: absolute;
        width: 100%;
        height: 100%;
        opacity: 0;
        white-space: nowrap;
        color: var(--paper-spinner-color, var(--google-blue-500));
      }

      .layer-1 {
        color: var(--paper-spinner-layer-1-color, var(--google-blue-500));
      }

      .layer-2 {
        color: var(--paper-spinner-layer-2-color, var(--google-red-500));
      }

      .layer-3 {
        color: var(--paper-spinner-layer-3-color, var(--google-yellow-500));
      }

      .layer-4 {
        color: var(--paper-spinner-layer-4-color, var(--google-green-500));
      }

      /**
     * IMPORTANT NOTE ABOUT CSS ANIMATION PROPERTIES (keanulee):
     *
     * iOS Safari (tested on iOS 8.1) does not handle animation-delay very well - it doesn't
     * guarantee that the animation will start _exactly_ after that value. So we avoid using
     * animation-delay and instead set custom keyframes for each color (as layer-2undant as it
     * seems).
     */
      .active .spinner-layer {
        -webkit-animation-name: fill-unfill-rotate;
        -webkit-animation-duration: var(--paper-spinner-full-cycle-duration);
        -webkit-animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        -webkit-animation-iteration-count: infinite;
        animation-name: fill-unfill-rotate;
        animation-duration: var(--paper-spinner-full-cycle-duration);
        animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        animation-iteration-count: infinite;
        opacity: 1;
      }

      .active .spinner-layer.layer-1 {
        -webkit-animation-name: fill-unfill-rotate, layer-1-fade-in-out;
        animation-name: fill-unfill-rotate, layer-1-fade-in-out;
      }

      .active .spinner-layer.layer-2 {
        -webkit-animation-name: fill-unfill-rotate, layer-2-fade-in-out;
        animation-name: fill-unfill-rotate, layer-2-fade-in-out;
      }

      .active .spinner-layer.layer-3 {
        -webkit-animation-name: fill-unfill-rotate, layer-3-fade-in-out;
        animation-name: fill-unfill-rotate, layer-3-fade-in-out;
      }

      .active .spinner-layer.layer-4 {
        -webkit-animation-name: fill-unfill-rotate, layer-4-fade-in-out;
        animation-name: fill-unfill-rotate, layer-4-fade-in-out;
      }

      @-webkit-keyframes fill-unfill-rotate {
        12.5% {
          -webkit-transform: rotate(135deg);
        } /* 0.5 * ARCSIZE */
        25% {
          -webkit-transform: rotate(270deg);
        } /* 1   * ARCSIZE */
        37.5% {
          -webkit-transform: rotate(405deg);
        } /* 1.5 * ARCSIZE */
        50% {
          -webkit-transform: rotate(540deg);
        } /* 2   * ARCSIZE */
        62.5% {
          -webkit-transform: rotate(675deg);
        } /* 2.5 * ARCSIZE */
        75% {
          -webkit-transform: rotate(810deg);
        } /* 3   * ARCSIZE */
        87.5% {
          -webkit-transform: rotate(945deg);
        } /* 3.5 * ARCSIZE */
        to {
          -webkit-transform: rotate(1080deg);
        } /* 4   * ARCSIZE */
      }

      @keyframes fill-unfill-rotate {
        12.5% {
          transform: rotate(135deg);
        } /* 0.5 * ARCSIZE */
        25% {
          transform: rotate(270deg);
        } /* 1   * ARCSIZE */
        37.5% {
          transform: rotate(405deg);
        } /* 1.5 * ARCSIZE */
        50% {
          transform: rotate(540deg);
        } /* 2   * ARCSIZE */
        62.5% {
          transform: rotate(675deg);
        } /* 2.5 * ARCSIZE */
        75% {
          transform: rotate(810deg);
        } /* 3   * ARCSIZE */
        87.5% {
          transform: rotate(945deg);
        } /* 3.5 * ARCSIZE */
        to {
          transform: rotate(1080deg);
        } /* 4   * ARCSIZE */
      }

      @-webkit-keyframes layer-1-fade-in-out {
        0% {
          opacity: 1;
        }
        25% {
          opacity: 1;
        }
        26% {
          opacity: 0;
        }
        89% {
          opacity: 0;
        }
        90% {
          opacity: 1;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes layer-1-fade-in-out {
        0% {
          opacity: 1;
        }
        25% {
          opacity: 1;
        }
        26% {
          opacity: 0;
        }
        89% {
          opacity: 0;
        }
        90% {
          opacity: 1;
        }
        to {
          opacity: 1;
        }
      }

      @-webkit-keyframes layer-2-fade-in-out {
        0% {
          opacity: 0;
        }
        15% {
          opacity: 0;
        }
        25% {
          opacity: 1;
        }
        50% {
          opacity: 1;
        }
        51% {
          opacity: 0;
        }
        to {
          opacity: 0;
        }
      }

      @keyframes layer-2-fade-in-out {
        0% {
          opacity: 0;
        }
        15% {
          opacity: 0;
        }
        25% {
          opacity: 1;
        }
        50% {
          opacity: 1;
        }
        51% {
          opacity: 0;
        }
        to {
          opacity: 0;
        }
      }

      @-webkit-keyframes layer-3-fade-in-out {
        0% {
          opacity: 0;
        }
        40% {
          opacity: 0;
        }
        50% {
          opacity: 1;
        }
        75% {
          opacity: 1;
        }
        76% {
          opacity: 0;
        }
        to {
          opacity: 0;
        }
      }

      @keyframes layer-3-fade-in-out {
        0% {
          opacity: 0;
        }
        40% {
          opacity: 0;
        }
        50% {
          opacity: 1;
        }
        75% {
          opacity: 1;
        }
        76% {
          opacity: 0;
        }
        to {
          opacity: 0;
        }
      }

      @-webkit-keyframes layer-4-fade-in-out {
        0% {
          opacity: 0;
        }
        65% {
          opacity: 0;
        }
        75% {
          opacity: 1;
        }
        90% {
          opacity: 1;
        }
        to {
          opacity: 0;
        }
      }

      @keyframes layer-4-fade-in-out {
        0% {
          opacity: 0;
        }
        65% {
          opacity: 0;
        }
        75% {
          opacity: 1;
        }
        90% {
          opacity: 1;
        }
        to {
          opacity: 0;
        }
      }

      .circle-clipper {
        display: inline-block;
        position: relative;
        width: 50%;
        height: 100%;
        overflow: hidden;
      }

      /**
     * Patch the gap that appear between the two adjacent div.circle-clipper while the
     * spinner is rotating (appears on Chrome 50, Safari 9.1.1, and Edge).
     */
      .spinner-layer::after {
        content: "";
        left: 45%;
        width: 10%;
        border-top-style: solid;
      }

      .spinner-layer::after,
      .circle-clipper .circle {
        box-sizing: border-box;
        position: absolute;
        top: 0;
        border-width: var(--paper-spinner-stroke-width, 3px);
        border-radius: 50%;
      }

      .circle-clipper .circle {
        bottom: 0;
        width: 200%;
        border-style: solid;
        border-bottom-color: transparent !important;
      }

      .circle-clipper.left .circle {
        left: 0;
        border-right-color: transparent !important;
        -webkit-transform: rotate(129deg);
        transform: rotate(129deg);
      }

      .circle-clipper.right .circle {
        left: -100%;
        border-left-color: transparent !important;
        -webkit-transform: rotate(-129deg);
        transform: rotate(-129deg);
      }

      .active .gap-patch::after,
      .active .circle-clipper .circle {
        -webkit-animation-duration: var(
          --paper-spinner-expand-contract-duration
        );
        -webkit-animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        -webkit-animation-iteration-count: infinite;
        animation-duration: var(--paper-spinner-expand-contract-duration);
        animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        animation-iteration-count: infinite;
      }

      .active .circle-clipper.left .circle {
        -webkit-animation-name: left-spin;
        animation-name: left-spin;
      }

      .active .circle-clipper.right .circle {
        -webkit-animation-name: right-spin;
        animation-name: right-spin;
      }

      @-webkit-keyframes left-spin {
        0% {
          -webkit-transform: rotate(130deg);
        }
        50% {
          -webkit-transform: rotate(-5deg);
        }
        to {
          -webkit-transform: rotate(130deg);
        }
      }

      @keyframes left-spin {
        0% {
          transform: rotate(130deg);
        }
        50% {
          transform: rotate(-5deg);
        }
        to {
          transform: rotate(130deg);
        }
      }

      @-webkit-keyframes right-spin {
        0% {
          -webkit-transform: rotate(-130deg);
        }
        50% {
          -webkit-transform: rotate(5deg);
        }
        to {
          -webkit-transform: rotate(-130deg);
        }
      }

      @keyframes right-spin {
        0% {
          transform: rotate(-130deg);
        }
        50% {
          transform: rotate(5deg);
        }
        to {
          transform: rotate(-130deg);
        }
      }

      #spinnerContainer.cooldown {
        -webkit-animation: container-rotate
            var(--paper-spinner-container-rotation-duration) linear infinite,
          fade-out var(--paper-spinner-cooldown-duration)
            cubic-bezier(0.4, 0, 0.2, 1);
        animation: container-rotate
            var(--paper-spinner-container-rotation-duration) linear infinite,
          fade-out var(--paper-spinner-cooldown-duration)
            cubic-bezier(0.4, 0, 0.2, 1);
      }

      @-webkit-keyframes fade-out {
        0% {
          opacity: 1;
        }
        to {
          opacity: 0;
        }
      }

      @keyframes fade-out {
        0% {
          opacity: 1;
        }
        to {
          opacity: 0;
        }
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-spinner": HaSpinner;
  }
}
