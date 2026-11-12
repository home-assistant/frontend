import { afterEach, describe, expect, it, vi } from "vitest";
import "../../../../src/panels/lovelace/components/hui-generic-entity-row";
import { createMockEntityState, createMockHass } from "../../../fixtures/hass";

const mountRow = async (catchInteraction = false) => {
  const row = document.createElement("hui-generic-entity-row");
  row.hass = createMockHass({
    "input_boolean.porch": createMockEntityState("input_boolean.porch", "off"),
  });
  row.config = { entity: "input_boolean.porch" };
  row.catchInteraction = catchInteraction;
  const control = document.createElement("button");
  row.append(control);
  document.body.append(row);
  await row.updateComplete;
  const moreInfo = vi.fn();
  row.addEventListener("hass-more-info", moreInfo);
  return {
    control,
    moreInfo,
    rowElement: row.shadowRoot!.querySelector(".row")!,
    name: row.shadowRoot!.querySelector(".info")!,
  };
};

const press = (element: Element) =>
  element.dispatchEvent(
    new PointerEvent("pointerdown", { bubbles: true, composed: true })
  );

const click = (element: Element) =>
  element.dispatchEvent(
    new MouseEvent("click", { bubbles: true, composed: true, detail: 1 })
  );

describe("hui-generic-entity-row", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("ignores the row click that follows a press on the control", async () => {
    const { control, moreInfo, rowElement } = await mountRow();
    press(control);
    click(rowElement);
    expect(moreInfo).not.toHaveBeenCalled();
  });

  it("lets a click without a press through after a click on the control", async () => {
    const { control, moreInfo, rowElement } = await mountRow();
    press(control);
    click(control);
    click(rowElement);
    expect(moreInfo).toHaveBeenCalledOnce();
  });

  it("lets a click on the control reach the control", async () => {
    const { control, moreInfo } = await mountRow();
    const controlClick = vi.fn();
    control.addEventListener("click", controlClick);
    press(control);
    click(control);
    expect(controlClick).toHaveBeenCalledOnce();
    expect(moreInfo).not.toHaveBeenCalled();
  });

  it("opens more info for a press on the name after a press on the control", async () => {
    const { control, moreInfo, name } = await mountRow();
    press(control);
    press(name);
    click(name);
    expect(moreInfo).toHaveBeenCalledOnce();
  });

  it("opens more info for a press on the state of a row without a control", async () => {
    const { control: state, moreInfo, rowElement } = await mountRow(true);
    press(state);
    click(rowElement);
    expect(moreInfo).toHaveBeenCalledOnce();
  });
});
