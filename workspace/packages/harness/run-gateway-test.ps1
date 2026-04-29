#!/usr/bin/env pwsh
$ErrorActionPreference = "Continue"
$output = & bun run ./test-gateway-live.ts 2>&1
$output | ForEach-Object { Write-Host $_ }
Write-Host "`nExit code: $LASTEXITCODE"
