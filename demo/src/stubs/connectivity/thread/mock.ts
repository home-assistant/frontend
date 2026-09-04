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

// Operational datasets are type/length/value triplets. Building them rather
// than pasting a literal keeps the declared lengths honest, and keeps each
// dataset's extended PAN ID and network name inside its own TLV.
const tlv = (type: number, value: string) =>
  type.toString(16).padStart(2, "0").toUpperCase() +
  (value.length / 2).toString(16).padStart(2, "0").toUpperCase() +
  value.toUpperCase();

const textToHex = (text: string) =>
  Array.from(text)
    .map((character) => character.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();

const buildDatasetTlv = (dataset: ThreadDataSet) =>
  [
    tlv(0x0e, "0000000000010000"), // active timestamp
    tlv(0x00, `00${(dataset.channel ?? 15).toString(16).padStart(4, "0")}`),
    tlv(0x35, "000040010200"), // channel mask
    tlv(0x02, dataset.extended_pan_id),
    tlv(0x07, "FD11220000000000"), // mesh-local prefix
    tlv(0x05, "00112233445566778899AABBCCDDEEFF"), // network key
    tlv(0x03, textToHex(dataset.network_name)),
    tlv(0x01, (dataset.pan_id ?? "1234").padStart(4, "0")),
    tlv(0x04, "1035060004001FFFE00C0402A0F7F800"), // PSKc
    tlv(0x0c, "02A0F7F8"), // security policy
  ].join("");

// Walks the triplets, so an import reads the credentials it was handed rather
// than guessing at fixed offsets. Undefined for anything that does not decode.
const parseDatasetTlv = (value: string) => {
  if (value.length % 2 !== 0 || !/^[0-9A-Fa-f]*$/.test(value)) {
    return undefined;
  }
  const fields = new Map<number, string>();
  let index = 0;
  while (index < value.length) {
    if (index + 4 > value.length) {
      return undefined;
    }
    const type = parseInt(value.slice(index, index + 2), 16);
    const length = parseInt(value.slice(index + 2, index + 4), 16);
    const start = index + 4;
    const end = start + length * 2;
    if (end > value.length) {
      return undefined;
    }
    fields.set(type, value.slice(start, end).toUpperCase());
    index = end;
  }
  const extendedPanId = fields.get(0x02);
  const networkName = fields.get(0x03);
  const activeTimestamp = fields.get(0x0e);
  // The backend refuses a dataset without an active timestamp, which is also
  // what decides whether an import replaces the network it names.
  if (
    !extendedPanId ||
    extendedPanId.length !== 16 ||
    !networkName ||
    !activeTimestamp ||
    activeTimestamp.length !== 16
  ) {
    return undefined;
  }
  const channel = fields.get(0x00);
  return {
    activeTimestamp,
    extendedPanId,
    networkName: (networkName.match(/../g) ?? [])
      .map((byte) => String.fromCharCode(parseInt(byte, 16)))
      .join(""),
    panId: fields.get(0x01) ?? null,
    channel: channel ? parseInt(channel.slice(2), 16) : null,
  };
};

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

const DATASET_TLVS: Record<string, string> = Object.fromEntries(
  DATASETS.map((dataset) => [dataset.dataset_id, buildDatasetTlv(dataset)])
);

const OTBR_INFO: OTBRInfoDict = {
  [OTBR_EXT_ADDRESS]: {
    active_dataset_tlvs: DATASET_TLVS["ha-thread-dataset"],
    border_agent_id: OTBR_BORDER_AGENT_ID,
    channel: 15,
    extended_address: OTBR_EXT_ADDRESS,
    extended_pan_id: HA_EXT_PAN_ID,
    url: "http://core-openthread-border-router:8081",
  },
};

let added = 0;
let created = 0;

// Eight bytes of hex, the shape the backend can actually return.
const randomExtendedPanId = () =>
  Array.from({ length: 8 }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, "0")
  )
    .join("")
    .toUpperCase();

// Keeps the router, the OTBR info and the subscribers in step, so the panel
// redraws the border router under its new network.
const moveRouter = (
  extendedAddress: string,
  extendedPanId: string,
  networkName: string,
  datasetId: string
) => {
  const info = OTBR_INFO[extendedAddress];
  if (info) {
    info.extended_pan_id = extendedPanId;
    // The dialog looks for the network's ID inside this, so it has to follow
    // the router onto its new network.
    info.active_dataset_tlvs =
      DATASET_TLVS[datasetId] ?? info.active_dataset_tlvs;
  }
  const router = ROUTERS.find(
    (candidate) => candidate.extended_address === extendedAddress
  );
  if (router) {
    router.extended_pan_id = extendedPanId;
    router.network_name = networkName;
    announce(router);
  }
};

