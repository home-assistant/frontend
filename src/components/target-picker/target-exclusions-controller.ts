import type { ReactiveController, ReactiveControllerHost } from "lit";
import memoizeOne from "memoize-one";
import type { HaEntityPickerEntityFilterFunc } from "../../data/entity/entity";
import {
  explainTargetExclude,
  extractFromTarget,
  type ExtractFromTargetResult,
  type HassServiceTargetWithExclude,
  type TargetItem,
} from "../../data/target";
import type { HomeAssistant } from "../../types";
import type { HaDevicePickerDeviceFilterFunc } from "../device/ha-device-picker";
import { filterTargetEntries } from "./filter-target-entries";
import {
  computeExclusionsPerTarget,
  hasIncludedTargets,
  targetItemKey,
  targetItems,
  type TargetExclusion,
  type TargetExclusions,
} from "./target-exclusions";

export type TargetExclusionsHost = ReactiveControllerHost & {
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
export class TargetExclusionsController implements ReactiveController {
  /** What each exclusion takes out of each target, worked out from the value. */
  public exclusions?: TargetExclusions;

  /**
   * Whether the exclusions belong to the current value, so it is known which
   * ones are shared with another target and the details can edit them.
   */
  public complete = true;

  private _host: TargetExclusionsHost;

  private _request = 0;

  // What each target item resolves to, so a change only asks core about the
  // items it adds.
  private _itemEntries = new Map<string, Promise<ExtractFromTargetResult>>();

  constructor(host: TargetExclusionsHost) {
    this._host = host;
    host.addController(this);
  }

  public hostConnected() {
    // Nothing to set up; results come from `resolve`.
  }

  /**
   * Works the exclusions out again. Without an exclude, the targets are only
   * needed to tell whether an exclusion made in the details is shared with
   * another target, so they are only resolved for that or when `force`d.
   */
  public async resolve({
    registriesChanged = false,
    force = false,
  }: { registriesChanged?: boolean; force?: boolean } = {}) {
    if (registriesChanged) {
      this._itemEntries.clear();
    }
    const request = ++this._request;
    const { hass, value, allowExclude } = this._host;
    if (
      !hass ||
      !value ||
      (!force &&
        !hasIncludedTargets(value.exclude) &&
        (!allowExclude || targetItems(value).length < 2))
    ) {
      this._set(undefined, true);
      return;
    }
    // Until the targets resolve, the exclusions shown are from before and
    // may not say which ones are shared now.
    this._set(this.exclusions, false);

    let exclusions: TargetExclusions;
    try {
      const [explained, narrowed] = await Promise.all([
        explainTargetExclude(
          hass.callWS,
          value,
          true,
          this._host.primaryEntitiesOnly ?? true
        ),
        this._narrow(targetItems(value)),
      ]);
      exclusions = computeExclusionsPerTarget(explained, narrowed);
    } catch (_err) {
      if (request === this._request) {
        this._set(undefined, false);
      }
      return;
    }
    if (request === this._request) {
      this._set(exclusions, true);
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
    const { hass, value } = this._host;
    if (!value) {
      return undefined;
    }
    const { exclude: _exclude, ...include } = value;
    const explained = await explainTargetExclude(
      hass.callWS,
      { ...include, exclude: { [`${item.type}_id`]: [item.id] } },
      true,
      this._host.primaryEntitiesOnly ?? true
    );
    return computeExclusionsPerTarget(explained, this.exclusions?.included)
      .perTarget[targetKey]?.[0];
  }

  private _set(exclusions: TargetExclusions | undefined, complete: boolean) {
    if (exclusions === this.exclusions && complete === this.complete) {
      return;
    }
    this.exclusions = exclusions;
    this.complete = complete;
    this._host.requestUpdate();
  }

  // Targets other than entities, narrowed like their rows so what an
  // exclusion takes out matches what a row counts.
  private async _narrow(
    items: TargetItem[]
  ): Promise<Record<string, string[]>> {
    const { hass } = this._host;
    const narrowed = items
      .filter((item) => item.type !== "entity")
      .map(async (item) => {
        const entries = await this._extractItem(item);
        return [
          targetItemKey(item),
          filterTargetEntries(
            hass.states,
            hass.entities,
            hass.devices,
            hass.areas,
            item,
            entries,
            {
              deviceFilter: this._host.deviceFilter,
              entityFilter: this._host.entityFilter,
              includeDomains: this._host.includeDomains,
              includeDeviceClasses: this._host.includeDeviceClasses,
              primaryEntitiesOnly: this._host.primaryEntitiesOnly,
            }
          ).referenced_entities,
        ] as const;
      });
    return Object.fromEntries(await Promise.all(narrowed));
  }

  private _extractItem(item: TargetItem): Promise<ExtractFromTargetResult> {
    const primaryEntitiesOnly = this._host.primaryEntitiesOnly ?? true;
    const key = `${primaryEntitiesOnly}:${targetItemKey(item)}`;
    let entries = this._itemEntries.get(key);
    if (!entries) {
      entries = extractFromTarget(
        this._host.hass.callWS,
        { [`${item.type}_id`]: [item.id] },
        false,
        primaryEntitiesOnly
      );
      this._itemEntries.set(key, entries);
      const cached = entries;
      cached.catch(() => {
        if (this._itemEntries.get(key) === cached) {
          this._itemEntries.delete(key);
        }
      });
    }
    return entries;
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
