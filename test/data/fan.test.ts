import { describe, expect, it } from "vitest";
import type { LocalizeFunc } from "../../src/common/translations/localize";
import type { FanEntity } from "../../src/data/fan";
import {
  DateFormat,
  FirstWeekday,
  NumberFormat,
  TimeFormat,
  TimeZone,
} from "../../src/data/translation";
import {
  FanEntityFeature,
  completeFanSceneState,
  computeFanFavoriteFromState,
  computeFanFavoriteSaveBlocker,
  computeFanFavoriteSceneState,
  computeFanSnapshot,
  computeFanSpeedIcon,
  computeFanSpeeds,
  fanAcceptsFavorites,
  fanPercentageToSpeed,
  fanSpeedToPercentage,
  filterFanFavorite,
  findFanFavoriteIndex,
  formatFanFavorite,
  snapFanPercentage,
} from "../../src/data/fan";

const fan = (percentage_step?: number): FanEntity =>
  ({
    entity_id: "fan.test",
    state: "on",
    attributes: { percentage_step },
  }) as FanEntity;

describe("computeFanSpeeds", () => {
  it("uses named speeds when icons exist for every step", () => {
    expect(computeFanSpeeds(fan(100))).toEqual(["off", "on"]);
    expect(computeFanSpeeds(fan(50))).toEqual(["off", "low", "high"]);
    expect(computeFanSpeeds(fan(100 / 3))).toEqual([
      "off",
      "low",
      "medium",
      "high",
    ]);
  });

  it("uses numbered speeds for fans with more steps", () => {
    expect(computeFanSpeeds(fan(25))).toEqual(["off", "1", "2", "3", "4"]);
    expect(computeFanSpeeds(fan(20))).toEqual(["off", "1", "2", "3", "4", "5"]);
  });

  it("returns undefined when there are too many steps for buttons", () => {
    expect(computeFanSpeeds(fan(100 / 6))).toBeUndefined();
    expect(computeFanSpeeds(fan())).toBeUndefined();
  });
});

describe("fan speed and percentage conversion", () => {
  it("round-trips named speeds", () => {
    const stateObj = fan(100 / 3);
    expect(fanPercentageToSpeed(stateObj, 67)).toBe("medium");
    expect(fanSpeedToPercentage(stateObj, "medium")).toBe(66);
    expect(fanPercentageToSpeed(stateObj, 66)).toBe("medium");
  });

  it("round-trips numbered speeds", () => {
    const stateObj = fan(25);
    expect(fanPercentageToSpeed(stateObj, 0)).toBe("off");
    expect(fanPercentageToSpeed(stateObj, 75)).toBe("3");
    expect(fanSpeedToPercentage(stateObj, "4")).toBe(100);
  });
});

describe("computeFanSpeedIcon", () => {
  it("has icons for named speeds but not numbered ones", () => {
    expect(computeFanSpeedIcon(fan(100 / 3), "high")).toBeTypeOf("string");
    expect(computeFanSpeedIcon(fan(25), "off")).toBeTypeOf("string");
    expect(computeFanSpeedIcon(fan(25), "2")).toBeUndefined();
  });
});

const ALL_FEATURES =
  FanEntityFeature.SET_SPEED +
  FanEntityFeature.DIRECTION +
  FanEntityFeature.OSCILLATE;

const fullFan = (
  state: string,
  attributes: FanEntity["attributes"] = {},
  supported_features = ALL_FEATURES
): FanEntity =>
  ({
    entity_id: "fan.test",
    state,
    attributes: { supported_features, ...attributes },
  }) as FanEntity;

describe("snapFanPercentage", () => {
  it("snaps to the step the fan reports for that speed", () => {
    // The core reports 33 and 66 for a three speed fan, and maps 67 to high.
    const stateObj = fan(100 / 3);
    expect(snapFanPercentage(stateObj, 67)).toBe(100);
    expect(snapFanPercentage(stateObj, 100)).toBe(100);
    expect(snapFanPercentage(fan(100 / 6), 50)).toBe(50);
  });

  it("keeps the percentages reported by fans with many speeds", () => {
    // From 53 speeds on, the core's floor(k * 100 / n) falls closer to the
    // step below: rounding moved speed 9 of 53 (16%) to 15%.
    expect(snapFanPercentage(fan(100 / 53), 16)).toBe(16);
    // Speed 2 of 128 is reported as 1%: rounding turned it into 0%, off.
    expect(snapFanPercentage(fan(100 / 128), 1)).toBe(1);
  });

  it("never snaps a favorite down to off", () => {
    expect(snapFanPercentage(fan(25), 5)).toBe(25);
    expect(snapFanPercentage(fan(), 0.2)).toBe(1);
  });
});

