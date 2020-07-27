export default function durationToSeconds(duration: string): number {
  let days = 0;
  if (duration.includes("day")) {
    const position = duration.indexOf("day");
    days = Number(duration.substr(0, position));
    duration = duration.split(",")[1];
  }
  const parts = duration.split(":").map(Number);
  return (days * 24 + parts[0]) * 3600 + parts[1] * 60 + parts[2];
}
