module.exports = {
  isProdBuild() {
    return process.env.NODE_ENV === "production";
  },
  isStatsBuild() {
    return process.env.STATS === "1";
  },
  isTest() {
    return process.env.IS_TEST === "true";
  },
  isNetlify() {
    return process.env.NETLIFY === "true";
  },
};
