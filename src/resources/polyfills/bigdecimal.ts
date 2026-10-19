import Decimal from "decimal.js";

// Matches @formatjs/bigdecimal: 40 digit division, never exponent notation
const BigDecimal = Decimal.clone({
  precision: 40,
  toExpNeg: -9e15,
  toExpPos: 9e15,
});

export { BigDecimal, BigDecimal as Decimal, BigDecimal as default };
