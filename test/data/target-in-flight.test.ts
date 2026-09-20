import { describe, expect, it, vi } from "vitest";

import { extractFromTarget } from "../../src/data/target";

type CallWS = Parameters<typeof extractFromTarget>[0];

const callWS = () => vi.fn().mockResolvedValue({}) as unknown as CallWS;

describe("extractFromTarget in-flight sharing", () => {
  it("shares identical concurrent requests", async () => {
    const ws = callWS();
    const target = { area_id: ["bathroom"] };

    await Promise.all([
      extractFromTarget(ws, target),
      extractFromTarget(ws, target),
    ]);

    expect(ws).toHaveBeenCalledTimes(1);
  });

  it("does not share different targets", async () => {
    const ws = callWS();

    await Promise.all([
      extractFromTarget(ws, { area_id: ["bathroom"] }),
      extractFromTarget(ws, { area_id: ["kitchen"] }),
    ]);

    expect(ws).toHaveBeenCalledTimes(2);
  });

  it("does not share different expandGroup values", async () => {
    const ws = callWS();
    const target = { area_id: ["bathroom"] };

    await Promise.all([
      extractFromTarget(ws, target, false),
      extractFromTarget(ws, target, true),
    ]);

    expect(ws).toHaveBeenCalledTimes(2);
  });

  it("does not share different primaryEntitiesOnly values", async () => {
    const ws = callWS();
    const target = { area_id: ["bathroom"] };

    await Promise.all([
      extractFromTarget(ws, target, false, true),
      extractFromTarget(ws, target, false, false),
    ]);

    expect(ws).toHaveBeenCalledTimes(2);
  });

  it("does not share between different callWS owners", async () => {
    const first = callWS();
    const second = callWS();
    const target = { area_id: ["bathroom"] };

    await Promise.all([
      extractFromTarget(first, target),
      extractFromTarget(second, target),
    ]);

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("fetches again after the request settles", async () => {
    const ws = callWS();
    const target = { area_id: ["bathroom"] };

    await extractFromTarget(ws, target);
    await extractFromTarget(ws, target);

    expect(ws).toHaveBeenCalledTimes(2);
  });
});
