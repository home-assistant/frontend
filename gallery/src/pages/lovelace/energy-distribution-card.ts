import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, query, state } from "lit/decorators";
import { mockIcons } from "../../../../demo/src/stubs/icons";
import type { EnergyDistributionDemoScenario } from "../../data/energy-distribution-demo";
import {
  ENERGY_DISTRIBUTION_DEMO_ENTITIES,
  getEnergyDistributionDemoAllocation,
  mockEnergyDistributionDemo,
} from "../../data/energy-distribution-demo";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import "../../../../src/panels/lovelace/cards/hui-card";
import type { HuiCard } from "../../../../src/panels/lovelace/cards/hui-card";
import { ENERGY_DISTRIBUTION_HOME_CIRCLE_CIRCUMFERENCE as CIRCLE } from "../../../../src/panels/lovelace/cards/energy/energy-distribution-home-circle";

interface ScenarioCopy {
  heading: string;
  description: string;
}

const SCENARIO_COPY: Record<EnergyDistributionDemoScenario, ScenarioCopy> = {
  aligned: {
    heading: "Aligned meters",
    description:
      "Solar and export share the same hours. The home ring should be mixed solar (orange) and battery (teal), with only a thin grid arc.",
  },
  export_lagged: {
    heading: "Export recorded one hour later",
    description:
      "Same daily totals, with export shifted one hour later. Allocated solar exceeds net home energy. The home ring should stay mostly solar, and the grid dash must stay at or above 0.",
  },
};

const formatKwh = (value: number): string => `${value.toFixed(2)} kWh`;

const strokeDashLength = (
  circle: SVGCircleElement | null
): number | undefined => {
  if (!circle) {
    return undefined;
  }
  const dash = circle.getAttribute("stroke-dasharray")?.trim().split(/\s+/)[0];
  if (dash === undefined) {
    return undefined;
  }
  const value = Number(dash);
  return Number.isFinite(value) ? value : undefined;
};

const describeHomeRing = (
  scenario: EnergyDistributionDemoScenario,
  card: HTMLElement
): string => {
  const allocation = getEnergyDistributionDemoAllocation(scenario);
  const svgRoot = card.shadowRoot;
  const solarDash = strokeDashLength(
    svgRoot?.querySelector("circle.solar") ?? null
  );
  const batteryDash = strokeDashLength(
    svgRoot?.querySelector("circle.battery") ?? null
  );
  const gridCircle = svgRoot?.querySelector("circle.grid") ?? null;
  const gridDash = strokeDashLength(gridCircle);
  const gridValid =
    gridDash !== undefined && gridDash >= 0 && gridDash <= CIRCLE + 1e-6;
  const paintedFullGrid =
    gridDash !== undefined && Math.abs(gridDash - CIRCLE) < 1;

  return [
    `Net home ${formatKwh(allocation.usedTotal)}. Allocated solar ${formatKwh(allocation.usedSolar)}, battery ${formatKwh(allocation.usedBattery)}, grid ${formatKwh(allocation.usedGrid)}.`,
    `Home ring dashes: solar ${solarDash?.toFixed(1) ?? "missing"}, battery ${batteryDash?.toFixed(1) ?? "none"}, grid ${gridDash?.toFixed(1) ?? "missing"} (circumference ${CIRCLE.toFixed(1)}).`,
    gridValid && !paintedFullGrid
      ? "Grid dash is valid and the ring is not 100% grid."
      : "Grid dash is invalid or the ring painted as 100% grid.",
  ].join(" ");
};

@customElement("demo-lovelace-energy-distribution-card")
class DemoEnergyDistributionCard extends LitElement {
  @query("#aligned") private _alignedHost?: HTMLDivElement;

  @query("#export_lagged") private _laggedHost?: HTMLDivElement;

  @state() private _alignedReadout = "Loading energy data";

  @state() private _laggedReadout = "Loading energy data";

  protected render(): TemplateResult {
    return html`
      <div class="page">
        ${this._renderScenario("aligned", this._alignedReadout)}
        ${this._renderScenario("export_lagged", this._laggedReadout)}
      </div>
    `;
  }

  protected firstUpdated(changedProperties: PropertyValues<this>) {
    super.firstUpdated(changedProperties);
    void this._mountScenarios();
  }

  private _renderScenario(
    scenario: EnergyDistributionDemoScenario,
    readout: string
  ) {
    const copy = SCENARIO_COPY[scenario];
    return html`
      <section class="scenario">
        <h2>${copy.heading}</h2>
        <p>${copy.description}</p>
        <div class="card-host" id=${scenario}></div>
        <p class="readout">${readout}</p>
      </section>
    `;
  }

  private async _mountScenarios() {
    const alignedHost = this._alignedHost;
    const laggedHost = this._laggedHost;
    if (!alignedHost || !laggedHost) {
      return;
    }
    await Promise.all([
      this._mountScenario(alignedHost, "aligned"),
      this._mountScenario(laggedHost, "export_lagged"),
    ]);
  }

  private async _mountScenario(
    host: HTMLElement,
    scenario: EnergyDistributionDemoScenario
  ) {
    const hass = provideHass(host);
    hass.addEntities(ENERGY_DISTRIBUTION_DEMO_ENTITIES);
    mockIcons(hass);
    mockEnergyDistributionDemo(hass, scenario);
    await hass.updateTranslations(null, "en");
    await hass.updateTranslations("lovelace", "en");

    const card = document.createElement("hui-card") as HuiCard;
    // updateTranslations replaces host.hass with a copy that includes localize.
    card.hass = (host as HTMLElement & { hass: typeof hass }).hass;
    card.config = { type: "energy-distribution" };
    host.appendChild(card);

    const readout = await this._waitForHomeRing(host, scenario);
    if (scenario === "aligned") {
      this._alignedReadout = readout;
    } else {
      this._laggedReadout = readout;
    }
  }

  private _waitForHomeRing(
    host: HTMLElement,
    scenario: EnergyDistributionDemoScenario
  ): Promise<string> {
    return new Promise((resolve) => {
      const deadline = Date.now() + 15000;
      const tick = () => {
        const card = host.querySelector("hui-energy-distribution-card");
        const solar = card?.shadowRoot?.querySelector("circle.solar");
        if (card && solar) {
          resolve(describeHomeRing(scenario, card));
          return;
        }
        if (Date.now() > deadline) {
          resolve("Energy distribution card did not render a home ring.");
          return;
        }
        window.setTimeout(tick, 50);
      };
      tick();
    });
  }

  static styles = css`
    .page {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--ha-space-8);
      padding: var(--ha-space-4);
      background: var(--primary-background-color);
      color: var(--primary-text-color);
    }

    .scenario {
      max-width: 500px;
      width: min(100%, 500px);
    }

    h2 {
      margin: 0 0 var(--ha-space-2);
      color: var(--primary-color);
      font-size: var(--ha-font-size-xl);
      font-weight: var(--ha-font-weight-medium);
      line-height: var(--ha-line-height-normal);
    }

    p {
      margin: 0 0 var(--ha-space-4);
      color: var(--secondary-text-color);
      line-height: var(--ha-line-height-normal);
    }

    .card-host {
      width: 100%;
    }

    .readout {
      margin-top: var(--ha-space-3);
      font-size: var(--ha-font-size-s);
      color: var(--primary-text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-lovelace-energy-distribution-card": DemoEnergyDistributionCard;
  }
}
