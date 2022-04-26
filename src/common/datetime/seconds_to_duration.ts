const leftPad = (num: number) => (num < 10 ? `0${num}` : num);

export default function secondsToDuration(d: number) {
  const days = Math.floor(d / 86400);
  d -= days * 86400;
  const h = Math.floor(d / 3600);
  const m = Math.floor((d % 3600) / 60);
  const s = Math.floor((d % 3600) % 60);

  if (days > 0) {
    return `${days} ${h}:${leftPad(m)}:${leftPad(s)}`;
  }
  if (h > 0) {
    return `${h}:${leftPad(m)}:${leftPad(s)}`;
  }
  if (m > 0) {
    return `${m}:${leftPad(s)}`;
  }
  if (s > 0) {
    return "" + s;
  }
  return null;
}
