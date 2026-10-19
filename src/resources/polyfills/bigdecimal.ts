import Decimal from "decimal.js";

// Like @formatjs/bigdecimal: never exponent notation, and log(10) from
// Math.log10, as the precise log is slow and NumberFormat calls it per value
const BigDecimal = Decimal.clone({
  precision: 40,
  toExpNeg: -9e15,
  toExpPos: 9e15,
});

// Clones share this prototype; this shim is the only decimal.js user
const { log } = BigDecimal.prototype;
BigDecimal.prototype.log = function (this: Decimal, base?: Decimal.Value) {
  const value = this.toNumber();
  if (base !== 10 || !(value > 0) || !Number.isFinite(value)) {
    return log.call(this, base);
  }
  // Math.log10 rounds values just below a power of ten up to it
  const result = Math.log10(value);
  return new BigDecimal(result < this.e + 1 ? result : this.e + 0.5);
};

export { BigDecimal, BigDecimal as Decimal, BigDecimal as default };
