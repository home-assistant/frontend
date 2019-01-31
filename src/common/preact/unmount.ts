import { render } from "preact";

export default function unmount(mountEl) {
  render(
    // @ts-ignore
    () => null,
    mountEl
  );
}
