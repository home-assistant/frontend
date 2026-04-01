import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, svg } from "lit";
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
            opacity="0.1"
          />

          <!-- Vacuum body -->
          <g class="vacuum-body">
            <!-- Main circular body -->
            <circle
              cx="100"
              cy="100"
              r="60"
              fill="var(--card-background-color, #fff)"
              stroke="var(--vacuum-color)"
              stroke-width="3"
            />

            <!-- Inner ring detail -->
            <circle
              cx="100"
              cy="100"
              r="48"
              fill="none"
              stroke="var(--vacuum-color)"
              stroke-width="1.5"
              opacity="0.3"
            />

            <!-- Top bumper sensor -->
            ${svg`
              <path
                d="M 60 72 A 50 50 0 0 1 140 72"
                fill="none"
                stroke="var(--vacuum-color)"
                stroke-width="3"
                stroke-linecap="round"
                class="bumper"
              />
            `}

            <!-- Front sensor dot -->
            <circle
              cx="100"
              cy="50"
              r="4"
              fill="var(--vacuum-color)"
              class="sensor"
            />

            <!-- Left brush -->
            <g class="brush brush-left">
              <line
                x1="52"
                y1="108"
                x2="38"
                y2="98"
                stroke="var(--vacuum-color)"
                stroke-width="2"
                stroke-linecap="round"
                opacity="0.6"
              />
              <line
                x1="52"
                y1="108"
                x2="36"
                y2="112"
                stroke="var(--vacuum-color)"
                stroke-width="2"
                stroke-linecap="round"
                opacity="0.6"
              />
              <line
                x1="52"
                y1="108"
                x2="42"
                y2="122"
                stroke="var(--vacuum-color)"
                stroke-width="2"
                stroke-linecap="round"
                opacity="0.6"
              />
            </g>

            <!-- Right brush -->
            <g class="brush brush-right">
              <line
                x1="148"
                y1="108"
                x2="162"
                y2="98"
                stroke="var(--vacuum-color)"
                stroke-width="2"
                stroke-linecap="round"
                opacity="0.6"
              />
              <line
                x1="148"
                y1="108"
                x2="164"
                y2="112"
                stroke="var(--vacuum-color)"
                stroke-width="2"
                stroke-linecap="round"
                opacity="0.6"
              />
              <line
                x1="148"
                y1="108"
                x2="158"
                y2="122"
                stroke="var(--vacuum-color)"
                stroke-width="2"
                stroke-linecap="round"
                opacity="0.6"
              />
            </g>

            <!-- Center button/display -->
            <circle
              cx="100"
              cy="100"
              r="16"
              fill="var(--vacuum-color)"
              opacity="0.15"
              class="center-display"
            />
            <circle
              cx="100"
              cy="100"
              r="8"
              fill="var(--vacuum-color)"
              opacity="0.4"
              class="center-button"
            />
          </g>

          <!-- Dust particles (only visible when cleaning) -->
          <g class="particles">
            <circle cx="30" cy="80" r="2.5" fill="var(--vacuum-color)" />
            <circle cx="170" cy="120" r="2" fill="var(--vacuum-color)" />
            <circle cx="25" cy="130" r="1.5" fill="var(--vacuum-color)" />
            <circle cx="175" cy="80" r="2" fill="var(--vacuum-color)" />
            <circle cx="50" cy="160" r="1.5" fill="var(--vacuum-color)" />
            <circle cx="150" cy="45" r="2" fill="var(--vacuum-color)" />
          </g>

          <!-- Dock indicator (only visible when docked) -->
          <g class="dock-indicator">
            <rect
              x="82"
              y="170"
              width="36"
              height="6"
              rx="3"
              fill="var(--vacuum-color)"
              opacity="0.3"
            />
          </g>

          <!-- Return home path (only visible when returning) -->
          <g class="return-path">
            <path
              d="M 85 165 Q 80 150 90 140"
              fill="none"
              stroke="var(--vacuum-color)"
              stroke-width="1.5"
              stroke-dasharray="4 3"
              opacity="0.4"
            />
            <path
              d="M 100 175 L 95 168 L 105 168 Z"
              fill="var(--vacuum-color)"
              opacity="0.4"
            />
          </g>

          <!-- Error indicator -->
          <g class="error-indicator">
            <text
              x="100"
              y="106"
              text-anchor="middle"
              font-size="28"
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
      animation: brush-spin-left 0.6s linear infinite;
      transform-origin: 52px 108px;
    }

    .cleaning .brush-right {
      animation: brush-spin-right 0.6s linear infinite;
      transform-origin: 148px 108px;
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

    /* -- CHARGING (docked) state with glow -- */
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

    @keyframes brush-spin-left {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(-360deg);
      }
    }

    @keyframes brush-spin-right {
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
        opacity: 0.1;
      }
      50% {
        opacity: 0.2;
      }
    }

    @keyframes charge-pulse {
      0%,
      100% {
        opacity: 0.15;
        r: 16;
      }
      50% {
        opacity: 0.35;
        r: 18;
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
        opacity: 0.4;
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
