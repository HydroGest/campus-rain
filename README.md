# 雨否 · 校园临近降雨

面向广东高校学生的逐小时降雨与温度查询页。默认中山大学广州南校园（海珠区），可选中山大学番禺大学城东校园、北校园、珠海校区、深圳校区，并覆盖广东主要高校校区。

## 功能

- 未来 2 小时分钟级临近降雨：逐分钟雨强条、多少分钟后开始下雨 / 转晴、雨势增强还是减弱、最近雨带距离
- 数据新鲜度处理：已过分钟显示为斜纹并保留完整 120 分钟轨道，“现在”分界线右侧为按当前时间重排的剩余预报；超过 2 小时会提示“临近预报已过期”并建议刷新
- 数据差异提示：当中央气象台逐小时预报与雷达临近预报在未来 2 小时结论不一致时，页面会明确提示，并以分钟级雷达外推作为 2 小时内主要参考
- 空间口径标注：未来 2 小时为“本校区”点位（雷达回波外推），当前实况与逐小时预报为“区县”站（数值模式 / 实况站），栏目标题带角标、页脚有说明
- 逐小时预报：未来 24 小时天气现象、温度、湿度、是否降雨及雨级（小雨 / 中雨 / 大雨 / 暴雨）
- 未来 24 小时降雨时间线：按小时着色，一眼看出哪些时段有雨
- 降雨摘要：24 小时内有雨小时数、最强雨级、下一场雨开始时间、最高 / 最低温
- 当前实况：温度、天气、24 小时雨量、湿度、风向风力
- 专业直角界面：无圆角、高信息密度、移动端可用

## 数据来源

数据来自中国天气网（中央气象台）和彩云天气雷达临近预报，均无需 API Key、无调用额度限制：

- 逐小时预报：`weather1dn/{城市代码}.shtml` 页面内嵌的 `hour3data`
- 当前实况：`d1.weather.com.cn/sk_2d/{城市代码}.html`
- 分钟级临近降雨：彩云天气 H5 页面内 `/api/` 代理返回的雷达 `precipitation_2h`（未来 120 分钟逐分钟雨强、降水概率、文字描述）

`scraper/scrape.mjs` 支持两种抓取方式：

- `--mode=browser`：Playwright 启动 Chromium，模拟真实浏览器读取页面
- 默认：Node `fetch` 直接请求页面并解析内嵌 JSON

城市代码对应中国天气网的区县站，例如 `101280101` 广州、`101280102` 番禺、`101280601` 深圳、`101280701` 珠海。

校区坐标使用 OpenStreetMap/Photon 逐校区核验（WGS-84），再转换为国内地图/彩云使用的 GCJ-02；华师大学城、广东药科大学城在 OSM 未收录，保留校区级近似值。

## API 与缓存

项目提供 `api.json`（机器可读接口说明）。天气数据请求建议追加 `?t=<时间戳>` 防缓存；页面内部已使用 `cache: no-store` 并自动追加时间戳，`styles.css`、`app.js` 等静态资源也带版本号。

部署方式不同，可用接口也不同：

- GitHub Pages（静态构建）：只有 `data/weather.json`、`locations.js` 和前端资源，没有 `/api/weather`。
- Cloudflare Worker：既托管静态资源，也提供 `/api/weather?code=...&lat=...&lng=...` 实时抓取接口。

`api.json` 中每个接口都标了部署方式（Cloudflare Worker / GitHub Pages / 通用），避免在静态站点里误用动态接口。

## 本地运行

```bash
# 1. 生成数据（先安装依赖）
cd scraper
npm ci
node scrape.mjs --mode=browser

# 2. 回到项目根目录，启动静态服务器
cd ..
python -m http.server 8000
```

打开 `http://localhost:8000`。

## 部署到 GitHub Pages

分步操作：

