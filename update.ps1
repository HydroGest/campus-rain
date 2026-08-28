$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root
$env:GIT_SSH_COMMAND = "ssh -o ConnectTimeout=15 -o BatchMode=yes"
$env:GIT_TERMINAL_PROMPT = "0"

function Git {
  param([string[]]$Args)
  & git @Args 2>&1 | Out-Host
  return $LASTEXITCODE
}

if (-not (Test-Path "scraper\node_modules")) {
  Write-Host "[update] installing deps..."
  Push-Location "scraper"
  npm ci | Out-Host
  Pop-Location
}

function Resolve-Rebase {
  Git @("checkout", "--theirs", "--", "data/weather.json") | Out-Null
  Git @("checkout", "--theirs", "--", "data/iot") | Out-Null
  Git @("add", "-A") | Out-Null
  $code = Git @("-c", "core.editor=true", "rebase", "--continue")
  if ($code -ne 0) {
    Git @("rebase", "--abort") | Out-Null
    Write-Host "[update] rebase failed, skip"
    exit 0
  }
}

Write-Host "[update] pulling..."
$code = Git @("pull", "--rebase", "origin", "main")
if ($code -ne 0) {
  Resolve-Rebase
}

Write-Host "[update] scraping..."
node "scraper\scrape.mjs" --mode=browser
if ($LASTEXITCODE -ne 0) {
  Write-Host "[update] scrape failed, exit=$LASTEXITCODE"
  exit 1
}

Git @("add", "data/weather.json", "data/iot") | Out-Null
if (Git @("diff", "--cached", "--quiet") -eq 0) {
  Write-Host "[update] no data change"
} else {
  Git @("commit", "-m", "chore: update weather data (local)")
}

Write-Host "[update] pulling again..."
$code = Git @("pull", "--rebase", "origin", "main")
if ($code -ne 0) {
  Resolve-Rebase
}

Git @("push", "origin", "main")
Write-Host "[update] done"
