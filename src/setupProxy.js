const { createProxyMiddleware } = require("http-proxy-middleware");

/** Local dev only — character/player import fetches adventure.land HTML (CORS). */
const adventurelandProxy = createProxyMiddleware("/al", {
  target: "https://adventure.land",
  changeOrigin: true,
  pathRewrite: (path) => path.replace("/al", ""),
});

module.exports = (app) => {
  app.use(adventurelandProxy);
};
