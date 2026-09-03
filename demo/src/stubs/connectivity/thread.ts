import type { OTBRInfoDict } from "../../../../src/data/otbr";
import type { ThreadDataSet, ThreadRouter } from "../../../../src/data/thread";
import type { MockHomeAssistant } from "../../../../src/fake_data/provide_hass";
import { emitInitial } from "./subscription";

const HA_EXT_PAN_ID = "dead00beef00cafe";
const APPLE_EXT_PAN_ID = "0011223344556677";

const OTBR_EXT_ADDRESS = "f6a1c30d2b4e5f61";
const OTBR_BORDER_AGENT_ID = "230c6a1ac57f6f4be262acf32e5ef52c";

const ROUTERS: ThreadRouter[] = [
  {
    instance_name: "HomeAssistant OpenThreadBorderRouter",
    addresses: ["192.168.1.10"],
    border_agent_id: OTBR_BORDER_AGENT_ID,
    brand: "homeassistant",
    extended_address: OTBR_EXT_ADDRESS,
    extended_pan_id: HA_EXT_PAN_ID,
    model_name: "OpenThread Border Router",
    network_name: "ha-thread",
    server: "core-openthread-border-router.local.",
    thread_version: "1.3.0",
    unconfigured: null,
    vendor_name: "Home Assistant",
  },
  {
    instance_name: "HomePod mini",
    addresses: ["192.168.1.24"],
    border_agent_id: "6a1ac57f6f4be262acf32e5ef52c230c",
    brand: "apple",
    extended_address: "aabbccddeeff0011",
    extended_pan_id: APPLE_EXT_PAN_ID,
    model_name: "HomePod mini",
    network_name: "MyHome",
    server: "homepod-mini.local.",
    thread_version: "1.3.0",
    unconfigured: null,
    vendor_name: "Apple Inc.",
  },
  {
    instance_name: "Nest Hub",
    addresses: ["192.168.1.31"],
    border_agent_id: "ac57f6f4be262acf32e5ef52c230c6a1",
    brand: "google",
    extended_address: "bbccddeeff001122",
    extended_pan_id: APPLE_EXT_PAN_ID,
    model_name: "Google Nest Hub",
    network_name: "MyHome",
    server: "nest-hub.local.",
    thread_version: "1.3.0",
    unconfigured: null,
    vendor_name: "Google Inc.",
  },
];

const DATASETS: ThreadDataSet[] = [
  {
    channel: 15,
    created: new Date(Date.now() - 86400000 * 30).toISOString(),
    dataset_id: "ha-thread-dataset",
    extended_pan_id: HA_EXT_PAN_ID,
    network_name: "ha-thread",
    pan_id: "1234",
    preferred_border_agent_id: OTBR_BORDER_AGENT_ID,
    preferred_extended_address: OTBR_EXT_ADDRESS,
    preferred: true,
    source: "otbr",
  },
  {
    channel: 25,
    created: new Date(Date.now() - 86400000 * 90).toISOString(),
    dataset_id: "myhome-dataset",
    extended_pan_id: APPLE_EXT_PAN_ID,
    network_name: "MyHome",
    pan_id: "abcd",
    preferred_border_agent_id: null,
    preferred_extended_address: null,
    preferred: false,
    source: "Google",
  },
];

const OTBR_INFO: OTBRInfoDict = {
  [OTBR_EXT_ADDRESS]: {
    active_dataset_tlvs:
      "0E080000000000010000000300000F350600004001020000000208DEAD00BEEF00CAFE0708FD11220000000000051000112233445566778899AAABBCCDDEEFF030A68612D74687265616401021234041035060004001FFFE00C0402A0F7F8",
    border_agent_id: OTBR_BORDER_AGENT_ID,
    channel: 15,
    extended_address: OTBR_EXT_ADDRESS,
    extended_pan_id: HA_EXT_PAN_ID,
    url: "http://core-openthread-border-router:8081",
  },
};

export const mockThread = (hass: MockHomeAssistant) => {
  hass.mockWS("thread/discover_routers", (_msg, _hass, onChange) =>
    emitInitial(() =>
      ROUTERS.forEach((router) =>
        onChange?.({
          key: router.extended_address,
          type: "router_discovered",
          data: router,
        })
      )
    )
  );

  hass.mockWS("thread/list_datasets", () => ({ datasets: DATASETS }));
  hass.mockWS("thread/get_dataset_tlv", () => ({
    tlv: OTBR_INFO[OTBR_EXT_ADDRESS].active_dataset_tlvs,
  }));

  hass.mockWS("otbr/info", () => OTBR_INFO);
};