describe("computeFanFavoriteFromState", () => {
  it("captures every supported feature", () => {
    expect(
      computeFanFavoriteFromState(
        fullFan("on", {
          percentage: 60,
          direction: "reverse",
          oscillating: false,
          preset_mode: "nature",
        })
      )
    ).toEqual({ percentage: 60, direction: "reverse", oscillating: false });
  });

  it("ignores attributes of unsupported features", () => {
    expect(
      computeFanFavoriteFromState(
        fullFan(
          "on",
          { percentage: 60, direction: "forward", oscillating: true },
          FanEntityFeature.SET_SPEED
        )
      )
    ).toEqual({ percentage: 60 });
  });

  it("returns nothing when there is no speed to save", () => {
    expect(computeFanFavoriteFromState(fullFan("off"))).toBeUndefined();
    expect(
      computeFanFavoriteFromState(fullFan("on", { percentage: 0 }))
    ).toBeUndefined();
    // An exclusive preset reports no percentage.
    expect(
      computeFanFavoriteFromState(
        fullFan("on", { percentage: undefined, preset_mode: "auto" })
      )
    ).toBeUndefined();
  });
});

describe("filterFanFavorite", () => {
  it("drops values of features the fan no longer supports", () => {
    expect(
      filterFanFavorite(fullFan("on", {}, FanEntityFeature.SET_SPEED), {
        percentage: 60,
        direction: "forward",
        oscillating: true,
      })
    ).toEqual({ percentage: 60 });
  });
});

describe("findFanFavoriteIndex", () => {
  const favorites = [
    { percentage: 30, direction: "forward" as const, oscillating: true },
    { percentage: 60, direction: "forward" as const, oscillating: true },
  ];

  it("finds a favorite with the same values", () => {
    const stateObj = fullFan("on");
    expect(
      findFanFavoriteIndex(stateObj, favorites, {
        percentage: 60,
        direction: "forward",
        oscillating: true,
      })
    ).toBe(1);
    expect(
      findFanFavoriteIndex(stateObj, favorites, {
        percentage: 60,
        direction: "reverse",
        oscillating: true,
      })
    ).toBe(-1);
  });

  it("compares speeds after snapping them to the current steps", () => {
    expect(
      findFanFavoriteIndex(fullFan("on", { percentage_step: 50 }), favorites, {
        percentage: 50,
        direction: "forward",
        oscillating: true,
      })
    ).toBe(0);
  });

  it("skips the favorite being updated", () => {
    expect(
      findFanFavoriteIndex(fullFan("on"), favorites, favorites[1], 1)
    ).toBe(-1);
  });
});

describe("computeFanSnapshot", () => {
  it("keeps the values to restore and leaves out missing ones", () => {
    expect(
      computeFanSnapshot(
        fullFan("on", {
          percentage: 40,
          preset_mode: "sleep",
          direction: undefined,
          oscillating: true,
        })
      )
    ).toEqual({
      state: "on",
      percentage: 40,
      preset_mode: "sleep",
      oscillating: true,
    });
    expect(computeFanSnapshot(fullFan("off", { percentage: 40 }))).toEqual({
      state: "off",
    });
    expect(computeFanSnapshot(fullFan("unavailable"))).toBeUndefined();
  });
});

describe("fanAcceptsFavorites", () => {
  const withSpeed = (features: number) =>
    fullFan(
      "on",
      { percentage_step: 25 },
      FanEntityFeature.SET_SPEED + features
    );
  const source = withSpeed(FanEntityFeature.OSCILLATE);

  it("requires the same speed steps", () => {
    expect(
      fanAcceptsFavorites(
        source,
        fullFan(
          "on",
          { percentage_step: 20 },
          FanEntityFeature.SET_SPEED + FanEntityFeature.OSCILLATE
        )
      )
    ).toBe(false);
  });

  it("rejects a fan with an extra feature", () => {
    expect(
      fanAcceptsFavorites(
        source,
        withSpeed(FanEntityFeature.OSCILLATE + FanEntityFeature.DIRECTION)
      )
    ).toBe(false);
  });

  it("rejects a fan missing a feature", () => {
    expect(fanAcceptsFavorites(source, withSpeed(0))).toBe(false);
  });

  it("accepts a fan with the same features", () => {
    expect(
      fanAcceptsFavorites(source, withSpeed(FanEntityFeature.OSCILLATE))
    ).toBe(true);
  });
});

