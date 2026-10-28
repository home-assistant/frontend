import { html, nothing } from "lit";
import { computeDomain } from "../../../../common/entity/compute_domain";
import {
  createConfigFlow,
  deleteConfigFlow,
  handleConfigFlowStep,
} from "../../../../data/config_flow";
import type { PowerConfig } from "../../../../data/energy";
import type { StatisticsMetaData } from "../../../../data/recorder";
import { getStatisticLabel } from "../../../../data/recorder";
import { findRelated } from "../../../../data/search";
import { showConfirmationDialog } from "../../../../dialogs/generic/show-dialog-box";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import type {
  HomeAssistant,
  HomeAssistantApi,
  HomeAssistantFormatters,
} from "../../../../types";
import type { PowerType } from "./power-config";

export type IntegralDeviceClass = "energy" | "gas" | "water";

const TIME_UNITS = ["s", "min", "h", "d"];

export interface IntegralUnits {
  unit_time: string;
  unit_prefix?: "k";
}

export interface IntegralRequest {
  /** Rate statistic to integrate. */
  rate: string;
  units: IntegralUnits;
  /** Name of the helper, if one is created. */
  name: string;
}

/**
 * Returns the Integral helper units that turn a rate into one of the total
 * units, or undefined when the rate does not integrate to one of them.
 */
export function integralUnits(
  rateUnit: string | undefined,
  totalUnits: string[]
): IntegralUnits | undefined {
  if (!rateUnit) {
    return undefined;
  }
  // The helper multiplies the unit by its time unit, which cancels a matching
  // divisor
  const divisor = rateUnit.lastIndexOf("/");
  if (divisor !== -1) {
    const unitTime = rateUnit.slice(divisor + 1);
    return TIME_UNITS.includes(unitTime) &&
      totalUnits.includes(rateUnit.slice(0, divisor))
      ? { unit_time: unitTime }
      : undefined;
  }
  const unit = `${rateUnit}h`;
  // Energy sensors usually report kWh
  if (unit === "Wh") {
    return { unit_time: "h", unit_prefix: "k" };
  }
  return totalUnits.includes(unit) ? { unit_time: "h" } : undefined;
}

export interface PowerIntegral extends Omit<IntegralRequest, "name"> {
  /** Energy statistic the helper provides. */
  energy: "stat_energy_from" | "stat_energy_to";
}

/**
 * Returns the energy statistics of a source that are not set yet and can be
 * calculated from its power sensors. Only a source with two power sensors
 * qualifies, as an Integral helper can't split a signed sensor.
 */
export function pendingPowerIntegrals(
  states: HomeAssistant["states"],
  source: Partial<Record<PowerIntegral["energy"], string | null>>,
  powerType: PowerType,
  powerConfig: PowerConfig,
  totalUnits: string[]
): PowerIntegral[] {
  if (powerType !== "two_sensors") {
    return [];
  }
  const rates = {
    stat_energy_from: powerConfig.stat_rate_from,
    stat_energy_to: powerConfig.stat_rate_to,
  };
  return (["stat_energy_from", "stat_energy_to"] as const).flatMap((energy) => {
    const rate = rates[energy];
    if (!rate || source[energy]) {
      return [];
    }
    const units = integralUnits(
      states[rate]?.attributes.unit_of_measurement,
      totalUnits
    );
    return units ? [{ energy, rate, units }] : [];
  });
}

/**
 * Returns the unit the Integral helper reports for the rate unit.
 */
export function integralTotalUnit(
  rateUnit: string,
  units: IntegralUnits
): string {
  const divisor = `/${units.unit_time}`;
  const unit = rateUnit.endsWith(divisor)
    ? rateUnit.slice(0, -divisor.length)
    : `${rateUnit}${units.unit_time}`;
  return `${units.unit_prefix ?? ""}${unit}`;
}

/**
 * Finds an Integral helper that already integrates the rate statistic.
 */
export function findIntegral(
  states: HomeAssistant["states"],
  entities: HomeAssistant["entities"],
  rate: string,
  deviceClass: IntegralDeviceClass,
  exclude: string[] = []
): string | undefined {
  return Object.values(states).find(
    (stateObj) =>
      stateObj.attributes.source === rate &&
      stateObj.attributes.device_class === deviceClass &&
      entities[stateObj.entity_id]?.platform === "integration" &&
      !exclude.includes(stateObj.entity_id)
  )?.entity_id;
}

/**
 * Builds the input for the Integral helper config flow.
 */
export function integralFlowInput(
  name: string,
  rate: string,
  units: IntegralUnits,
  deviceClass: IntegralDeviceClass
) {
  return {
    name,
    source: rate,
    // Rate states hold their value until they change, so the left rule is
    // exact, and the interval books a constant rate at least every 5 minutes
    method: "left",
    max_sub_interval: { hours: 0, minutes: 5, seconds: 0 },
    round: 3,
    ...units,
    // The helper only infers energy from a power device class and never gas or
    // water from a flow rate, and the energy dashboard needs it
    device_class: deviceClass,
  };
}

