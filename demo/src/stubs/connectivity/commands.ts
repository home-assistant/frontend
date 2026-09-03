// WS command prefixes served by the connectivity mocks in ./index. Kept in its
// own module so ha-demo can add them to the lazily loaded config panel chunk
// without eagerly importing the mock data itself.
export const CONNECTIVITY_COMMANDS = [
  "bluetooth/",
  "matter/",
  "thread/",
  "otbr/",
  "zha/",
  "zwave_js/",
  "mqtt/",
  "usb/",
  "radio_frequency/",
];
