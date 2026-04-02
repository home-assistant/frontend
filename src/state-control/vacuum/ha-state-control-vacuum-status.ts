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

            <!-- LIDAR turret (center-top, the signature element) -->
            <circle
              cx="120"
              cy="96"
              r="16"
              fill="var(--card-background-color, #fff)"
              stroke="var(--vacuum-color)"
              stroke-width="2"
              class="lidar-housing"
            />
            <circle
              cx="120"
              cy="96"
              r="10"
              fill="none"
              stroke="var(--vacuum-color)"
              stroke-width="1"
              opacity="0.25"
              class="lidar-ring"
            />
            <circle
              cx="120"
              cy="96"
              r="4"
              fill="var(--vacuum-color)"
              opacity="0.35"
              class="lidar-dot"
            />

            <!-- Front IR sensor -->
            <circle
              cx="120"
              cy="54"
              r="3"
              fill="var(--vacuum-color)"
              opacity="0.5"
              class="sensor"
            />

            <!-- Power button area (lower center) -->
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

          <!-- Side brushes (outside body, subtle) -->
          <g class="brush brush-left">
            <circle
              cx="58"
              cy="148"
              r="14"
              fill="none"
              stroke="var(--vacuum-color)"
              stroke-width="1"
              opacity="0.2"
              stroke-dasharray="4 3"
            />
            <circle
              cx="58"
              cy="148"
              r="2.5"
              fill="var(--vacuum-color)"
              opacity="0.3"
            />
          </g>
          <g class="brush brush-right">
            <circle
              cx="182"
              cy="148"
              r="14"
              fill="none"
              stroke="var(--vacuum-color)"
              stroke-width="1"
              opacity="0.2"
              stroke-dasharray="4 3"
            />
            <circle
              cx="182"
              cy="148"
              r="2.5"
              fill="var(--vacuum-color)"
              opacity="0.3"
            />
          </g>

          <!-- Dust particles (cleaning state) -->
          <g class="particles">
            <circle cx="32" cy="100" r="2" fill="var(--vacuum-color)" />
            <circle cx="208" cy="140" r="1.5" fill="var(--vacuum-color)" />
            <circle cx="28" cy="155" r="1.5" fill="var(--vacuum-color)" />
            <circle cx="212" cy="90" r="2" fill="var(--vacuum-color)" />
            <circle cx="50" cy="185" r="1.5" fill="var(--vacuum-color)" />
            <circle cx="190" cy="60" r="1.5" fill="var(--vacuum-color)" />
            <circle cx="38" cy="70" r="1" fill="var(--vacuum-color)" />
            <circle cx="202" cy="170" r="1" fill="var(--vacuum-color)" />
          </g>

          <!-- Dock station (docked state) -->
          <g class="dock-indicator">
            <rect
              x="100"
              y="202"
              width="40"
              height="6"
              rx="3"
              fill="var(--vacuum-color)"
              opacity="0.25"
            />
            <rect
              x="112"
              y="199"
              width="16"
              height="3"
              rx="1.5"
              fill="var(--vacuum-color)"
              opacity="0.15"
            />
          </g>

          <!-- Return path (returning state) -->
          <g class="return-path">
            <path
              d="M 105 198 C 95 180, 90 170, 100 160"
              fill="none"
              stroke="var(--vacuum-color)"
              stroke-width="1.5"
              stroke-dasharray="4 4"
              opacity="0.35"
              class="path-line"
            />
            <polygon
              points="120,210 114,200 126,200"
              fill="var(--vacuum-color)"
              opacity="0.35"
            />
          </g>

          <!-- Error indicator -->
          <g class="error-indicator">
            <circle
              cx="120"
              cy="120"
              r="20"
              fill="var(--vacuum-color)"
              opacity="0.1"
            />
            <text
              x="120"
              y="128"
              text-anchor="middle"
              font-size="24"
              font-weight="bold"
              fill="var(--vacuum-color)"
            >
              !
            </text>
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
    .return-path,
    .error-indicator {
      opacity: 0;
      transition: opacity 400ms ease;
    }

    /* ======================== */
    /* CLEANING                 */
    /* ======================== */
    .cleaning .vacuum-body {
      animation: vacuum-wander 6s ease-in-out infinite;
      transform-origin: 120px 120px;
    }

    .cleaning .brush-left {
      animation: brush-spin 0.8s linear infinite;
      transform-origin: 58px 148px;
    }

    .cleaning .brush-right {
      animation: brush-spin 0.8s linear infinite reverse;
      transform-origin: 182px 148px;
    }

    .cleaning .lidar-ring {
      animation: lidar-scan 2s linear infinite;
      transform-origin: 120px 96px;
    }

    .cleaning .particles {
      opacity: 1;
    }

    .cleaning .particles circle {
      animation: particle-float 3s ease-in-out infinite;
    }

    .cleaning .particles circle:nth-child(2n) {
      animation-delay: -1s;
      animation-duration: 2.5s;
    }

    .cleaning .particles circle:nth-child(3n) {
      animation-delay: -0.5s;
      animation-duration: 3.5s;
    }

    .cleaning .sensor {
      animation: sensor-blink 1.2s ease-in-out infinite;
    }

    .cleaning .nav-lines {
      animation: nav-pulse 2s ease-in-out infinite;
    }

    /* ======================== */
    /* RETURNING                */
    /* ======================== */
    .returning .vacuum-body {
      animation: vacuum-glide 2.5s ease-in-out infinite;
    }

    .returning .return-path {
      opacity: 1;
    }

    .returning .path-line {
      animation: path-dash 1.2s linear infinite;
    }

    .returning .sensor {
      animation: sensor-blink 0.8s ease-in-out infinite;
    }

    .returning .brush-left,
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

    .docked .lidar-dot {
      opacity: 0.15;
    }

    .docked .brush-left,
    .docked .brush-right {
      opacity: 0.5;
    }

    /* ======================== */
    /* PAUSED                   */
    /* ======================== */
    .paused .vacuum-body {
      animation: paused-breathe 4s ease-in-out infinite;
      transform-origin: 120px 120px;
    }

    .paused .power-dot {
      animation: paused-blink 2s ease-in-out infinite;
    }

    .paused .brush-left,
    .paused .brush-right {
      opacity: 0.6;
    }

    /* ======================== */
    /* ERROR                    */
    /* ======================== */
    .error .vacuum-body {
      animation: error-shake 0.6s ease-in-out infinite;
      transform-origin: 120px 120px;
    }

    .error .error-indicator {
      opacity: 1;
      animation: error-pulse 1s ease-in-out infinite;
    }

    .error .power-dot,
    .error .power-ring {
      opacity: 0;
    }

    .error .sensor {
      opacity: 1;
      animation: error-pulse 0.5s ease-in-out infinite;
    }

    /* ======================== */
    /* IDLE                     */
    /* ======================== */
    .idle .vacuum-body {
      opacity: 0.65;
    }

    .idle .brush-left,
    .idle .brush-right {
      opacity: 0.4;
    }

    /* ============================== */
    /* KEYFRAME ANIMATIONS            */
    /* ============================== */

    @keyframes vacuum-wander {
      0%,
      100% {
        transform: rotate(0deg) translateX(0);
      }
      25% {
        transform: rotate(3deg) translateX(2px);
      }
      50% {
        transform: rotate(-2deg) translateX(-1px);
      }
      75% {
        transform: rotate(1deg) translateX(1px);
      }
    }

    @keyframes brush-spin {
      to {
        transform: rotate(360deg);
      }
    }

    @keyframes lidar-scan {
      to {
        transform: rotate(360deg);
      }
    }

    @keyframes particle-float {
      0%,
      100% {
        opacity: 0.2;
        transform: translateY(0) scale(1);
      }
      50% {
        opacity: 0.7;
        transform: translateY(-6px) scale(1.3);
      }
    }

    @keyframes sensor-blink {
      0%,
      100% {
        opacity: 0.5;
      }
      50% {
        opacity: 1;
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

    @keyframes vacuum-glide {
      0%,
      100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-5px);
      }
    }

    @keyframes path-dash {
      to {
        stroke-dashoffset: -16;
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

    @keyframes paused-breathe {
      0%,
      100% {
        transform: scale(1);
      }
      50% {
        transform: scale(0.98);
      }
    }

    @keyframes paused-blink {
      0%,
      60%,
      100% {
        opacity: 0.25;
      }
      30% {
        opacity: 0.06;
      }
    }

    @keyframes error-shake {
      0%,
      100% {
        transform: translateX(0);
      }
      15% {
        transform: translateX(-4px);
      }
      30% {
        transform: translateX(4px);
      }
      45% {
        transform: translateX(-3px);
      }
      60% {
        transform: translateX(3px);
      }
      75% {
        transform: translateX(-1px);
      }
    }

    @keyframes error-pulse {
      0%,
      100% {
        opacity: 0.6;
      }
      50% {
        opacity: 1;
      }
    }

    /* Respect prefers-reduced-motion */
    @media (prefers-reduced-motion: reduce) {
      .cleaning .vacuum-body,
      .cleaning .brush-left,
      .cleaning .brush-right,
      .cleaning .lidar-ring,
      .cleaning .particles circle,
      .cleaning .sensor,
      .cleaning .nav-lines,
      .returning .vacuum-body,
      .returning .path-line,
      .returning .sensor,
      .docked .glow,
      .docked .power-ring,
      .paused .vacuum-body,
      .paused .power-dot,
      .error .vacuum-body,
      .error .error-indicator,
      .error .sensor {
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
