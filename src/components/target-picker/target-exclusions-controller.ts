import type { ReactiveControllerHost } from "lit";
import memoizeOne from "memoize-one";
import {
  consumeContext,
  ContextController,
} from "../../common/decorators/consume";
import type { HaEntityPickerEntityFilterFunc } from "../../data/entity/entity";
import {
  explainTarget,
  type HassServiceTargetWithExclude,
  type TargetItem,
} from "../../data/target";
import type { HomeAssistant } from "../../types";
import type { HaDevicePickerDeviceFilterFunc } from "../device/ha-device-picker";
import { filterTargetEntries } from "./filter-target-entries";
import { targetExpandGroupContext } from "./target-expand-group-context";
import {
  computeExclusionsPerTarget,
  hasIncludedTargets,
  targetItemKey,
  targetItems,
  type TargetExclusion,
  type TargetExclusions,
  type TargetNarrowing,
} from "./target-exclusions";

export type TargetExclusionsHost = ReactiveControllerHost &
  HTMLElement & {
    hass: HomeAssistant;
    value?: HassServiceTargetWithExclude;
    allowExclude: boolean;
    primaryEntitiesOnly?: boolean;
    deviceFilter?: HaDevicePickerDeviceFilterFunc;
    entityFilter?: HaEntityPickerEntityFilterFunc;
    includeDomains?: string[];
    includeDeviceClasses?: string[];
  };

/**
 * What the exclusions of a target picker's value take out of each of its
 * targets, as core resolves them, narrowed to what the picker's rows show.
 */
export class TargetExclusionsController extends ContextController {
  /** What each exclusion takes out of each target, worked out from the value. */
  public exclusions?: TargetExclusions;

  /**
   * Whether the exclusions belong to the current value, so it is known which
   * ones are shared with another target and the details can edit them.
   */
  public complete = true;

  private _host: TargetExclusionsHost;

  @consumeContext({ context: targetExpandGroupContext, subscribe: true })
  private _expandGroup?: boolean;

  private _request = 0;

  constructor(host: TargetExclusionsHost) {
    super(host);
    this._host = host;
  }

  protected contextUpdated() {
    this.resolve();
  }

  /** Whether the target expands the groups it names, like an action does. */
  public get expandGroup(): boolean {
    return this._expandGroup ?? true;
  }

  /**
   * Works the exclusions out again. Without an exclude, the targets are only
   * needed to tell whether an exclusion made in the details is shared with
   * another target, so they are only resolved for that or when `force`d.
   */
  public async resolve({ force = false }: { force?: boolean } = {}) {
    const request = ++this._request;
    const { hass, value, allowExclude } = this._host;
    if (
      !hass ||
      !value ||
      (!force &&
        !hasIncludedTargets(value.exclude) &&
        (!allowExclude || targetItems(value).length < 2))
    ) {
      this._update(undefined, true);
      return;
    }
    // Until the targets resolve, the exclusions shown are from before and
    // may not say which ones are shared now.
    this._update(this.exclusions, false);

    let exclusions: TargetExclusions | undefined;
    try {
      exclusions = computeExclusionsPerTarget(
        await this._explain(value),
        this._keeps()
      );
    } catch (_err) {
      // Without an answer, the exclusions stay unplaced.
    }
    if (request === this._request) {
      this._update(exclusions, !!exclusions);
    }
  }

  /** The exclusions by the target they affect, once there can be any. */
  public get perTarget(): Record<string, TargetExclusion[]> | undefined {
    return (
      this.exclusions?.perTarget ??
      (this._host.allowExclude && !hasIncludedTargets(this._host.value?.exclude)
        ? {}
        : undefined)
    );
  }

  /** Every entity the targets include, once known for the current value. */
  public get includedEntities(): string[] | undefined {
    return this.complete ? this._includedEntities(this.exclusions) : undefined;
  }

  /**
   * Excludes that aren't listed under a target or as having no effect,
   * because they are still being resolved or resolving them failed.
   */
  public get unplaced(): TargetItem[] {
    return this._unplaced(this._host.value?.exclude, this.exclusions);
  }

  /**
   * What excluding `item` on its own would take out of the target
   * `targetKey`, with the rest of the value as it is, and whether it affects
   * another target too.
   */
  public async explainExclusion(
    targetKey: string,
    item: TargetItem
  ): Promise<TargetExclusion | undefined> {
    const { value } = this._host;
    if (!value) {
      return undefined;
    }
    const explained = await this._explain({
      ...value,
      exclude: { [`${item.type}_id`]: [item.id] },
    });
    return computeExclusionsPerTarget(explained, this._keeps()).perTarget[
      targetKey
    ]?.[0];
  }

  private _explain(target: HassServiceTargetWithExclude) {
    return explainTarget(
      this._host.hass.callWS,
      target,
      this.expandGroup,
      this._host.primaryEntitiesOnly ?? true
    );
  }

  private _update(exclusions: TargetExclusions | undefined, complete: boolean) {
    this.exclusions = exclusions;
    this.complete = complete;
    this._host.requestUpdate();
  }

  // What the picker's filters leave of a target, narrowed like the target's
  // row, so what an exclusion takes out matches what the row counts.
  private _keeps(): TargetNarrowing {
    const {
      hass,
      deviceFilter,
      entityFilter,
      includeDomains,
      includeDeviceClasses,
      primaryEntitiesOnly,
    } = this._host;
    return (include) =>
      filterTargetEntries(
        hass.states,
        hass.entities,
        hass.devices,
        hass.areas,
        include,
        {
          referenced_areas: include.referenced_areas,
          referenced_devices: include.referenced_devices,
          referenced_entities: include.entities,
        },
        {
          deviceFilter,
          entityFilter,
          includeDomains,
          includeDeviceClasses,
          primaryEntitiesOnly,
        }
      ).referenced_entities;
  }

  private _includedEntities = memoizeOne(
    (exclusions: TargetExclusions | undefined): string[] | undefined =>
      exclusions && [...new Set(Object.values(exclusions.included).flat())]
  );

  private _unplaced = memoizeOne(
    (
      exclude: HassServiceTargetWithExclude["exclude"],
      exclusions: TargetExclusions | undefined
    ): TargetItem[] => {
      const placed = new Set([
        ...Object.values(exclusions?.perTarget ?? {}).flatMap((list) =>
          list.map(targetItemKey)
        ),
        ...(exclusions?.noEffect ?? []).map(targetItemKey),
      ]);
      return targetItems(exclude).filter(
        (item) => !placed.has(targetItemKey(item))
      );
    }
  );
}
