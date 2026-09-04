import type { OTBRInfoDict } from "../../../../../src/data/otbr";
import type {
  ThreadDataSet,
  ThreadRouter,
} from "../../../../../src/data/thread";
import type { MockHomeAssistant } from "../../../../../src/fake_data/provide_hass";
import { emitInitial } from "../subscription";

// Uppercase to match the hex in `active_dataset_tlvs` below: the dataset
// dialog looks for this ID inside that string with a case-sensitive
// `includes`, and shows the border router's URL only when it matches.
const HA_EXT_PAN_ID = "DEAD00BEEF00CAFE";
const AMAZON_EXT_PAN_ID = "0011223344556677";

const OTBR_EXT_ADDRESS = "f6a1c30d2b4e5f61";
const OTBR_BORDER_AGENT_ID = "230c6a1ac57f6f4be262acf32e5ef52c";

// The preferred network is shared by Home Assistant's own border router and the
// Apple and Google border routers that joined it. The Amazon network is only
// discovered: Amazon does not share its Thread credentials, so it has no
// dataset and cannot be made preferred.
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
    extended_pan_id: HA_EXT_PAN_ID,
    model_name: "HomePod mini",
    network_name: "ha-thread",
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
    extended_pan_id: HA_EXT_PAN_ID,
    model_name: "Google Nest Hub",
    network_name: "ha-thread",
    server: "nest-hub.local.",
    thread_version: "1.3.0",
    unconfigured: null,
    vendor_name: "Google Inc.",
  },
  {
    instance_name: "Echo (4th Gen)",
    addresses: ["192.168.1.42"],
    border_agent_id: "57f6f4be262acf32e5ef52c230c6a1ac",
    brand: "amazon",
    extended_address: "ccddeeff00112233",
    extended_pan_id: AMAZON_EXT_PAN_ID,
    model_name: "Echo",
    network_name: "AmazonThread",
    server: "amazon-echo.local.",
    thread_version: "1.3.0",
    unconfigured: null,
    vendor_name: "Amazon",
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

let added = 0;
let created = 0;

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

  hass.mockWS("thread/list_datasets", () => ({
    datasets: DATASETS.map((dataset) => ({ ...dataset })),
  }));
  hass.mockWS("thread/get_dataset_tlv", () => ({
    tlv: OTBR_INFO[OTBR_EXT_ADDRESS].active_dataset_tlvs,
  }));

  hass.mockWS("otbr/info", () => OTBR_INFO);

  // The panel offers all of the below, and refetches after each, so they
  // change the data rather than just resolving.
  hass.mockWS(
    "thread/add_dataset_tlv",
    (msg: { source: string; tlv: string }) => {
      added += 1;
      DATASETS.push({
        channel: 15,
        created: new Date().toISOString(),
        dataset_id: `added-dataset-${added}`,
        extended_pan_id: msg.tlv.slice(0, 16).toUpperCase(),
        network_name: `added-network-${added}`,
        pan_id: "abcd",
        preferred_border_agent_id: null,
        preferred_extended_address: null,
        preferred: false,
        source: msg.source,
      });
      return undefined;
    }
  );

  hass.mockWS("thread/delete_dataset", (msg: { dataset_id: string }) => {
    const index = DATASETS.findIndex(
      (dataset) => dataset.dataset_id === msg.dataset_id
    );
    if (index === -1) {
      throw new Error(`Dataset ${msg.dataset_id} not found`);
    }
    if (DATASETS[index].preferred) {
      // What the backend refuses too, so the panel shows its error.
      throw new Error("Preferred dataset cannot be deleted");
    }
    DATASETS.splice(index, 1);
    return undefined;
  });

  hass.mockWS("thread/set_preferred_dataset", (msg: { dataset_id: string }) => {
    DATASETS.forEach((dataset) => {
      dataset.preferred = dataset.dataset_id === msg.dataset_id;
    });
    return undefined;
  });

  hass.mockWS(
    "thread/set_preferred_border_agent",
    (msg: {
      dataset_id: string;
      border_agent_id: string | null;
      extended_address: string;
    }) => {
      const dataset = DATASETS.find(
        (candidate) => candidate.dataset_id === msg.dataset_id
      );
      if (dataset) {
        dataset.preferred_border_agent_id = msg.border_agent_id;
        dataset.preferred_extended_address = msg.extended_address;
      }
      return undefined;
    }
  );

  // Resets the border router onto a network of its own.
  hass.mockWS("otbr/create_network", (msg: { extended_address: string }) => {
    created += 1;
    const dataset: ThreadDataSet = {
      channel: 15,
      created: new Date().toISOString(),
      dataset_id: `created-dataset-${created}`,
      extended_pan_id: HA_EXT_PAN_ID,
      network_name: `ha-thread-${created}`,
      pan_id: "1234",
      preferred_border_agent_id: OTBR_BORDER_AGENT_ID,
      preferred_extended_address: msg.extended_address,
      preferred: true,
      source: "otbr",
    };
    DATASETS.forEach((existing) => {
      existing.preferred = false;
    });
    DATASETS.push(dataset);
    return undefined;
  });

  hass.mockWS(
    "otbr/set_network",
    (msg: { extended_address: string; dataset_id: string }) => {
      const dataset = DATASETS.find(
        (candidate) => candidate.dataset_id === msg.dataset_id
      );
      const info = OTBR_INFO[msg.extended_address];
      if (dataset && info) {
        info.extended_pan_id = dataset.extended_pan_id;
        info.channel = dataset.channel ?? info.channel;
      }
      return undefined;
    }
  );

  // The panel reads the delay back to tell the user when the change lands.
  hass.mockWS(
    "otbr/set_channel",
    (msg: { extended_address: string; channel: number }) => {
      const info = OTBR_INFO[msg.extended_address];
      if (info) {
        info.channel = msg.channel;
      }
      return { delay: 120 };
    }
  );
};
