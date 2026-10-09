import { css, html } from "lit";
import { computeStateName } from "../../common/entity/compute_state_name";
import type { EntityRegistryEntry } from "../../data/entity/entity_registry";
import type { TraceId } from "../../data/trace";
import { getTraceUrl } from "../../data/trace";
import type { HomeAssistant } from "../../types";

// The child is a script or automation; both are registered with their config
// id as unique id. A removed script or an automation without an id has no
// name to show.
export const computeChildTraceName = (
  hass: HomeAssistant,
  entityReg: EntityRegistryEntry[],
  childId: TraceId
): string | undefined => {
  const entityId = entityReg.find(
    (entry) =>
      entry.platform === childId.domain && entry.unique_id === childId.item_id
  )?.entity_id;
  const stateObj = entityId ? hass.states[entityId] : undefined;
  return stateObj ? computeStateName(stateObj) : entityId;
};

// A link from a step to the run of the script or automation it started.
export const renderChildTraceLink = (
  hass: HomeAssistant,
  entityReg: EntityRegistryEntry[],
  childId: TraceId
) => {
  const name = computeChildTraceName(hass, entityReg, childId);
  return html`<a class="trace-link" href=${getTraceUrl(childId)}
    >${
      name
        ? hass.localize(
            "ui.panel.config.automation.trace.path.view_child_trace",
            { name }
          )
        : hass.localize(
            "ui.panel.config.automation.trace.path.view_child_trace_unnamed"
          )
    }</a
  >`;
};

export const childTraceLinkStyles = css`
  .trace-link {
    display: inline-block;
    padding-block: var(--ha-space-1);
    color: var(--primary-color);
    text-decoration: none;
  }
  .trace-link:hover {
    text-decoration: underline;
  }
`;
