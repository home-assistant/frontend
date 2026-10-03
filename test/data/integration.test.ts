import { describe, expect, it, vi } from "vitest";

import type { IntegrationManifest } from "../../src/data/integration";
import {
  fetchIntegrationManifest,
  fetchIntegrationManifests,
  integrationIssuesUrl,
} from "../../src/data/integration";
import type { HomeAssistant } from "../../src/types";

const manifest = (
  overrides: Partial<IntegrationManifest> = {}
): IntegrationManifest =>
  ({
    domain: "evil",
    name: "Evil",
    is_built_in: false,
    config_flow: false,
    iot_class: "local_polling",
    documentation: "https://example.com/docs",
    ...overrides,
  }) as IntegrationManifest;

const hassWith = (result: unknown) =>
  ({ callWS: vi.fn().mockResolvedValue(result) }) as unknown as HomeAssistant;

// A custom integration ships its own manifest, so these URLs are untrusted.
/* eslint-disable no-script-url */
const UNSAFE_URL = "javascript:alert(1)";

describe("integration manifests", () => {
  it("strips unsafe URLs from a fetched list", async () => {
    const hass = hassWith([
      manifest({ documentation: UNSAFE_URL, issue_tracker: UNSAFE_URL }),
    ]);

    const [fetched] = await fetchIntegrationManifests(hass);

    expect(fetched.documentation).toBeUndefined();
    expect(fetched.issue_tracker).toBeUndefined();
  });

  it("strips unsafe URLs from a single fetched manifest", async () => {
    const hass = hassWith(manifest({ documentation: UNSAFE_URL }));

    expect((await fetchIntegrationManifest(hass, "evil"))!.documentation).toBe(
      undefined
    );
  });

  it("keeps http and https URLs", async () => {
    const hass = hassWith([
      manifest({
        documentation: "https://example.com/docs",
        issue_tracker: "http://example.com/issues",
      }),
    ]);

    const [fetched] = await fetchIntegrationManifests(hass);

    expect(fetched.documentation).toEqual("https://example.com/docs");
    expect(fetched.issue_tracker).toEqual("http://example.com/issues");
  });

  it("does not mutate the received manifest", async () => {
    const received = manifest({ documentation: UNSAFE_URL });
    const hass = hassWith([received]);

    await fetchIntegrationManifests(hass);

    expect(received.documentation).toEqual(UNSAFE_URL);
  });

  it("falls back to the core issue tracker for an unsafe issue_tracker", () => {
    expect(
      integrationIssuesUrl("evil", manifest({ issue_tracker: UNSAFE_URL }))
    ).toContain("https://github.com/home-assistant/core/issues");
  });
});
/* eslint-enable no-script-url */
