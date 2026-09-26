# Publish QuietCord org repos (requires: gh auth login)
# Run from repo root: powershell -ExecutionPolicy Bypass -File scripts\publishQuietCord.ps1

$ErrorActionPreference = "Stop"

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "Install GitHub CLI and run: gh auth login"
    Write-Host "https://cli.github.com/"
    exit 1
}

$backendPath = "C:\Projects\QuietCord-Backend"
$clientPath = "C:\Projects\Quiet"
$backendRemote = "https://github.com/QuietCord/Backend.git"
$clientRemote = "https://github.com/QuietCord/Quiet.git"

function Test-GhRepo([string]$Name) {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    & gh repo view $Name 1>$null 2>$null
    $exists = ($LASTEXITCODE -eq 0)
    $ErrorActionPreference = $prev
    return $exists
}

function Ensure-GitRemote([string]$Name, [string]$Url) {
    $remotes = git remote
    if ($remotes -contains $Name) {
        git remote set-url $Name $Url
    }
    else {
        git remote add $Name $Url
    }
}

function Push-Main([string]$RemoteName) {
    $shallow = git rev-parse --is-shallow-repository 2>$null
    if ($shallow -eq "true") {
        Write-Host "Unshallow clone (required for first push)..."
        git fetch --unshallow
        if ($LASTEXITCODE -ne 0) { throw "git fetch --unshallow failed" }
    }
    git push -u $RemoteName main
    if ($LASTEXITCODE -ne 0) {
        git push -u $RemoteName HEAD:main
    }
    if ($LASTEXITCODE -ne 0) { throw "git push to $RemoteName failed" }
}

Write-Host "=== QuietCord/Backend ==="
Push-Location $backendPath
try {
    Ensure-GitRemote "origin" $backendRemote
    if (-not (Test-GhRepo "QuietCord/Backend")) {
        Write-Host "Creating QuietCord/Backend on GitHub..."
        & gh repo create QuietCord/Backend --public --description "Quiet cloud API (Vencord Backend fork)"
        if ($LASTEXITCODE -ne 0) { throw "gh repo create Backend failed" }
    }
    Write-Host "Pushing Backend..."
    Push-Main "origin"
}
finally {
    Pop-Location
}

Write-Host "=== QuietCord/Quiet (client) ==="
if (-not (Test-GhRepo "QuietCord/Quiet")) {
    Write-Host "Creating QuietCord/Quiet on GitHub..."
    & gh repo create QuietCord/Quiet --public --description "Quiet Discord client mod (Vencord fork)"
    if ($LASTEXITCODE -ne 0) { throw "gh repo create Quiet failed" }
}

Push-Location $clientPath
try {
    Ensure-GitRemote "origin" $clientRemote
    Write-Host "Pushing client to origin..."
    Push-Main "origin"
}
finally {
    Pop-Location
}

Write-Host "Done: https://github.com/QuietCord"
