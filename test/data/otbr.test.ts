import { describe, expect, it } from "vitest";

import type { OTBRInfo, OTBRInfoDict } from "../../src/data/otbr";
import { findOTBRInfoForDataset } from "../../src/data/otbr";
import type { ThreadDataSet } from "../../src/data/thread";

const otbr = (
  extended_address: string,
  extended_pan_id: string | null
): OTBRInfo => ({
  active_dataset_tlvs: null,
  border_agent_id: "230c6a1ac57f6f4be262acf32e5ef52c",
  channel: 15,
  extended_address,
  extended_pan_id,
  url: "http://core-openthread-border-router:8081",
});

const dataset = (overrides: Partial<ThreadDataSet>): ThreadDataSet => ({
  channel: 15,
  created: "2026-01-01T00:00:00+00:00",
  dataset_id: "01HVSHZ0AEFDTXQTW2J335N82B",
  extended_pan_id: "1111111111111111",
  network_name: "ha-thread",
  pan_id: "1234",
  preferred_border_agent_id: null,
  preferred_extended_address: null,
  preferred: true,
  source: "otbr",
  ...overrides,
});

const OTHER_NETWORK = otbr("aaaaaaaaaaaaaaaa", "2222222222222222");
const SAME_NETWORK = otbr("bbbbbbbbbbbbbbbb", "1111111111111111");
const OTBR_INFO: OTBRInfoDict = {
  [OTHER_NETWORK.extended_address]: OTHER_NETWORK,
  [SAME_NETWORK.extended_address]: SAME_NETWORK,
};

describe("findOTBRInfoForDataset", () => {
  it("returns the preferred border router, even when it is on another network", () => {
    expect(
      findOTBRInfoForDataset(
        OTBR_INFO,
        dataset({ preferred_extended_address: OTHER_NETWORK.extended_address })
      )
    ).toBe(OTHER_NETWORK);
  });

  it("falls back to a border router on the same extended PAN ID", () => {
    expect(findOTBRInfoForDataset(OTBR_INFO, dataset({}))).toBe(SAME_NETWORK);
    expect(
      findOTBRInfoForDataset(
        OTBR_INFO,
        dataset({ preferred_extended_address: "cccccccccccccccc" })
      )
    ).toBe(SAME_NETWORK);
  });

  it("returns undefined without OTBR info or a matching border router", () => {
    expect(findOTBRInfoForDataset(undefined, dataset({}))).toBeUndefined();
    expect(
      findOTBRInfoForDataset(
        OTBR_INFO,
        dataset({ extended_pan_id: "3333333333333333" })
      )
    ).toBeUndefined();
  });
});
