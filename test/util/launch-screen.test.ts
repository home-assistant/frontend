import { describe, expect, it } from "vitest";
import { updateLaunchScreenLogo } from "../../src/util/launch-screen";

describe("updateLaunchScreenLogo", () => {
  it("matches the OHF logo variant to the applied theme", () => {
    document.body.innerHTML = `
      <div id="ha-launch-screen">
        <div class="ohf-logo">
          <picture>
            <source media="(prefers-color-scheme: dark)" srcset="on-dark.svg">
            <img src="on-light.svg">
          </picture>
        </div>
      </div>`;
    const source = document.querySelector("source")!;

    updateLaunchScreenLogo(false);
    expect(source.media).toBe("not all");

    updateLaunchScreenLogo(true);
    expect(source.media).toBe("all");
  });

  it("does nothing once the launch screen is removed", () => {
    document.body.innerHTML = "";
    expect(() => updateLaunchScreenLogo(true)).not.toThrow();
  });
});
