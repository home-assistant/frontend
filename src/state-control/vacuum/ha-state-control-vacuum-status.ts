import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { stateColorCss } from "../../common/entity/state_color";
import { UNAVAILABLE } from "../../data/entity/entity";
import type { VacuumEntity } from "../../data/vacuum";
import { isCleaning } from "../../data/vacuum";
import type { HomeAssistant } from "../../types";

type VacuumVisualState =
  | "cleaning"
  | "docked"
  | "returning"
  | "paused"
  | "error"
  | "idle";

const computeVisualState = (stateObj: VacuumEntity): VacuumVisualState => {
  if (stateObj.state === UNAVAILABLE) {
    return "idle";
  }
  if (stateObj.state === "error") {
    return "error";
  }
  if (isCleaning(stateObj)) {
    return "cleaning";
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

@customElement("ha-state-control-vacuum-status")
export class HaStateControlVacuumStatus extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: VacuumEntity;

  protected render(): TemplateResult {
    const visualState = computeVisualState(this.stateObj);
    const color = stateColorCss(this.stateObj);

    const style = {
      "--vacuum-color": color || "var(--state-inactive-color)",
    };

    // Inspired by denysdovhan/vacuum-card SVG design
    return html`
      <div
        class="container ${classMap({ [visualState]: true })}"
        style=${styleMap(style)}
      >
        <svg
          viewBox="0 0 240 240"
          xmlns="http://www.w3.org/2000/svg"
          class="vacuum-svg"
        >
          <!-- Soft background glow -->
          <circle
            cx="120"
            cy="120"
            r="110"
            class="glow"
            fill="var(--vacuum-color)"
            opacity="0.06"
          />

          <!-- Robot body group -->
          <g class="vacuum-body">
            <!-- Side brush (front-right, rendered before body so body covers half) -->
            <g class="brush brush-right">
              <g class="brush-spokes">
                <line
                  x1="174"
                  y1="76"
                  x2="174"
                  y2="64"
                  stroke="var(--vacuum-color)"
                  stroke-width="1.2"
                  stroke-linecap="round"
                  opacity="0.5"
                />
                <line
                  x1="174"
                  y1="76"
                  x2="174"
                  y2="88"
                  stroke="var(--vacuum-color)"
                  stroke-width="1.2"
                  stroke-linecap="round"
                  opacity="0.5"
                />
                <line
                  x1="174"
                  y1="76"
                  x2="162"
                  y2="76"
                  stroke="var(--vacuum-color)"
                  stroke-width="1.2"
                  stroke-linecap="round"
                  opacity="0.5"
                />
                <line
                  x1="174"
                  y1="76"
                  x2="186"
                  y2="76"
                  stroke="var(--vacuum-color)"
                  stroke-width="1.2"
                  stroke-linecap="round"
                  opacity="0.5"
                />
              </g>
              <circle
                cx="174"
                cy="76"
                r="2"
                fill="var(--vacuum-color)"
                opacity="0.5"
              />
            </g>

            <!-- Outer body shell -->
            <circle
              cx="120"
              cy="120"
              r="72"
              fill="var(--card-background-color, #fff)"
              stroke="var(--vacuum-color)"
              stroke-width="2"
            />

            <!-- Inner body ring -->
            <circle
              cx="120"
              cy="120"
              r="66"
              fill="none"
              stroke="var(--vacuum-color)"
              stroke-width="0.8"
              opacity="0.2"
            />

            <!-- Bumper arc (front half, prominent) -->
            <path
              d="M 60 94 A 68 68 0 0 1 180 94"
              fill="none"
              stroke="var(--vacuum-color)"
              stroke-width="3"
              stroke-linecap="round"
              class="bumper"
            />

            <!-- Direction indicator lines (navigation feel) -->
            <g class="nav-lines" opacity="0.15">
              <line
                x1="120"
                y1="56"
                x2="120"
                y2="74"
                stroke="var(--vacuum-color)"
                stroke-width="1.5"
              />
              <line
                x1="88"
                y1="63"
                x2="96"
                y2="78"
                stroke="var(--vacuum-color)"
                stroke-width="1.5"
              />
              <line
                x1="152"
                y1="63"
                x2="144"
                y2="78"
                stroke="var(--vacuum-color)"
                stroke-width="1.5"
              />
            </g>

            <!-- LIDAR turret (static) -->
            <circle
              cx="120"
              cy="108"
              r="14"
              fill="var(--card-background-color, #fff)"
              stroke="var(--vacuum-color)"
              stroke-width="2"
              class="lidar-housing"
            />
            <circle
              cx="120"
              cy="108"
              r="9"
              fill="none"
              stroke="var(--vacuum-color)"
              stroke-width="0.8"
              opacity="0.25"
            />

            <!-- Power button area (center) -->
            <circle
              cx="120"
              cy="140"
              r="8"
              fill="var(--vacuum-color)"
              opacity="0.08"
              class="power-ring"
            />
            <circle
              cx="120"
              cy="140"
              r="4"
              fill="var(--vacuum-color)"
              opacity="0.25"
              class="power-dot"
            />
          </g>

          <!-- Dust particles (cleaning state) - sucked toward vacuum -->
          <g class="particles">
            <circle
              class="particle p1"
              cx="120"
              cy="120"
              r="2"
              fill="var(--vacuum-color)"
            />
            <circle
              class="particle p2"
              cx="120"
              cy="120"
              r="1.5"
              fill="var(--vacuum-color)"
            />
            <circle
              class="particle p3"
              cx="120"
              cy="120"
              r="1.5"
              fill="var(--vacuum-color)"
            />
            <circle
              class="particle p4"
              cx="120"
              cy="120"
              r="2"
              fill="var(--vacuum-color)"
            />
            <circle
              class="particle p5"
              cx="120"
              cy="120"
              r="1.5"
              fill="var(--vacuum-color)"
            />
            <circle
              class="particle p6"
              cx="120"
              cy="120"
              r="1.5"
              fill="var(--vacuum-color)"
            />
            <circle
              class="particle p7"
              cx="120"
              cy="120"
              r="1"
              fill="var(--vacuum-color)"
            />
            <circle
              class="particle p8"
              cx="120"
              cy="120"
              r="1"
              fill="var(--vacuum-color)"
            />
          </g>

          <!-- Dock station (docked state) -->
          <g class="dock-indicator">
            <!-- Dock base plate -->
            <rect
              x="76"
              y="188"
              width="88"
              height="28"
              rx="8"
              fill="var(--card-background-color, #fff)"
              stroke="var(--vacuum-color)"
              stroke-width="2"
            />
            <!-- Charging contact pads -->
            <rect
              x="104"
              y="186"
              width="6"
              height="4"
              rx="1"
              fill="var(--vacuum-color)"
              stroke="var(--vacuum-color)"
              stroke-width="2"
              opacity="0.6"
            />
            <rect
              x="130"
              y="186"
              width="6"
              height="4"
              rx="1"
              fill="var(--vacuum-color)"
              stroke="var(--vacuum-color)"
              stroke-width="2"
              opacity="0.6"
            />
          </g>

          <!-- Return arrow (returning state) -->
          <g class="return-path">
            <polygon
              points="120,220 110,206 130,206"
              fill="var(--vacuum-color)"
              stroke="var(--vacuum-color)"
              stroke-width="2"
              stroke-linejoin="round"
              opacity="0.55"
            />
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

    .vacuum-svg {
      width: 100%;
      height: 100%;
    }

    /* -- Hide state-specific elements by default -- */
    .particles,
    .dock-indicator,
    .return-path {
      opacity: 0;
      transition: opacity 400ms ease;
    }

    /* ======================== */
    /* CLEANING                 */
    /* ======================== */
    .cleaning .vacuum-body {
      animation: vacuum-wander 12s ease-in-out infinite;
      transform-origin: 120px 120px;
    }

    .cleaning .brush-right .brush-spokes {
      animation: brush-spin 0.6s linear infinite;
      transform-origin: 174px 76px;
    }

    .cleaning .particles {
      opacity: 1;
    }

    .cleaning .particle {
      animation: particle-suck 2.4s ease-in infinite;
      transform-origin: 120px 120px;
    }

    .cleaning .p1 {
      animation-delay: 0s;
    }
    .cleaning .p2 {
      animation-delay: -0.3s;
    }
    .cleaning .p3 {
      animation-delay: -0.6s;
    }
    .cleaning .p4 {
      animation-delay: -0.9s;
    }
    .cleaning .p5 {
      animation-delay: -1.2s;
    }
    .cleaning .p6 {
      animation-delay: -1.5s;
    }
    .cleaning .p7 {
      animation-delay: -1.8s;
    }
    .cleaning .p8 {
      animation-delay: -2.1s;
    }

    .cleaning .p1 {
      --particle-x: -90px;
      --particle-y: -25px;
    }
    .cleaning .p2 {
      --particle-x: 90px;
      --particle-y: 20px;
    }
    .cleaning .p3 {
      --particle-x: -85px;
      --particle-y: 40px;
    }
    .cleaning .p4 {
      --particle-x: 85px;
      --particle-y: -35px;
    }
    .cleaning .p5 {
      --particle-x: -65px;
      --particle-y: 70px;
    }
    .cleaning .p6 {
      --particle-x: 70px;
      --particle-y: -65px;
    }
    .cleaning .p7 {
      --particle-x: -75px;
      --particle-y: -55px;
    }
    .cleaning .p8 {
      --particle-x: 80px;
      --particle-y: 55px;
    }

    .cleaning .nav-lines {
      animation: nav-pulse 2s ease-in-out infinite;
    }

    /* ======================== */
    /* RETURNING                */
    /* ======================== */
    .returning .vacuum-body {
      animation: returning-drift 3s ease-in-out infinite;
    }

    .returning .return-path {
      opacity: 1;
      animation: return-arrow 1.6s ease-in-out infinite;
      transform-origin: 120px 210px;
    }

    .returning .brush-right {
      opacity: 0.4;
    }

    /* ======================== */
    /* DOCKED                   */
    /* ======================== */
    .docked .dock-indicator {
      opacity: 1;
    }

    .docked .vacuum-body {
      opacity: 0.75;
    }

    .docked .glow {
      animation: docked-glow 4s ease-in-out infinite;
    }

    .docked .power-ring {
      animation: charge-pulse 2.5s ease-in-out infinite;
    }

    .docked .brush-right {
      opacity: 0.5;
    }

    /* ======================== */
    /* ERROR                    */
    /* ======================== */
    .error .glow {
      animation: error-glow 1.8s ease-in-out infinite;
    }

    /* ======================== */
    /* IDLE                     */
    /* ======================== */
    .idle .vacuum-body {
      opacity: 0.65;
    }

    .idle .brush-right {
      opacity: 0.4;
    }

    /* ============================== */
    /* KEYFRAME ANIMATIONS            */
    /* ============================== */

    @keyframes vacuum-wander {
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

    @keyframes brush-spin {
      to {
        transform: rotate(360deg);
      }
    }

    @keyframes particle-suck {
      0% {
        opacity: 0;
        transform: translate(var(--particle-x), var(--particle-y)) scale(1.2);
      }
      15% {
        opacity: 0.8;
      }
      85% {
        opacity: 0.5;
      }
      100% {
        opacity: 0;
        transform: translate(0, 0) scale(0.2);
      }
    }

    @keyframes nav-pulse {
      0%,
      100% {
        opacity: 0.15;
      }
      50% {
        opacity: 0.35;
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

    /* Respect prefers-reduced-motion */
    @media (prefers-reduced-motion: reduce) {
      .cleaning .vacuum-body,
      .cleaning .brush-right .brush-spokes,
      .cleaning .particle,
      .cleaning .nav-lines,
      .returning .vacuum-body,
      .returning .return-path,
      .docked .glow,
      .docked .power-ring,
      .error .glow {
        animation: none;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-state-control-vacuum-status": HaStateControlVacuumStatus;
  }
}
