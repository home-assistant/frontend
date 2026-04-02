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

    return html`
      <div
        class="container ${classMap({
          [visualState]: true,
        })}"
        style=${styleMap(style)}
      >
        <svg
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
          class="vacuum-svg"
        >
          <!-- Background circle glow -->
          <circle
            cx="100"
            cy="100"
            r="90"
            class="glow"
            fill="var(--vacuum-color)"
            opacity="0.08"
          />

          <!-- Vacuum body -->
          <g class="vacuum-body">
            <!-- Main circular body -->
            <circle
              cx="100"
              cy="100"
              r="62"
              fill="var(--card-background-color, #fff)"
              stroke="var(--vacuum-color)"
              stroke-width="2.5"
            />

            <!-- Front bumper sensor arc -->
            <path
              d="M 55 75 A 55 55 0 0 1 145 75"
              fill="none"
              stroke="var(--vacuum-color)"
              stroke-width="3.5"
              stroke-linecap="round"
              class="bumper"
            />

            <!-- LIDAR tower (top center) -->
            <circle
              cx="100"
              cy="78"
              r="10"
              fill="var(--card-background-color, #fff)"
              stroke="var(--vacuum-color)"
              stroke-width="2"
            />
            <circle
              cx="100"
              cy="78"
              r="4"
              fill="var(--vacuum-color)"
              opacity="0.3"
              class="lidar-dot"
            />

            <!-- Front sensor dot -->
            <circle
              cx="100"
              cy="46"
              r="3.5"
              fill="var(--vacuum-color)"
              class="sensor"
            />

            <!-- Left side brush -->
            <g class="brush brush-left">
              <circle
                cx="52"
                cy="120"
                r="12"
                fill="none"
                stroke="var(--vacuum-color)"
                stroke-width="1.5"
                opacity="0.4"
                stroke-dasharray="3 3"
              />
              <circle
                cx="52"
                cy="120"
                r="3"
                fill="var(--vacuum-color)"
                opacity="0.5"
              />
            </g>

            <!-- Right side brush -->
            <g class="brush brush-right">
              <circle
                cx="148"
                cy="120"
                r="12"
                fill="none"
                stroke="var(--vacuum-color)"
                stroke-width="1.5"
                opacity="0.4"
                stroke-dasharray="3 3"
              />
              <circle
                cx="148"
                cy="120"
                r="3"
                fill="var(--vacuum-color)"
                opacity="0.5"
              />
            </g>

            <!-- Center button -->
            <circle
              cx="100"
              cy="108"
              r="10"
              fill="var(--vacuum-color)"
              opacity="0.12"
              class="center-display"
            />
            <circle
              cx="100"
              cy="108"
              r="5"
              fill="var(--vacuum-color)"
              opacity="0.35"
              class="center-button"
            />
          </g>

          <!-- Dust particles (only visible when cleaning) -->
          <g class="particles">
            <circle cx="28" cy="85" r="2" fill="var(--vacuum-color)" />
            <circle cx="172" cy="115" r="1.5" fill="var(--vacuum-color)" />
            <circle cx="25" cy="135" r="1.5" fill="var(--vacuum-color)" />
            <circle cx="175" cy="75" r="2" fill="var(--vacuum-color)" />
            <circle cx="45" cy="155" r="1.5" fill="var(--vacuum-color)" />
            <circle cx="155" cy="50" r="1.5" fill="var(--vacuum-color)" />
          </g>

          <!-- Dock indicator (only visible when docked) -->
          <g class="dock-indicator">
            <rect
              x="82"
              y="172"
              width="36"
              height="5"
              rx="2.5"
              fill="var(--vacuum-color)"
              opacity="0.3"
            />
          </g>

          <!-- Return home path (only visible when returning) -->
          <g class="return-path">
            <path
              d="M 85 168 Q 78 152 88 140"
              fill="none"
              stroke="var(--vacuum-color)"
              stroke-width="1.5"
              stroke-dasharray="4 3"
              opacity="0.4"
            />
            <path
              d="M 100 178 L 95 170 L 105 170 Z"
              fill="var(--vacuum-color)"
              opacity="0.4"
            />
          </g>

          <!-- Error indicator -->
          <g class="error-indicator">
            <text
              x="100"
              y="115"
              text-anchor="middle"
              font-size="26"
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
      transition: opacity 300ms ease;
    }

    /* -- CLEANING state -- */
    .cleaning .vacuum-body {
      animation: vacuum-rotate 8s linear infinite;
      transform-origin: 100px 100px;
    }

    .cleaning .brush-left {
      animation: brush-spin 1s linear infinite;
      transform-origin: 52px 120px;
    }

    .cleaning .brush-right {
      animation: brush-spin 1s linear infinite reverse;
      transform-origin: 148px 120px;
    }

    .cleaning .particles {
      opacity: 1;
      animation: particles-fade 2s ease-in-out infinite;
    }

    .cleaning .sensor {
      animation: sensor-blink 1.5s ease-in-out infinite;
    }

    /* -- RETURNING state -- */
    .returning .vacuum-body {
      animation: vacuum-bob 2s ease-in-out infinite;
      transform-origin: 100px 100px;
    }

    .returning .return-path {
      opacity: 1;
      animation: path-dash 1.5s linear infinite;
    }

    /* -- DOCKED state -- */
    .docked .dock-indicator {
      opacity: 1;
    }

    .docked .glow {
      animation: docked-glow 3s ease-in-out infinite;
    }

    .docked .vacuum-body {
      opacity: 0.8;
    }

    .docked .center-display {
      animation: charge-pulse 2s ease-in-out infinite;
    }

    /* -- PAUSED state -- */
    .paused .vacuum-body {
      animation: paused-breathe 3s ease-in-out infinite;
      transform-origin: 100px 100px;
    }

    .paused .center-button {
      animation: paused-blink 3s ease-in-out infinite;
    }

    /* -- ERROR state -- */
    .error .vacuum-body {
      animation: error-shake 0.5s ease-in-out infinite;
      transform-origin: 100px 100px;
    }

    .error .error-indicator {
      opacity: 1;
    }

    .error .center-button,
    .error .center-display {
      opacity: 0;
    }

    /* -- IDLE state -- */
    .idle .vacuum-body {
      opacity: 0.7;
    }

    /* ---- Keyframe Animations ---- */

    @keyframes vacuum-rotate {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }

    @keyframes brush-spin {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }

    @keyframes particles-fade {
      0%,
      100% {
        opacity: 0.3;
      }
      50% {
        opacity: 0.8;
      }
    }

    @keyframes sensor-blink {
      0%,
      100% {
        opacity: 1;
      }
      50% {
        opacity: 0.3;
      }
    }

    @keyframes vacuum-bob {
      0%,
      100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-4px);
      }
    }

    @keyframes path-dash {
      to {
        stroke-dashoffset: -14;
      }
    }

    @keyframes docked-glow {
      0%,
      100% {
        opacity: 0.08;
      }
      50% {
        opacity: 0.18;
      }
    }

    @keyframes charge-pulse {
      0%,
      100% {
        opacity: 0.12;
      }
      50% {
        opacity: 0.3;
      }
    }

    @keyframes paused-breathe {
      0%,
      100% {
        transform: scale(1);
      }
      50% {
        transform: scale(0.97);
      }
    }

    @keyframes paused-blink {
      0%,
      40%,
      100% {
        opacity: 0.35;
      }
      20% {
        opacity: 0.1;
      }
    }

    @keyframes error-shake {
      0%,
      100% {
        transform: translateX(0);
      }
      20% {
        transform: translateX(-3px);
      }
      40% {
        transform: translateX(3px);
      }
      60% {
        transform: translateX(-2px);
      }
      80% {
        transform: translateX(2px);
      }
    }

    /* Respect prefers-reduced-motion */
    @media (prefers-reduced-motion: reduce) {
      .cleaning .vacuum-body,
      .cleaning .brush-left,
      .cleaning .brush-right,
      .cleaning .particles,
      .cleaning .sensor,
      .returning .vacuum-body,
      .returning .return-path,
      .docked .glow,
      .docked .center-display,
      .paused .vacuum-body,
      .paused .center-button,
      .error .vacuum-body {
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