async function createIntegral(
  api: HomeAssistantApi,
  localize: LocalizeFunc,
  request: IntegralRequest,
  deviceClass: IntegralDeviceClass
): Promise<string> {
  let flowId: string | undefined;
  let entityId: string | undefined;
  try {
    flowId = (await createConfigFlow(api.callApi, "integration")).flow_id;
    const step = await handleConfigFlowStep(
      api.callApi,
      flowId,
      integralFlowInput(request.name, request.rate, request.units, deviceClass)
    );
    if (step.type === "create_entry" && step.result) {
      flowId = undefined;
      const related = await findRelated(
        api,
        "config_entry",
        step.result.entry_id
      );
      entityId = related.entity?.find((id) => computeDomain(id) === "sensor");
    }
  } catch (_err) {
    // Reported below, the REST errors carry no readable message
  }
  if (flowId) {
    // Rejected input keeps the flow open
    await deleteConfigFlow(api, flowId).catch(() => undefined);
  }
  if (!entityId) {
    throw new Error(localize("ui.panel.config.energy.integral.create_failed"));
  }
  return entityId;
}

export interface ConfirmIntegralsOptions {
  api: HomeAssistantApi;
  localize: LocalizeFunc;
  formatEntityName: HomeAssistantFormatters["formatEntityName"];
  deviceClass: IntegralDeviceClass;
  /** Live states and entities, so a retry finds the helpers already created. */
  states: HomeAssistant["states"];
  entities: HomeAssistant["entities"];
  requests: IntegralRequest[];
  /** Why the sensors are needed, shown first. */
  intro: string;
  /** Sensors that are already used elsewhere and can't be reused. */
  exclude?: string[];
  statsMetadata?: Record<string, StatisticsMetaData>;
}

/**
 * Asks to create Integral helpers for the requests, or to use helpers that
 * already integrate the same rates. Returns their entity ids in request order,
 * or undefined when declined.
 */
export async function confirmIntegrals(
  element: HTMLElement,
  options: ConfirmIntegralsOptions
): Promise<string[] | undefined> {
  const { api, localize, formatEntityName, deviceClass, states, entities } =
    options;
  const label = (statisticId: string) =>
    getStatisticLabel(
      states,
      formatEntityName,
      statisticId,
      options.statsMetadata?.[statisticId]
    );

  const plan = options.requests.map((request) => ({
    request,
    existing: findIntegral(
      states,
      entities,
      request.rate,
      deviceClass,
      options.exclude
    ),
  }));
  const createCount = plan.filter(({ existing }) => !existing).length;
  const paragraphs = [
    options.intro,
    ...plan.map(({ request, existing }) =>
      existing
        ? localize(`ui.panel.config.energy.integral.${deviceClass}.use_item`, {
            total: label(existing),
            rate: label(request.rate),
          })
        : localize(
            `ui.panel.config.energy.integral.${deviceClass}.create_item`,
            {
              name: request.name,
              rate: label(request.rate),
            }
          )
    ),
    createCount
      ? localize("ui.panel.config.energy.integral.counting_note")
      : "",
  ].filter(Boolean);

  let result: string[] | undefined;
  let error: unknown;
  const confirmed = await showConfirmationDialog(element, {
    title: createCount
      ? localize(
          `ui.panel.config.energy.integral.${deviceClass}.create_title`,
          {
            count: createCount,
          }
        )
      : localize(`ui.panel.config.energy.integral.${deviceClass}.use_title`, {
          count: plan.length,
        }),
    text: html`${paragraphs.map(
      (paragraph, index) =>
        html`${index ? html`<br /><br />` : nothing}${paragraph}`
    )}`,
    confirmText: createCount
      ? localize("ui.common.create")
      : localize("ui.panel.config.energy.integral.use", {
          count: plan.length,
        }),
    // The dialog shows its progress while the helpers are created. It waits for
    // all of them, so a retry after a failure reuses the ones that were created
    action: async () => {
      const settled = await Promise.allSettled(
        plan.map(
          ({ request, existing }) =>
            existing ?? createIntegral(api, localize, request, deviceClass)
        )
      );
      const failure = settled.find(
        (item): item is PromiseRejectedResult => item.status === "rejected"
      );
      if (failure) {
        error = failure.reason;
        return;
      }
      result = settled.flatMap((item) =>
        item.status === "fulfilled" ? [item.value] : []
      );
    },
  });
  if (!confirmed) {
    return undefined;
  }
  if (error) {
    throw error;
  }
  return result;
}