1. 在 GitHub 新建仓库（公开仓库免费分钟数更充裕），不要勾选自动初始化 README。
2. 本地进入本项目目录，执行：

   ```bash
   git init
   git add .
   git commit -m "init: campus rain"
   git branch -M main
   git remote add origin https://github.com/你的用户名/你的仓库.git
   git push -u origin main
   ```

3. 打开仓库 Settings → Actions → General：
   - Workflow permissions 选择 `Read and write permissions`；
   - 允许 GitHub Actions 创建和批准 Pull Requests 可不勾选。
4. 打开仓库 Settings → Pages：
   - Source 选择 `GitHub Actions`，然后保存。
5. 到 Actions 页面找到 `更新天气数据` workflow，手动 `Run workflow` 一次。
6. 等待首次运行完成，Pages 会自动生成站点地址 `https://你的用户名.github.io/你的仓库/`。
7. 之后 workflow 每半小时抓取一次：更新 `data/weather.json`、提交并重新部署。手动刷新页面即可看到最新数据。

如果 Actions 运行失败，优先检查：

- 仓库是否允许 Actions（Settings → Actions → General → Actions permissions）；
- Workflow 是否有写权限（第 3 步）；
- 页面是否正常显示静态文件（相对路径，仓库名不影响访问）。

私有仓库注意：免费 Actions 分钟数约 2000 分钟/月，半小时一次可能偏紧，建议把 `.github/workflows/weather.yml` 中 cron 改为每小时一次，或改用 Cloudflare Worker 按需抓取。

页面使用相对路径，仓库名不影响访问。

## 部署到 Cloudflare Workers

项目根目录的 `wrangler.toml` 已配置静态资源托管和 API：

```bash
npm i -g wrangler
wrangler login
wrangler deploy
```

部署后：

- `https://campus-rain.你的子域.workers.dev/` 直接访问页面
- `https://campus-rain.你的子域.workers.dev/api/weather?code=101280102` 返回该区县逐小时数据（实时抓取，缓存 5 分钟）

Worker 实时模式无法复用彩云 H5 的浏览器会话，因此 `nowcast` 会使用 Open-Meteo 15 分钟临近预报作为无 Key 兜底；GitHub Pages 静态数据则由浏览器抓取彩云分钟级雷达数据。

如果要把页面改为实时走 Worker，编辑 `config.js`：

```js
window.APP_CONFIG = {
  dataMode: "worker",
  workerUrl: "https://campus-rain.你的子域.workers.dev"
};
```

## 校区覆盖

中山大学：南校园（海珠）、东校园（番禺大学城）、北校园（越秀）、珠海校区、深圳校区。

其他高校：华南理工、暨南大学、华南师范、广东工业、广州大学、广外、广州中医药、广州医科、广东药科、广东财经、南方医科、星海、广美、广警、深圳大学、南方科技、哈工大（深圳）、港中大（深圳）、深职大、北师大珠海、暨大珠海、珠海科技、汕头大学、广东海洋大学（湛江 / 阳江）、五邑大学、东莞理工、佛山大学、惠州学院、广东石油化工、韶关学院、韩山师范、嘉应学院、岭南师范、肇庆学院等。

## 说明与局限

- 天气网逐小时预报更新频率通常为 6 小时左右，页面会显示“18:00 更新”等更新时间；当前实况数据更及时。
- 分钟级临近预报基于雷达外推，2 小时内参考价值最高，雨势变化请结合雷达更新频次理解。
- 静态部署（GitHub Pages）的数据由定时任务生成，打开页面时如果距离上次抓取已过了一段时间，页面会把已过分钟标记为斜纹并重排剩余时段；CF Worker 模式则为实时抓取。
- 高校所在区县没有独立观测站时，取所在城市站或最近区县站数据，页面会显示对应区县名。
- 抓取对象为公开网页；若中国天气网调整页面结构，需同步更新 `scraper/scrape.mjs` 中的解析逻辑。
- 本工具用于出行参考，请以气象部门最新预报和预警为准。
