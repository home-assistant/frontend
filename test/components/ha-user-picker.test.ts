import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import "../../src/components/user/ha-user-picker";
import type { User } from "../../src/data/user";
import type { HomeAssistant } from "../../src/types";

const USERS = [
  {
    id: "user-firstuser",
    username: "firstuser",
    name: "First User",
    is_owner: false,
    is_active: true,
    local_only: false,
    system_generated: false,
    group_ids: [],
    credentials: [],
  },
] as unknown as User[];

const hassWithUsers = (users: User[]) =>
  ({
    localize: (key: string) => key,
    callWS: () => Promise.resolve(users),
  }) as unknown as HomeAssistant;

const headlineText = (el: HTMLElement): string => {
  const texts: string[] = [];
  const walk = (root: ParentNode) => {
    for (const node of Array.from(root.querySelectorAll("*"))) {
      if (node.getAttribute("slot") === "headline") {
        texts.push(node.textContent?.trim() ?? "");
      }
      if (node.shadowRoot) {
        walk(node.shadowRoot);
      }
    }
  };
  walk(el.shadowRoot!);
  return texts.join("|");
};

const tick = () =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

// the picker fetches its users, so let its update and that fetch both land
const settle = async (el: any) => {
  await Promise.all([el.updateComplete, tick()]);
  await Promise.all([el.updateComplete, tick()]);
  await el.updateComplete;
};

describe("ha-user-picker", () => {
  beforeAll(() => {
    // ha-generic-picker asks for it while connecting, jsdom does not provide it
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as any;
    const internalsProto = window.ElementInternals.prototype as any;
    internalsProto.setValidity = vi.fn();
    internalsProto.setFormValue = vi.fn();
    Object.defineProperty(internalsProto, "validity", {
      get: () => ({ valid: true }),
      configurable: true,
    });
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("names the user its value refers to", async () => {
    const el = document.createElement("ha-user-picker") as any;
    el.hass = hassWithUsers(USERS);
    el.users = USERS;
    el.value = "user-firstuser";
    document.body.appendChild(el);

    await settle(el);

    expect(headlineText(el)).toContain("First User");
  });

  it("names the user once the fetched list arrives", async () => {
    // A standalone picker fetches its own users, so it is first asked to render
    // a value it cannot resolve yet. It must not settle on the raw user id.
    const el = document.createElement("ha-user-picker") as any;
    el.hass = hassWithUsers(USERS);
    el.value = "user-firstuser";
    document.body.appendChild(el);

    await settle(el);

    expect(headlineText(el)).toContain("First User");
    expect(headlineText(el)).not.toContain("user-firstuser");
  });
});
