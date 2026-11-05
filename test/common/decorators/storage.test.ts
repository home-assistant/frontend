import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { afterEach, describe, expect, it } from "vitest";
import { getStorage, storage } from "../../../src/common/decorators/storage";

const KEY = "test-storage-subscriber-value";

@customElement("test-storage-subscriber")
class TestStorageSubscriber extends ReactiveElement {
  @storage({
    key: KEY,
    state: true,
    subscribe: true,
    storage: "sessionStorage",
  })
  public value?: string;

  public updates = 0;

  protected update(changedProperties) {
    super.update(changedProperties);
    this.updates++;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "test-storage-subscriber": TestStorageSubscriber;
  }
}

describe("storage decorator", () => {
  afterEach(() => {
    document.body.replaceChildren();
    getStorage("sessionStorage").setValue(KEY, undefined);
  });

  it("renders a value that changed while the element was disconnected", async () => {
    const element = document.createElement("test-storage-subscriber");
    document.body.append(element);
    await element.updateComplete;
    expect(element.updates).toBe(1);

    element.remove();
    document.body.append(element);
    await element.updateComplete;
    expect(element.updates).toBe(1);

    element.remove();
    getStorage("sessionStorage").setValue(KEY, "changed");
    document.body.append(element);
    await element.updateComplete;
    expect(element.updates).toBe(2);
    expect(element.value).toBe("changed");
  });
});
