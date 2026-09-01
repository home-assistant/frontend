import { mdiArrowUpBoldCircle, mdiPuzzle } from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import type { AddonStage, AddonState } from "../../../../src/data/hassio/addon";
import "../../../../src/components/ha-card";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import "../../../../src/panels/config/apps/components/supervisor-apps-card-content";
import type { AppTag } from "../../../../src/panels/config/apps/components/supervisor-apps-card-content";
import type { HomeAssistant } from "../../../../src/types";

interface DemoApp {
  label: string;
  title: string;
  description?: string;
  state?: AddonState;
  stage?: AddonStage;
  installed?: boolean;
  available?: boolean;
  updateAvailable?: boolean;
  tags?: AppTag[];
}

const DEPRECATED_TAG: AppTag = {
  label: "Deprecated",
  variant: "danger",
  // mdiAlertDecagramOutline, inlined to keep the demo self-contained
  iconPath:
    "M23,12L20.56,9.22L20.9,5.54L17.29,4.72L15.4,1.54L12,3L8.6,1.54L6.71,4.72L3.1,5.53L3.44,9.21L1,12L3.44,14.78L3.1,18.46L6.71,19.28L8.6,22.46L12,21L15.4,22.45L17.29,19.27L20.9,18.45L20.56,14.78L23,12M21,14L19.1,16.16L19.37,19.03L16.56,19.67L15.1,22.15L12.4,21L9.7,22.16L8.24,19.68L5.43,19.04L5.7,16.15L3.8,14L5.7,11.83L5.43,8.96L8.24,8.34L9.7,5.85L12.4,7L15.1,5.84L16.56,8.32L19.37,8.96L19.1,11.84L21,14M11,15H13V17H11V15M11,7H13V13H11V7Z",
};

const EXPERIMENTAL_TAG: AppTag = {
  label: "Experimental",
  variant: "warning",
  // mdiFlask
  iconPath:
    "M5,19A1,1 0 0,0 6,20H18A1,1 0 0,0 19,19C19,18.79 18.93,18.59 18.82,18.43L13,8.35V4H11V8.35L5.18,18.43C5.07,18.59 5,18.79 5,19M6,22A3,3 0 0,1 3,19C3,18.4 3.18,17.84 3.5,17.37L9,7.81V6A1,1 0 0,1 8,5V4A2,2 0 0,1 10,2H14A2,2 0 0,1 16,4V5A1,1 0 0,1 15,6V7.81L20.5,17.37C20.82,17.84 21,18.4 21,19A3,3 0 0,1 18,22H6M13,16L14.34,14.66L16.27,18H7.73L10.39,13.39L13,16M14.5,13A1,1 0 0,1 13.5,12A1,1 0 0,1 14.5,11A1,1 0 0,1 15.5,12A1,1 0 0,1 14.5,13Z",
};

const LONG_DESCRIPTION =
  "Manage and configure everything from a single place with a full featured editor";

// Everything that can pile onto one row at once: a long name, a stage tag, the
// installed badge, the update chip, an unhealthy state, and a long description.
const worstCaseApps: DemoApp[] = [
  {
    label: "error + update + tag + installed",
    title: "Advanced SSH & Web Terminal with a long name",
    description: LONG_DESCRIPTION,
    state: "error",
    stage: "deprecated",
    installed: true,
    updateAvailable: true,
    tags: [DEPRECATED_TAG],
  },
  {
    label: "stopped + update + tag",
    title: "File editor",
    description: LONG_DESCRIPTION,
    state: "stopped",
    stage: "experimental",
    updateAvailable: true,
    tags: [EXPERIMENTAL_TAG],
  },
  {
    label: "starting + update",
    title: "Mosquitto broker",
    description: LONG_DESCRIPTION,
    state: "startup",
    updateAvailable: true,
  },
  {
    label: "unavailable in the store",
    title: "AirCast",
    description: LONG_DESCRIPTION,
    state: "unknown",
    available: false,
    installed: true,
    updateAvailable: true,
    tags: [DEPRECATED_TAG],
  },
  {
    label: "no description",
    title: "Terminal",
    state: "stopped",
    updateAvailable: true,
  },
];

const healthyApps: DemoApp[] = [
  {
    label: "running",
    title: "File editor",
    description: LONG_DESCRIPTION,
    state: "started",
  },
  {
    label: "running + update",
    title: "Mosquitto broker",
    description: "A fast and lightweight MQTT broker",
    state: "started",
    updateAvailable: true,
  },
  {
    label: "store, not installed",
    title: "Grafana",
    description: "Dashboards for your metrics",
  },
];

@customElement("demo-misc-app-card")
export class DemoAppCard extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;

  protected render() {
    if (!this.hass) {
      return nothing;
    }
    return html`
      <h2>Worst case at the apps dashboard's 336px minimum column width</h2>
      <div class="container narrow">
        ${worstCaseApps.map((app) => this._renderCard(app))}
      </div>
      <h2>Healthy states</h2>
      <div class="container">
        ${healthyApps.map((app) => this._renderCard(app))}
      </div>
    `;
  }

  private _renderCard(app: DemoApp) {
    const state = app.state;
    return html`
      <ha-card
        outlined
        class=${classMap({
          "state-error": state === "error",
          "state-warning":
            state !== "error" && state !== "stopped" && state !== "started",
        })}
      >
        <div class="card-content">
          <supervisor-apps-card-content
            .hass=${this.hass}
            .title=${app.title}
            .stage=${app.stage ?? "stable"}
            .description=${app.description}
            .available=${app.available ?? true}
            .installed=${app.installed ?? false}
            .state=${app.state}
            .tags=${app.tags}
            .updateAvailable=${app.updateAvailable ?? false}
            .icon=${app.updateAvailable ? mdiArrowUpBoldCircle : mdiPuzzle}
          ></supervisor-apps-card-content>
        </div>
      </ha-card>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    const hass = provideHass(this);
    hass.updateTranslations(null, "en");
    hass.updateTranslations("config", "en");
  }

  static styles = css`
    .container {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(336px, 100%), 1fr));
      gap: var(--ha-space-4);
      padding: 8px 16px 16px;
      margin-bottom: 16px;
    }

    /* The apps dashboard grid bottoms out at 336px columns */
    .container.narrow {
      grid-template-columns: repeat(auto-fill, 336px);
    }

    .container.narrow > * {
      max-width: 336px;
    }

    ha-card.state-error {
      --ha-card-border-color: var(--error-color);
    }

    ha-card.state-warning {
      --ha-card-border-color: var(--warning-color);
    }

    h2 {
      padding: 0 16px;
      font-size: var(--ha-font-size-l);
      font-weight: var(--ha-font-weight-normal);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-misc-app-card": DemoAppCard;
  }
}
