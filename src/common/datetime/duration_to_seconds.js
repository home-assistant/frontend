export default function durationToSeconds(duration) {
  const parts = duration.split(":").map(Number);
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}
