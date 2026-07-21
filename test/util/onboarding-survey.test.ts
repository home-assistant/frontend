import type { Connection } from "home-assistant-js-websocket";
import {
  afterEach,
  assert,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { CoreFrontendSystemData } from "../../src/data/frontend";
import type { CurrentUser } from "../../src/types";
import {
  getOnboardingSurveyUrl,
  recordOnboardingSurvey,
  shouldShowOnboardingSurvey,
} from "../../src/util/onboarding-survey";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-07-20T12:00:00.000Z").getTime();

const daysAgo = (days: number) => new Date(NOW - days * DAY).toISOString();

const owner = { is_owner: true } as CurrentUser;
const nonOwner = { is_owner: false } as CurrentUser;

describe("shouldShowOnboardingSurvey", () => {
  it("returns false without a user", () => {
    assert.isFalse(
      shouldShowOnboardingSurvey(undefined, { onboarded_date: daysAgo(6) }, NOW)
    );
  });

  it("returns false for a non-owner user", () => {
    assert.isFalse(
      shouldShowOnboardingSurvey(nonOwner, { onboarded_date: daysAgo(6) }, NOW)
    );
  });

  it("returns false without system data", () => {
    assert.isFalse(shouldShowOnboardingSurvey(owner, undefined, NOW));
    assert.isFalse(shouldShowOnboardingSurvey(owner, {}, NOW));
  });

  it("returns false when onboarded less than 5 days ago", () => {
    assert.isFalse(
      shouldShowOnboardingSurvey(owner, { onboarded_date: daysAgo(4) }, NOW)
    );
  });

  it("returns false when onboarded more than 30 days ago", () => {
    assert.isFalse(
      shouldShowOnboardingSurvey(owner, { onboarded_date: daysAgo(31) }, NOW)
    );
  });

  it("returns false for an invalid date", () => {
    assert.isFalse(
      shouldShowOnboardingSurvey(owner, { onboarded_date: "not-a-date" }, NOW)
    );
  });

  it("returns false for a date in the future", () => {
    assert.isFalse(
      shouldShowOnboardingSurvey(owner, { onboarded_date: daysAgo(-1) }, NOW)
    );
  });

  it("returns false when already interacted with", () => {
    assert.isFalse(
      shouldShowOnboardingSurvey(
        owner,
        {
          onboarded_date: daysAgo(6),
          surveys: { onboarding: { date: daysAgo(1), action: "dismissed" } },
        },
        NOW
      )
    );
    assert.isFalse(
      shouldShowOnboardingSurvey(
        owner,
        {
          onboarded_date: daysAgo(6),
          surveys: { onboarding: { date: daysAgo(1), action: "opened" } },
        },
        NOW
      )
    );
  });

  it("returns true within the 5-30 day window", () => {
    assert.isTrue(
      shouldShowOnboardingSurvey(owner, { onboarded_date: daysAgo(5) }, NOW)
    );
    assert.isTrue(
      shouldShowOnboardingSurvey(owner, { onboarded_date: daysAgo(15) }, NOW)
    );
    assert.isTrue(
      shouldShowOnboardingSurvey(owner, { onboarded_date: daysAgo(30) }, NOW)
    );
  });

  it("returns true when surveys exists without the onboarding flag", () => {
    assert.isTrue(
      shouldShowOnboardingSurvey(
        owner,
        { onboarded_date: daysAgo(6), surveys: {} },
        NOW
      )
    );
  });
});

describe("recordOnboardingSurvey", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stores the interaction and preserves existing fields", async () => {
    const sendMessagePromise = vi.fn().mockResolvedValue(undefined);
    const conn = { sendMessagePromise } as unknown as Connection;
    const systemData: CoreFrontendSystemData = {
      default_panel: "lovelace",
      onboarded_version: "2026.7.0",
      onboarded_date: daysAgo(6),
    };

    await recordOnboardingSurvey(conn, systemData, "dismissed");

    expect(sendMessagePromise).toHaveBeenCalledWith({
      type: "frontend/set_system_data",
      key: "core",
      value: {
        default_panel: "lovelace",
        onboarded_version: "2026.7.0",
        onboarded_date: daysAgo(6),
        surveys: {
          onboarding: {
            date: new Date(NOW).toISOString(),
            action: "dismissed",
          },
        },
      },
    });
  });

  it("merges an existing surveys object", async () => {
    const sendMessagePromise = vi.fn().mockResolvedValue(undefined);
    const conn = { sendMessagePromise } as unknown as Connection;

    await recordOnboardingSurvey(conn, { surveys: {} }, "opened");

    expect(sendMessagePromise).toHaveBeenCalledWith({
      type: "frontend/set_system_data",
      key: "core",
      value: {
        surveys: {
          onboarding: { date: new Date(NOW).toISOString(), action: "opened" },
        },
      },
    });
  });
});

describe("getOnboardingSurveyUrl", () => {
  it("includes the version param and ignores the onboard date", () => {
    assert.strictEqual(
      getOnboardingSurveyUrl({
        onboarded_version: "2026.7.0",
        onboarded_date: "2026-07-14T12:00:00.000Z",
      }),
      "https://www.home-assistant.io/surveys/onboarding?version=2026.7.0"
    );
  });

  it("omits a missing version param", () => {
    assert.strictEqual(
      getOnboardingSurveyUrl({}),
      "https://www.home-assistant.io/surveys/onboarding"
    );
  });
});
