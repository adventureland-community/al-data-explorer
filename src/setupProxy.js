const { createProxyMiddleware, Options } = require("http-proxy-middleware");

const options = {
  target: "http://adventure.land",
  // target: "https://adventure.land",
  // [HPM] Error occurred while proxying request localhost:3000/character/thmsn to https://adventure.land/ [UNABLE_TO_VERIFY_LEAF_SIGNATURE] (https://nodejs.org/api/errors.html#errors_common_system_errors)
  changeOrigin: true,
  pathRewrite: (path, req) => {
    return path.replace("/al", "");
  },
};

const adventurelandProxy = createProxyMiddleware("/al", options);

module.exports = (app) => {
  app.use(adventurelandProxy);
};
