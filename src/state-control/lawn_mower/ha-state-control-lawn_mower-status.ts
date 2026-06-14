import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { stateColorCss } from "../../common/entity/state_color";
import { UNAVAILABLE } from "../../data/entity/entity";
import type { LawnMowerEntity } from "../../data/lawn_mower";
import { isMowing } from "../../data/lawn_mower";
import type { HomeAssistant } from "../../types";

type LawnMowerVisualState =
  | "mowing"
  | "docked"
  | "returning"
  | "paused"
  | "error"
  | "idle";

const computeVisualState = (
  stateObj: LawnMowerEntity
): LawnMowerVisualState => {
  if (stateObj.state === UNAVAILABLE) {
    return "idle";
  }
  if (stateObj.state === "error") {
    return "error";
  }
  if (isMowing(stateObj)) {
    return "mowing";
  }
  if (stateObj.state === "returning") {
    return "returning";
  }
  if (stateObj.state === "paused") {
    return "paused";
  }
  if (stateObj.state === "docked") {
    return "docked";
  }
  return "idle";
};

@customElement("ha-state-control-lawn_mower-status")
export class HaStateControlLawnMowerStatus extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: LawnMowerEntity;

  protected render(): TemplateResult {
    const visualState = computeVisualState(this.stateObj);
    const color = stateColorCss(this.stateObj);

    const style = {
      "--mower-color": color || "var(--state-inactive-color)",
    };

    return html`
      <div class="container ${visualState}" style=${styleMap(style)}>
        <svg
          viewBox="0 0 240 240"
          xmlns="http://www.w3.org/2000/svg"
          class="mower-svg"
        >
          <!-- Soft background glow -->
          <circle
            cx="120"
            cy="120"
            r="110"
            class="glow"
            fill="var(--mower-color)"
            opacity="0.06"
          />

          <!-- Dock station -->
          <g class="dock-indicator">
            <rect
              x="80"
              y="188"
              width="80"
              height="24"
              rx="7"
              fill="var(--card-background-color, #fff)"
              stroke="var(--mower-color)"
              stroke-width="2"
            />
          </g>

          <!-- Return arrow (returning state) -->
          <g class="return-path">
            <polygon
              points="120,220 110,208 130,208"
              fill="var(--mower-color)"
              stroke="var(--mower-color)"
              stroke-width="2"
              stroke-linejoin="round"
              opacity="0.55"
            />
          </g>

          <!-- Robot body group -->
          <g class="mower-body-rotate">
            <g class="mower-body">
              <!-- Blade disc (underneath body, low opacity) -->
              <g class="blade-disc">
                <circle
                  cx="120"
                  cy="130"
                  r="46"
                  fill="none"
                  stroke="var(--mower-color)"
                  stroke-width="1.5"
                  stroke-dasharray="8 6"
                />
                <circle cx="120" cy="130" r="6" fill="var(--mower-color)" />
                <!-- 3 blade arms at 120deg intervals -->
                <line
                  x1="120"
                  y1="130"
                  x2="120"
                  y2="88"
                  stroke="var(--mower-color)"
                  stroke-width="2"
                  stroke-linecap="round"
                />
                <line
                  x1="120"
                  y1="130"
                  x2="156"
                  y2="151"
                  stroke="var(--mower-color)"
                  stroke-width="2"
                  stroke-linecap="round"
                />
                <line
                  x1="120"
                  y1="130"
                  x2="84"
                  y2="151"
                  stroke="var(--mower-color)"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </g>

              <!-- Rear wheels -->
              <g class="wheel wheel-left">
                <rect
                  x="50"
                  y="144"
                  width="12"
                  height="40"
                  rx="5"
                  fill="var(--card-background-color, #fff)"
                  stroke="var(--mower-color)"
                  stroke-width="1.5"
                  opacity="0.7"
                />
                <line
                  class="tread"
                  x1="56"
                  y1="148"
                  x2="56"
                  y2="180"
                  stroke="var(--mower-color)"
                  stroke-width="6"
                  stroke-dasharray="3 3"
                  stroke-linecap="butt"
                  opacity="0.12"
                />
              </g>
              <g class="wheel wheel-right">
                <rect
                  x="178"
                  y="144"
                  width="12"
                  height="40"
                  rx="5"
                  fill="var(--card-background-color, #fff)"
                  stroke="var(--mower-color)"
                  stroke-width="1.5"
                  opacity="0.7"
                />
                <line
                  class="tread"
                  x1="184"
                  y1="148"
                  x2="184"
                  y2="180"
                  stroke="var(--mower-color)"
                  stroke-width="6"
                  stroke-dasharray="3 3"
                  stroke-linecap="butt"
                  opacity="0.12"
                />
              </g>

              <!-- D-shaped body shell -->
              <path
                d="M 64,98
                   C 64,50 176,50 176,98
                   L 176,168
                   C 176,180 168,186 158,186
                   L 82,186
                   C 72,186 64,180 64,168 Z"
                fill="var(--card-background-color, #fff)"
                stroke="var(--mower-color)"
                stroke-width="2"
                class="body-shell"
              />

              <!-- Inner body ring -->
              <path
                d="M 74,102
                   C 74,60 166,60 166,102
                   L 166,162
                   C 166,172 160,176 152,176
                   L 88,176
                   C 80,176 74,172 74,162 Z"
                fill="none"
                stroke="var(--mower-color)"
                stroke-width="0.8"
                opacity="0.2"
              />

              <!-- Front bumper band -->
              <path
                d="M 64,102
                   C 64,52 176,52 176,102"
                fill="none"
                stroke="var(--mower-color)"
                stroke-width="4"
                stroke-linecap="round"
                class="bumper"
              />

              <!-- Bumper highlight -->
              <path
                d="M 72,100
                   C 72,58 168,58 168,100"
                fill="none"
                stroke="var(--mower-color)"
                stroke-width="1"
                stroke-linecap="round"
                opacity="0.15"
              />

              <!-- Bumper sensor dots -->
              <circle
                cx="92"
                cy="68"
                r="1.5"
                fill="var(--mower-color)"
                opacity="0.15"
              />
              <circle
                cx="120"
                cy="60"
                r="1.5"
                fill="var(--mower-color)"
                opacity="0.15"
              />
              <circle
                cx="148"
                cy="68"
                r="1.5"
                fill="var(--mower-color)"
                opacity="0.15"
              />

              <!-- LED power indicator -->
              <circle
                cx="120"
                cy="78"
                r="4"
                fill="var(--mower-color)"
                opacity="0.08"
                class="led-ring"
              />
              <circle
                cx="120"
                cy="78"
                r="2.5"
                fill="var(--mower-color)"
                opacity="0.5"
                class="led-dot"
              />

              <!-- Control panel area -->
              <circle
                cx="120"
                cy="148"
                r="8"
                fill="var(--mower-color)"
                opacity="0.06"
                class="power-ring"
              />
              <circle
                cx="120"
                cy="148"
                r="4"
                fill="var(--mower-color)"
                opacity="0.2"
                class="power-dot"
              />

              <!--
                Grass clippings - masked to only show outside the body.
                Inside mower-body group so they move with the wander animation.
              -->
              <mask id="outside-body">
                <rect width="240" height="240" fill="white" />
                <!-- Body + bumper silhouette -->
                <path
                  d="M 60,98
                     C 60,46 180,46 180,98
                     L 180,170
                     C 180,182 172,190 160,190
                     L 80,190
                     C 68,190 60,182 60,170 Z"
                  fill="black"
                />
              </mask>
              <g class="particles" mask="url(#outside-body)">
                <!-- Left discharge (5 curved grass blades near body edge) -->
                <path
                  class="grass g1"
                  d="M64,110 q-3,4 -1,8"
                  fill="none"
                  stroke="var(--mower-color)"
                  stroke-width="1.4"
                  stroke-linecap="round"
                />
                <path
                  class="grass g2"
                  d="M63,126 q-4,3 -2,8"
                  fill="none"
                  stroke="var(--mower-color)"
                  stroke-width="1.2"
                  stroke-linecap="round"
                />
                <path
                  class="grass g3"
                  d="M64,140 q-4,3 -2,8"
                  fill="none"
                  stroke="var(--mower-color)"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
                <path
                  class="grass g4"
                  d="M64,154 q-3,4 -1,8"
                  fill="none"
                  stroke="var(--mower-color)"
                  stroke-width="1.1"
                  stroke-linecap="round"
                />
                <path
                  class="grass g5"
                  d="M66,168 q-3,3 -1,8"
                  fill="none"
                  stroke="var(--mower-color)"
                  stroke-width="1.3"
                  stroke-linecap="round"
                />
                <!-- Right discharge (5 curved grass blades) -->
                <path
                  class="grass g6"
                  d="M176,110 q3,4 1,8"
                  fill="none"
                  stroke="var(--mower-color)"
                  stroke-width="1.4"
                  stroke-linecap="round"
                />
                <path
                  class="grass g7"
                  d="M177,126 q4,3 2,8"
                  fill="none"
                  stroke="var(--mower-color)"
                  stroke-width="1.2"
                  stroke-linecap="round"
                />
                <path
                  class="grass g8"
                  d="M176,140 q4,3 2,8"
                  fill="none"
                  stroke="var(--mower-color)"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
                <path
                  class="grass g9"
                  d="M176,154 q3,4 1,8"
                  fill="none"
                  stroke="var(--mower-color)"
                  stroke-width="1.1"
                  stroke-linecap="round"
                />
                <path
                  class="grass g10"
                  d="M174,168 q3,3 1,8"
                  fill="none"
                  stroke="var(--mower-color)"
                  stroke-width="1.3"
                  stroke-linecap="round"
                />
                <!-- Front spray (3 curved blades) -->
                <path
                  class="grass g11"
                  d="M90,68 q-3,-4 -1,-8"
                  fill="none"
                  stroke="var(--mower-color)"
                  stroke-width="1.3"
                  stroke-linecap="round"
                />
                <path
                  class="grass g12"
                  d="M120,54 q1,-4 -1,-8"
                  fill="none"
                  stroke="var(--mower-color)"
                  stroke-width="1.2"
                  stroke-linecap="round"
                />
                <path
                  class="grass g13"
                  d="M150,68 q3,-4 1,-8"
                  fill="none"
                  stroke="var(--mower-color)"
                  stroke-width="1.3"
                  stroke-linecap="round"
                />
                <!-- Rear spray (3 curved blades) -->
                <path
                  class="grass g14"
                  d="M92,186 q-3,4 -1,8"
                  fill="none"
                  stroke="var(--mower-color)"
                  stroke-width="1.3"
                  stroke-linecap="round"
                />
                <path
                  class="grass g15"
                  d="M120,186 q2,4 0,9"
                  fill="none"
                  stroke="var(--mower-color)"
                  stroke-width="1.1"
                  stroke-linecap="round"
                />
                <path
                  class="grass g16"
                  d="M148,186 q3,4 1,8"
                  fill="none"
                  stroke="var(--mower-color)"
                  stroke-width="1.3"
                  stroke-linecap="round"
                />
              </g>
            </g>
          </g>
        </svg>
      </div>
    `;
  }

  static styles: CSSResultGroup = css`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .container {
      width: 200px;
      height: 200px;
      position: relative;
    }

    .mower-svg {
      width: 100%;
      height: 100%;
    }

    /* -- Hide state-specific elements by default -- */
    .dock-indicator,
    .return-path,
    .particles {
      opacity: 0;
      transition: opacity 400ms ease;
    }

    /* Blade disc hidden by default */
    .blade-disc {
      opacity: 0;
      transition: opacity 400ms ease;
    }

    /* ======================== */
    /* MOWING                   */
    /* ======================== */
    .mowing .mower-body {
      animation: mower-wander 12s ease-in-out infinite;
      transform-origin: 120px 120px;
    }

    .mowing .blade-disc {
      opacity: 0.15;
      animation: blade-spin 0.8s linear infinite;
      transform-origin: 120px 130px;
    }

    .mowing .particles {
      opacity: 1;
    }

    .mowing .grass {
      animation: grass-eject var(--g-dur, 2s) ease-out infinite;
      animation-delay: var(--g-delay, 0s);
    }

    /* Left side (4 particles) */
    .mowing .g1 {
      --g-x: -36px;
      --g-y: -14px;
      --g-rot: -25deg;
      --g-dur: 1.8s;
      --g-delay: 0s;
    }
    .mowing .g2 {
      --g-x: -40px;
      --g-y: 6px;
      --g-rot: 18deg;
      --g-dur: 2.1s;
      --g-delay: -0.7s;
    }
    .mowing .g3 {
      --g-x: -34px;
      --g-y: 16px;
      --g-rot: 32deg;
      --g-dur: 1.9s;
      --g-delay: -1.3s;
    }
    .mowing .g4 {
      --g-x: -30px;
      --g-y: 22px;
      --g-rot: -15deg;
      --g-dur: 2.3s;
      --g-delay: -1.8s;
    }

    /* Right side (4 particles) */
    .mowing .g5 {
      --g-x: 36px;
      --g-y: -14px;
      --g-rot: 25deg;
      --g-dur: 1.8s;
      --g-delay: -0.3s;
    }
    .mowing .g6 {
      --g-x: 40px;
      --g-y: 6px;
      --g-rot: -18deg;
      --g-dur: 2.1s;
      --g-delay: -1s;
    }
    .mowing .g7 {
      --g-x: 34px;
      --g-y: 16px;
      --g-rot: -32deg;
      --g-dur: 1.9s;
      --g-delay: -1.6s;
    }
    .mowing .g8 {
      --g-x: 30px;
      --g-y: 22px;
      --g-rot: 15deg;
      --g-dur: 2.3s;
      --g-delay: -0.5s;
    }

    /* Front arc (5 particles) */
    .mowing .g9 {
      --g-x: -28px;
      --g-y: -30px;
      --g-rot: -40deg;
      --g-dur: 2s;
      --g-delay: -0.4s;
    }
    .mowing .g10 {
      --g-x: -12px;
      --g-y: -34px;
      --g-rot: -20deg;
      --g-dur: 1.8s;
      --g-delay: -1.1s;
    }
    .mowing .g11 {
      --g-x: 3px;
      --g-y: -36px;
      --g-rot: 8deg;
      --g-dur: 1.7s;
      --g-delay: -1.7s;
    }
    .mowing .g12 {
      --g-x: 14px;
      --g-y: -34px;
      --g-rot: 20deg;
      --g-dur: 1.8s;
      --g-delay: -0.2s;
    }
    .mowing .g13 {
      --g-x: 28px;
      --g-y: -30px;
      --g-rot: 40deg;
      --g-dur: 2s;
      --g-delay: -0.9s;
    }

    /* Rear (3 particles) */
    .mowing .g14 {
      --g-x: -16px;
      --g-y: 28px;
      --g-rot: 22deg;
      --g-dur: 2.2s;
      --g-delay: -0.8s;
    }
    .mowing .g15 {
      --g-x: 5px;
      --g-y: 30px;
      --g-rot: -8deg;
      --g-dur: 1.6s;
      --g-delay: -1.5s;
    }
    .mowing .g16 {
      --g-x: 16px;
      --g-y: 28px;
      --g-rot: -22deg;
      --g-dur: 2.2s;
      --g-delay: -0.4s;
    }

    .mowing .tread {
      animation: tread-scroll 0.4s linear infinite;
    }

    .mowing .led-dot {
      animation: led-pulse 2s ease-in-out infinite;
    }

    /* ======================== */
    /* RETURNING                */
    /* ======================== */
    .mower-body-rotate {
      transform-origin: 120px 120px;
      transform: rotate(0deg);
      transition: transform 600ms ease-in-out;
    }

    .returning .mower-body-rotate {
      transform: rotate(180deg);
    }

    .returning .mower-body {
      animation: returning-drift 3s ease-in-out infinite;
    }

    .returning .return-path {
      opacity: 1;
      animation: return-arrow 1.6s ease-in-out infinite;
      transform-origin: 120px 210px;
    }

    .returning .blade-disc {
      opacity: 0.06;
    }

    .returning .tread {
      animation: tread-scroll-reverse 0.6s linear infinite;
    }

    /* ======================== */
    /* DOCKED                   */
    /* ======================== */
    .docked .dock-indicator {
      opacity: 1;
    }

    .docked .mower-body {
      opacity: 0.75;
    }

    .docked .glow {
      animation: docked-glow 4s ease-in-out infinite;
    }

    .docked .power-ring {
      animation: charge-pulse 2.5s ease-in-out infinite;
    }

    .docked .led-dot {
      animation: charge-pulse 2.5s ease-in-out infinite;
    }

    /* ======================== */
    /* PAUSED                   */
    /* ======================== */
    .paused .mower-body {
      opacity: 0.7;
    }

    .paused .blade-disc {
      opacity: 0.04;
    }

    /* ======================== */
    /* ERROR                    */
    /* ======================== */
    .error .glow {
      animation: error-glow 1.8s ease-in-out infinite;
    }

    .error .led-dot {
      animation: error-led 0.8s ease-in-out infinite;
    }

    /* ======================== */
    /* IDLE                     */
    /* ======================== */
    .idle .mower-body {
      opacity: 0.65;
    }

    /* ============================== */
    /* KEYFRAME ANIMATIONS            */
    /* ============================== */

    @keyframes mower-wander {
      0% {
        transform: rotate(0deg) translate(0, 0);
      }
      15% {
        transform: rotate(0deg) translate(0, -30px);
      }
      25% {
        transform: rotate(0deg) translate(0, 0);
      }
      32% {
        transform: rotate(-18deg) translate(0, 0);
      }
      47% {
        transform: rotate(-18deg) translate(0, -28px);
      }
      57% {
        transform: rotate(-18deg) translate(0, 0);
      }
      63% {
        transform: rotate(12deg) translate(0, 0);
      }
      78% {
        transform: rotate(12deg) translate(0, -25px);
      }
      88% {
        transform: rotate(12deg) translate(0, 0);
      }
      95% {
        transform: rotate(0deg) translate(0, 0);
      }
      100% {
        transform: rotate(0deg) translate(0, 0);
      }
    }

    @keyframes blade-spin {
      to {
        transform: rotate(360deg);
      }
    }

    @keyframes tread-scroll {
      to {
        stroke-dashoffset: -6;
      }
    }

    @keyframes tread-scroll-reverse {
      to {
        stroke-dashoffset: 6;
      }
    }

    @keyframes grass-eject {
      0% {
        opacity: 0;
        transform: translate(0, 0) rotate(0deg) scale(0.7);
      }
      12% {
        opacity: 0.65;
        transform: translate(calc(var(--g-x) * 0.12), calc(var(--g-y) * 0.12))
          rotate(calc(var(--g-rot) * 0.1)) scale(1);
      }
      55% {
        opacity: 0.35;
        transform: translate(calc(var(--g-x) * 0.7), calc(var(--g-y) * 0.7))
          rotate(calc(var(--g-rot) * 0.7)) scale(0.8);
      }
      100% {
        opacity: 0;
        transform: translate(var(--g-x), var(--g-y)) rotate(var(--g-rot))
          scale(0.4);
      }
    }

    @keyframes led-pulse {
      0%,
      100% {
        opacity: 0.3;
      }
      50% {
        opacity: 0.8;
      }
    }

    @keyframes returning-drift {
      0%,
      100% {
        transform: translateY(-6px);
      }
      50% {
        transform: translateY(4px);
      }
    }

    @keyframes return-arrow {
      0%,
      100% {
        transform: translateY(-6px);
        opacity: 0.3;
      }
      50% {
        transform: translateY(4px);
        opacity: 0.85;
      }
    }

    @keyframes docked-glow {
      0%,
      100% {
        opacity: 0.06;
      }
      50% {
        opacity: 0.14;
      }
    }

    @keyframes charge-pulse {
      0%,
      100% {
        opacity: 0.08;
      }
      50% {
        opacity: 0.25;
      }
    }

    @keyframes error-glow {
      0%,
      100% {
        opacity: 0.08;
      }
      50% {
        opacity: 0.35;
      }
    }

    @keyframes error-led {
      0%,
      100% {
        opacity: 0.2;
      }
      50% {
        opacity: 0.9;
      }
    }

    /* Respect prefers-reduced-motion */
    @media (prefers-reduced-motion: reduce) {
      .mowing .mower-body,
      .mowing .blade-disc,
      .mowing .grass,
      .mowing .tread,
      .mowing .led-dot,
      .returning .mower-body,
      .returning .return-path,
      .returning .tread,
      .docked .glow,
      .docked .power-ring,
      .docked .led-dot,
      .error .glow,
      .error .led-dot {
        animation: none;
      }
      .mower-body-rotate {
        transition: none;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-state-control-lawn_mower-status": HaStateControlLawnMowerStatus;
  }
}
