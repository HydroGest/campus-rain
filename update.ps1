$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

if (-not (Test-Path "scraper\node_modules")) {
  Write-Host "[update] 安装抓取依赖..."
  Push-Location "scraper"
  npm ci
  Pop-Location
}

Write-Host "[update] 开始抓取天气数据..."
node "scraper\scrape.mjs" --mode=browser
if ($LASTEXITCODE -ne 0) {
  Write-Host "[update] 抓取失败，退出码 $LASTEXITCODE"
  exit 1
}

git pull --rebase origin main 2>$null
if ($LASTEXITCODE -ne 0) {
  git rebase --abort 2>$null
  Write-Host "[update] 远端有冲突，跳过本次提交"
  exit 0
}

git add data/weather.json
if (git diff --cached --quiet) {
  Write-Host "[update] 数据无变化"
} else {
  git commit -m "chore: 更新天气数据（本机定时）"
  git push origin main
  Write-Host "[update] 已提交并推送"
}

Write-Host "[update] 完成"
