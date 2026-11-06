import { afterEach, describe, expect, it, vi } from "vitest";
import type { LocalizeFunc } from "../../src/common/translations/localize";
import { HassBaseEl } from "../../src/state/hass-base-mixin";
import translationsMixin from "../../src/state/translations-mixin";
import type { HomeAssistant } from "../../src/types";
import { getTranslation } from "../../src/util/common-translation";

vi.mock("../../src/resources/translations-metadata", () => ({
  translationMetadata: {
    fragments: ["config"],
    translations: { en: { hash: "test", nativeName: "English" } },
  },
}));

vi.mock("../../src/util/common-translation", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getTranslation: vi.fn(() => Promise.resolve({ language: "en", data: {} })),
}));

class TranslationsElement extends translationsMixin(HassBaseEl) {
  public loadFragment() {
    return (
      this as unknown as Record<
        string,
        (language: string, panelUrl: string) => Promise<LocalizeFunc>
      >
    )._loadFragmentTranslations("en", "config");
  }
}
customElements.define("test-translations-element", TranslationsElement);

declare global {
  interface HTMLElementTagNameMap {
    "test-translations-element": TranslationsElement;
  }
}

const createElement = () => {
  const element = new TranslationsElement();
  element.hass = { language: "en", panels: {} } as unknown as HomeAssistant;
  return element;
};

describe("translations mixin fragment loading", () => {
  afterEach(() => {
    vi.mocked(getTranslation).mockClear();
  });

  it("requests a fragment again after a failed request", async () => {
    const element = createElement();
    vi.mocked(getTranslation)
      .mockRejectedValueOnce(new Error("Failed to fetch"))
      .mockResolvedValueOnce({
        language: "en",
        data: { "panel.config": "Loaded" },
      });

    await expect(element.loadFragment()).rejects.toThrow("Failed to fetch");
    await element.loadFragment();

    expect(getTranslation).toHaveBeenCalledTimes(2);
    expect(element.hass!.localize("panel.config")).toBe("Loaded");
  });

  it("does not request a fragment again after it loaded", async () => {
    const element = createElement();
    vi.mocked(getTranslation).mockResolvedValueOnce({
      language: "en",
      data: {},
    });

    await element.loadFragment();
    await element.loadFragment();

    expect(getTranslation).toHaveBeenCalledTimes(1);
  });

  it("shares a pending request between callers", async () => {
    const element = createElement();
    vi.mocked(getTranslation).mockResolvedValueOnce({
      language: "en",
      data: {},
    });

    await Promise.all([element.loadFragment(), element.loadFragment()]);

    expect(getTranslation).toHaveBeenCalledTimes(1);
  });
});
