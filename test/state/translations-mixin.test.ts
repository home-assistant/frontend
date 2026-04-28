import { describe, it, expect, vi, beforeEach } from "vitest";
import type { HomeAssistant } from "../../src/types";
import TranslationsMixin from "../../src/state/translations-mixin";
import { getHassTranslations } from "../../src/data/translation";
import { HassBaseEl } from "../../src/state/hass-base-mixin";

// Mock the dependencies
vi.mock("../../src/data/translation", () => ({
  getHassTranslations: vi.fn(),
  getHassTranslationsPre109: vi.fn(),
  saveTranslationPreferences: vi.fn(),
  subscribeTranslationPreferences: vi.fn(),
}));

vi.mock("../../src/util/common-translation", () => ({
  getLocalLanguage: vi.fn(() => "en"),
  getTranslation: vi.fn(),
  getUserLocale: vi.fn(),
}));

vi.mock("../../src/common/translations/localize", () => ({
  computeLocalize: vi.fn(async (_el, _lang, resources) => {
    const lang = _lang || "en";
    return (key: string) => resources[lang]?.[key] || key;
  }),
}));

vi.mock("../../src/resources/translations-metadata", () => ({
  translationMetadata: { fragments: [] },
}));

vi.mock("../../src/common/config/version", () => ({
  atLeastVersion: vi.fn(() => true),
}));

vi.mock("../../src/common/dom/fire_event", () => ({
  fireEvent: vi.fn(),
}));

vi.mock("../../src/common/util/compute_rtl", () => ({
  computeRTLDirection: vi.fn(() => "ltr"),
  setDirectionStyles: vi.fn(),
}));

vi.mock("../../src/common/util/debounce", () => ({
  debounce: vi.fn((fn) => fn),
}));

vi.mock("../../src/util/ha-pref-storage", () => ({
  storeState: vi.fn(),
}));

// Base class for testing
class TestElement extends HassBaseEl {}

let testElementTag = 0;

describe("TranslationsMixin", () => {
  let element: InstanceType<ReturnType<typeof TranslationsMixin>>;

  beforeEach(() => {
    vi.clearAllMocks();
    const mixedClass = TranslationsMixin(TestElement);
    const tagName = `test-translations-mixin-${++testElementTag}`;
    customElements.define(tagName, mixedClass);
    element = document.createElement(tagName) as InstanceType<
      ReturnType<typeof TranslationsMixin>
    >;
    element.hass = {
      language: "en",
      locale: {
        language: "en",
        number_format: "language" as any,
        time_format: "language" as any,
        date_format: "language" as any,
        time_zone: "local" as any,
        first_weekday: "language" as any,
      },
      localize: (key: string) => key,
      connection: {
        haVersion: "2024.1.0",
        subscribeEvents: vi.fn(),
      } as any,
    } as HomeAssistant;
  });

  describe("_updateResources concurrent updates", () => {
    it("should not lose translations when updates happen concurrently", async () => {
      // Simulate two concurrent translation loads
      const firstData = { key1: "value1", key2: "value2" };
      const secondData = { key3: "value3", key4: "value4" };

      // Start both updates concurrently
      const promise1 = (element as any)._updateResources("en", firstData);
      const promise2 = (element as any)._updateResources("en", secondData);

      // Wait for both to complete
      await Promise.all([promise1, promise2]);

      // Both sets of translations should be present
      const resources = (element as any).__resources;
      expect(resources.en).toBeDefined();
      expect(resources.en.key1).toBe("value1");
      expect(resources.en.key2).toBe("value2");
      expect(resources.en.key3).toBe("value3");
      expect(resources.en.key4).toBe("value4");
    });

    it("should merge with latest state after async boundary", async () => {
      // Pre-populate some translations
      (element as any).__resources = {
        en: { existing: "translation" },
      };

      const newData = { new: "value" };
      await (element as any)._updateResources("en", newData);

      const resources = (element as any).__resources;
      expect(resources.en.existing).toBe("translation");
      expect(resources.en.new).toBe("value");
    });

    it("should handle language change during update", async () => {
      const data = { key: "value" };
      const originalLocalize = element.hass!.localize;

      // Start update for English
      const promise = (element as any)._updateResources("en", data);

      // Change language before update completes
      element.hass!.language = "de";

      await promise;

      // Should not update hass.localize since language changed
      expect(element.hass!.localize).toBe(originalLocalize);
    });
  });

  describe("_loadHassTranslations cache bookkeeping", () => {
    it("should only mark translations as loaded after successful fetch", async () => {
      const mockTranslations = { test: "translation" };
      vi.mocked(getHassTranslations).mockResolvedValue(mockTranslations);

      await (element as any)._loadHassTranslations(
        "en",
        "state",
        "test_integration"
      );

      // Cache should be updated after successful fetch
      const cache = (element as any).__loadedTranslations;
      expect(cache.state).toBeDefined();
      expect(cache.state.integrations).toContain("test_integration");
    });

    it("should not mark as loaded if language changes during fetch", async () => {
      const mockTranslations = { test: "translation" };
      let resolveTranslations: (value: any) => void;
      const translationsPromise = new Promise((resolve) => {
        resolveTranslations = resolve;
      });
      vi.mocked(getHassTranslations).mockReturnValue(
        translationsPromise as any
      );

      // Start loading
      const loadPromise = (element as any)._loadHassTranslations(
        "en",
        "state",
        "test_integration"
      );

      // Change language before fetch completes
      element.hass!.language = "de";

      // Complete the fetch
      resolveTranslations!(mockTranslations);
      await loadPromise;

      // Cache should NOT be updated since language changed
      const cache = (element as any).__loadedTranslations;
      expect(cache.state?.integrations || []).not.toContain("test_integration");
    });

    it("should not refetch if already in cache", async () => {
      const mockTranslations = { test: "translation" };
      vi.mocked(getHassTranslations).mockResolvedValue(mockTranslations);

      // First load
      await (element as any)._loadHassTranslations(
        "en",
        "state",
        "test_integration"
      );
      expect(getHassTranslations).toHaveBeenCalledTimes(1);

      // Second load should use cache
      await (element as any)._loadHassTranslations(
        "en",
        "state",
        "test_integration"
      );
      expect(getHassTranslations).toHaveBeenCalledTimes(1);
    });

    it("should refetch when force is true", async () => {
      const mockTranslations = { test: "translation" };
      vi.mocked(getHassTranslations).mockResolvedValue(mockTranslations);

      // First load
      await (element as any)._loadHassTranslations(
        "en",
        "state",
        "test_integration"
      );
      expect(getHassTranslations).toHaveBeenCalledTimes(1);

      // Force reload
      await (element as any)._loadHassTranslations(
        "en",
        "state",
        "test_integration",
        undefined,
        true
      );
      expect(getHassTranslations).toHaveBeenCalledTimes(2);
    });
  });
});
