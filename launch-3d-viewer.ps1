# Change to the directory where this script is located
Set-Location -Path $PSScriptRoot

# Try to start a simple HTTP server on port 8000 (requires Python)
$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCmd) {
    Write-Error "Python is not installed or not in PATH."
    exit 1
}

# Start the server in the background, only if not already running
$existing = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if (-not $existing) {
    Start-Process -FilePath "python" -ArgumentList "-m http.server 8000" -WindowStyle Hidden
    Start-Sleep -Seconds 1
}

# Open the browser at 3D-Viewer.html
Start-Process "http://localhost:8000/3D-Viewer.html"