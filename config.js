// dataMode:
//   "static" - 读取 data/weather.json（GitHub Pages / 静态托管）
//   "worker" - 通过 Cloudflare Worker 实时抓取（设置 workerUrl）
window.APP_CONFIG = {
  dataMode: "static",
  workerUrl: "",
  refreshMinutes: 30,
  showHours: 24
};