type RouterListener = (event: {
  key: string;
  type: "router_discovered" | "router_removed";
  data: ThreadRouter;
}) => void;

// The panel groups the routers it renders from this stream, not from
// `otbr/info`, so a network change has to be pushed to whoever is listening or
// the router stays drawn on its old network.
const listeners = new Set<RouterListener>();

const announce = (router: ThreadRouter) =>
  listeners.forEach((listener) =>
    listener({
      key: router.extended_address,
      type: "router_discovered",
      data: router,
    })
  );

export const mockThread = (hass: MockHomeAssistant) => {
  hass.mockWS("thread/discover_routers", (_msg, _hass, onChange) => {
    const listener = onChange as RouterListener | undefined;
    if (listener) {
      listeners.add(listener);
    }
    const stopInitial = emitInitial(() => ROUTERS.forEach(announce));
    return () => {
      stopInitial();
      if (listener) {
        listeners.delete(listener);
      }
    };
  });

  hass.mockWS("thread/list_datasets", () => ({
    datasets: DATASETS.map((dataset) => ({ ...dataset })),
  }));
  hass.mockWS("thread/get_dataset_tlv", (msg: { dataset_id: string }) => {
    const value = DATASET_TLVS[msg.dataset_id];
    if (!value) {
      throw new Error(`Dataset ${msg.dataset_id} not found`);
    }
    return { tlv: value };
  });

  hass.mockWS("otbr/info", () => OTBR_INFO);

  // The panel offers all of the below, and refetches after each, so they
  // change the data rather than just resolving.
  hass.mockWS(
    "thread/add_dataset_tlv",
    (msg: { source: string; tlv: string }) => {
      // The backend refuses credentials it cannot decode, so the panel gets to
      // show its error rather than importing an invented network.
      const parsed = parseDatasetTlv(msg.tlv);
      if (!parsed) {
        throw new Error("Invalid dataset");
      }
      // Datasets sharing an extended PAN ID are revisions of one network, so
      // an import updates that network instead of adding a second card for it,
      // and only a newer active timestamp wins.
      const existing = DATASETS.find(
        (candidate) => candidate.extended_pan_id === parsed.extendedPanId
      );
      if (existing) {
        const current = parseDatasetTlv(DATASET_TLVS[existing.dataset_id]);
        if (current && parsed.activeTimestamp <= current.activeTimestamp) {
          return undefined;
        }
        existing.channel = parsed.channel;
        existing.network_name = parsed.networkName;
        existing.pan_id = parsed.panId;
        DATASET_TLVS[existing.dataset_id] = msg.tlv.toUpperCase();
        return undefined;
      }
      added += 1;
      const dataset: ThreadDataSet = {
        channel: parsed.channel,
        created: new Date().toISOString(),
        dataset_id: `added-dataset-${added}`,
        extended_pan_id: parsed.extendedPanId,
        network_name: parsed.networkName,
        pan_id: parsed.panId,
        preferred_border_agent_id: null,
        preferred_extended_address: null,
        preferred: false,
        source: msg.source,
      };
      DATASETS.push(dataset);
      // Kept verbatim: these are the credentials that were imported, so
      // reading them back has to hand back the same ones.
      DATASET_TLVS[dataset.dataset_id] = msg.tlv.toUpperCase();
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
  // A reset moves the border router onto a network of its own. It adds that
  // network rather than taking over the preferred one, which is what leaves
  // the panel its "add to my network" path back.
  hass.mockWS("otbr/create_network", (msg: { extended_address: string }) => {
    created += 1;
    const dataset: ThreadDataSet = {
      channel: 15,
      created: new Date().toISOString(),
      dataset_id: `created-dataset-${created}`,
      extended_pan_id: randomExtendedPanId(),
      network_name: `ha-thread-${created}`,
      pan_id: "1234",
      // A reset leaves the default router unset; nominating one is its own
      // action in the panel.
      preferred_border_agent_id: null,
      preferred_extended_address: null,
      preferred: false,
      source: "otbr",
    };
    DATASETS.push(dataset);
    DATASET_TLVS[dataset.dataset_id] = buildDatasetTlv(dataset);
    moveRouter(
      msg.extended_address,
      dataset.extended_pan_id,
      dataset.network_name,
      dataset.dataset_id
    );
    return undefined;
  });

  hass.mockWS(
    "otbr/set_network",
    (msg: { extended_address: string; dataset_id: string }) => {
      const dataset = DATASETS.find(
        (candidate) => candidate.dataset_id === msg.dataset_id
      );
      if (dataset) {
        const info = OTBR_INFO[msg.extended_address];
        if (info) {
          info.channel = dataset.channel ?? info.channel;
        }
        moveRouter(
          msg.extended_address,
          dataset.extended_pan_id,
          dataset.network_name,
          dataset.dataset_id
        );
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
