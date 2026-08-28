$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

if (-not (Test-Path "scraper\node_modules")) {
  Write-Host "[update] installing deps..."
  Push-Location "scraper"
  npm ci
  Pop-Location
}

function Resolve-Rebase {
  git checkout --theirs -- data/weather.json 2>$null
  git add data/weather.json 2>$null
  git -c core.editor=true rebase --continue 2>$null
  if ($LASTEXITCODE -ne 0) {
    git rebase --abort 2>$null
    Write-Host "[update] rebase failed, skip"
    exit 0
  }
}

Write-Host "[update] pulling..."
git pull --rebase origin main 2>$null
if ($LASTEXITCODE -ne 0) {
  Resolve-Rebase
}

Write-Host "[update] scraping..."
node "scraper\scrape.mjs" --mode=browser
if ($LASTEXITCODE -ne 0) {
  Write-Host "[update] scrape failed, exit=$LASTEXITCODE"
  exit 1
}

git add data/weather.json
if (git diff --cached --quiet) {
  Write-Host "[update] no data change"
} else {
  git commit -m "chore: update weather data (local)"
}

git pull --rebase origin main 2>$null
if ($LASTEXITCODE -ne 0) {
  Resolve-Rebase
}

git push origin main
Write-Host "[update] done"
