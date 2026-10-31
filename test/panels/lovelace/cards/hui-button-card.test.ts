import { describe, expect, it, vi } from "vitest";
import "../../../../src/panels/lovelace/cards/hui-button-card";
import type { ButtonCardConfig } from "../../../../src/panels/lovelace/cards/types";
import type {
  HomeAssistantApi,
  HomeAssistantFormatters,
} from "../../../../src/types";

vi.hoisted(() => {
  Object.assign(globalThis, {
    __STATIC_PATH__: "/",
    __HASS_URL__: "",
    __BUILD__: "modern",
    __VERSION__: "test",
    __BACKWARDS_COMPAT__: false,
    __SUPERVISOR__: false,
    __NAMESPACE__: "frontend",
  });
});

describe("hui-button-card image support", () => {
  const makeCard = (
    config: Partial<ButtonCardConfig> = {}
  ): HTMLElementTagNameMap["hui-button-card"] => {
    const card = document.createElement(
      "hui-button-card"
    ) as HTMLElementTagNameMap["hui-button-card"];
    (card as any)._formatters = {
      formatEntityName: (_state: any, name?: string) => name || "Test",
    } as HomeAssistantFormatters;
    (card as any)._localize = (key: string) => key;
    card.setConfig({
      type: "button",
      ...config,
    });
    return card;
  };

  it("sets up config with image URL and respects icon_height", async () => {
    const card = makeCard({
      image: "https://example.com/test.png",
      icon_height: "50px",
    });
    document.body.appendChild(card);
    await card.updateComplete;

    const img = card.shadowRoot?.querySelector("img.image") as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.getAttribute("src")).toBe("https://example.com/test.png");
    expect(img.style.height).toBe("50px");
    expect(img.style.width).toBe("auto");

    const stateIcon = card.shadowRoot?.querySelector("ha-state-icon");
    expect(stateIcon).toBeNull();

    card.remove();
  });

  it("sets up config with local HA image path and prefixes with hassUrl", async () => {
    const card = makeCard({
      image: "/local/my_icon.png",
    });
    (card as any)._hassUrl = {
      hassUrl: (url: string) => `http://hass.local${url}`,
    };
    document.body.appendChild(card);
    await card.updateComplete;

    const img = card.shadowRoot?.querySelector("img.image") as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.getAttribute("src")).toBe("http://hass.local/local/my_icon.png");
    expect(img.style.height).toBe("");

    card.remove();
  });

  it("handles MediaSelectorValue image object and resolves media-source", async () => {
    const card = makeCard({
      image: { media_content_id: "media-source://image_upload/test123" },
      icon_height: "64px",
    });
    const mockCallWS = vi.fn().mockResolvedValue({ url: "/api/image/test123" });
    (card as any)._api = { callWS: mockCallWS } as unknown as HomeAssistantApi;
    (card as any)._hassUrl = {
      hassUrl: (url: string) => `http://hass.local${url}`,
    };

    document.body.appendChild(card);
    await card.updateComplete;

    expect(mockCallWS).toHaveBeenCalledWith({
      type: "media_source/resolve_media",
      media_content_id: "media-source://image_upload/test123",
    });

    // Wait for promise resolution and re-render
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    await card.updateComplete;

    const img = card.shadowRoot?.querySelector("img.image") as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.getAttribute("src")).toBe("http://hass.local/api/image/test123");
    expect(img.style.height).toBe("64px");

    card.remove();
  });

  it("renders ha-state-icon when no image is specified", async () => {
    const card = makeCard({
      icon: "mdi:lightbulb",
      icon_height: "40px",
    });
    document.body.appendChild(card);
    await card.updateComplete;

    const img = card.shadowRoot?.querySelector("img.image");
    expect(img).toBeNull();

    const stateIcon = card.shadowRoot?.querySelector(
      "ha-state-icon"
    ) as HTMLElement;
    expect(stateIcon).toBeTruthy();
    expect(stateIcon.style.height).toBe("40px");

    card.remove();
  });

  it("does not render image when show_icon is false", async () => {
    const card = makeCard({
      image: "https://example.com/test.png",
      show_icon: false,
    });
    document.body.appendChild(card);
    await card.updateComplete;

    const img = card.shadowRoot?.querySelector("img.image");
    expect(img).toBeNull();

    const stateIcon = card.shadowRoot?.querySelector("ha-state-icon");
    expect(stateIcon).toBeNull();

    card.remove();
  });
});
