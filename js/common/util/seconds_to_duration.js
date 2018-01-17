export default function secondsToDuration(d) {
  const h = Math.floor(d / 3600);
  const m = Math.floor((d % 3600) / 60);
  const s = Math.floor(d % 3600 % 60);

  if (h > 0) {
    return `${h}:${String(m).padStart(2, 0)}:${String(s).padStart(2, 0)}`;
  } else if (m > 0) {
    return `${m}:${String(s).padStart(2, 0)}`;
  } else if (s > 0) {
    return '' + s;
  }
  return null;
}