describe("computeFanFavoriteSaveBlocker", () => {
  const favorites = [{ percentage: 30 }, { percentage: 60 }];

  it("blocks saving without a speed", () => {
    expect(computeFanFavoriteSaveBlocker(fullFan("off"), favorites)).toBe(
      "no_speed"
    );
  });

  it("blocks saving a duplicate, except of the favorite being updated", () => {
    const stateObj = fullFan(
      "on",
      { percentage: 60 },
      FanEntityFeature.SET_SPEED
    );
    expect(computeFanFavoriteSaveBlocker(stateObj, favorites)).toBe(
      "duplicate"
    );
    expect(computeFanFavoriteSaveBlocker(stateObj, favorites, 1)).toBe(
      undefined
    );
    expect(computeFanFavoriteSaveBlocker(stateObj, favorites, 0)).toBe(
      "duplicate"
    );
  });
});

describe("formatFanFavorite", () => {
  const formatters = {
    formatEntityState: (_stateObj, state?: string) =>
      state === "on" ? "On" : "Off",
    formatEntityAttributeValue: (_stateObj, attribute: string, value?: any) =>
      attribute === "percentage" ? `${value}%` : `${attribute}:${value}`,
  };
  const translations: Record<string, string> = {
    "ui.card.fan.speed.low": "Low",
    "ui.card.fan.speed.high": "High",
    "ui.card.fan.oscillation_on": "Oscillation on",
    "ui.card.fan.oscillation_off": "Oscillation off",
  };
  const i18n = {
    localize: ((key: string, values?: Record<string, unknown>) =>
      key === "ui.card.fan.speed.numbered"
        ? `Speed ${values?.speed}`
        : (translations[key] ?? "")) as LocalizeFunc,
    locale: {
      language: "en",
      number_format: NumberFormat.language,
      time_format: TimeFormat.language,
      date_format: DateFormat.language,
      time_zone: TimeZone.local,
      first_weekday: FirstWeekday.language,
    },
  };

  it("shows the percentage when the fan has too many speeds for buttons", () => {
    expect(
      formatFanFavorite(
        fullFan("on"),
        { percentage: 60, direction: "reverse", oscillating: true },
        formatters,
        i18n
      )
    ).toBe("60%, direction:reverse, and Oscillation on");
  });

  it("names the speed when the fan has few speeds", () => {
    expect(
      formatFanFavorite(
        fullFan("on", { percentage_step: 50 }, FanEntityFeature.SET_SPEED),
        { percentage: 50 },
        formatters,
        i18n
      )
    ).toBe("Low");
    expect(
      formatFanFavorite(
        fullFan("on", { percentage_step: 25 }, FanEntityFeature.SET_SPEED),
        { percentage: 75 },
        formatters,
        i18n
      )
    ).toBe("Speed 3");
    expect(
      formatFanFavorite(
        fullFan("on", { percentage_step: 100 }, FanEntityFeature.SET_SPEED),
        { percentage: 100 },
        formatters,
        i18n
      )
    ).toBe("On");
  });

  it("leaves out values of features the fan no longer supports", () => {
    expect(
      formatFanFavorite(
        fullFan(
          "on",
          { percentage_step: 50 },
          FanEntityFeature.SET_SPEED + FanEntityFeature.OSCILLATE
        ),
        { percentage: 100, direction: "forward", oscillating: false },
        formatters,
        i18n
      )
    ).toBe("High and Oscillation off");
  });
});

// The core compares direction and oscillation even when the target leaves
// them out, then calls the service with None, which fails. These tests
// protect the values filled in to prevent that.
describe("computeFanFavoriteSceneState", () => {
  it("keeps the current values of features the favorite leaves out", () => {
    expect(
      computeFanFavoriteSceneState(
        fullFan("on", {
          percentage: 30,
          direction: "forward",
          oscillating: true,
        }),
        { percentage: 60 }
      )
    ).toEqual({
      state: "on",
      percentage: 60,
      direction: "forward",
      oscillating: true,
    });
  });

  it("uses the favorite values when it has them", () => {
    expect(
      computeFanFavoriteSceneState(
        fullFan("on", { direction: "forward", oscillating: true }),
        { percentage: 60, direction: "reverse", oscillating: false }
      )
    ).toEqual({
      state: "on",
      percentage: 60,
      direction: "reverse",
      oscillating: false,
    });
  });

  it("leaves out values the fan does not report", () => {
    // A fan that reports no direction: the core then compares None with None.
    expect(
      computeFanFavoriteSceneState(fullFan("off"), { percentage: 60 })
    ).toEqual({ state: "on", percentage: 60 });
  });
});

describe("completeFanSceneState", () => {
  it("fills in a restored state that had no direction", () => {
    expect(
      completeFanSceneState(fullFan("on", { direction: "reverse" }), {
        state: "on",
        percentage: 40,
      })
    ).toEqual({ state: "on", percentage: 40, direction: "reverse" });
  });

  it("leaves a turn off target alone", () => {
    expect(
      completeFanSceneState(fullFan("on", { direction: "reverse" }), {
        state: "off",
      })
    ).toEqual({ state: "off" });
  });
});
