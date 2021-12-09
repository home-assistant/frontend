/* eslint no-bitwise: ["error", { "allow": ["<<",">>","&"] }] */
export function semver2int(semver: string): number {
  const parts = semver.split(".");
  return (
    (parseInt(parts[0]) << 12) + (parseInt(parts[1]) << 8) + parseInt(parts[2])
  );
}

export function int2semver(ver: number | undefined): string {
  if (ver) {
    return (
      ((ver & 0xf000) >> 12) +
      "." +
      ((ver & 0x0f00) >> 8) +
      "." +
      (ver & 0x00ff)
    );
  }
  return "";
}
