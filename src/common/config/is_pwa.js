/** Return if the displaymode is in standalone mode (PWA). */
export default function isPwa() {
  return (window.matchMedia('(display-mode: standalone)').matches);
}
