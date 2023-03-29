const leftPad = (num: number, digits = 2) => {
  let paddedNum = "" + num;
  for (let i = 1; i < digits; i++) {
    paddedNum = parseInt(paddedNum) < 10 ** i ? `0${paddedNum}` : paddedNum;
  }
  return paddedNum;
};

export default function millisecondsToDuration(d: number) {
  const h = Math.floor(d / 1000 / 3600);
  const m = Math.floor(((d / 1000) % 3600) / 60);
  const s = Math.floor(((d / 1000) % 3600) % 60);
  const ms = Math.floor(d % 1000);

  if (h > 0) {
    return `${h}:${leftPad(m)}:${leftPad(s)}`;
  }
  if (m > 0) {
    return `${m}:${leftPad(s)}`;
  }
  if (s > 0 || ms > 0) {
    return `${s}${ms > 0 ? `.${leftPad(ms, 3)}` : ``}`;
  }
  return null;
}
