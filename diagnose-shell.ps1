#!/usr/bin/env pwsh
Write-Host "=== Shell Diagnostics ==="
try {
    $bun = bun --version 2>&1
    Write-Host "Bun version: $bun"
} catch {
    Write-Host "Bun check failed: $_"
}
try {
    $pwd = pwd
    Write-Host "PWD: $pwd"
} catch {
    Write-Host "PWD check failed: $_"
}
Write-Host "=== Done ==="
