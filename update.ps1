$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

Write-Host "[update] triggering GitHub Actions..."
gh workflow run weather.yml --ref main
if ($LASTEXITCODE -ne 0) {
  Write-Host "[update] trigger failed"
  exit 1
}

Write-Host "[update] done, CI will scrape and deploy"
