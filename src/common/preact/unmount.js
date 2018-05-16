import { render } from 'preact';

export default function unmount(mountEl) {
  render(() => null, mountEl);
}
