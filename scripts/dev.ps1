$ErrorActionPreference = "Stop"

$env:Path = "$PSScriptRoot;$env:Path"

$webProcess = Start-Process `
  -FilePath "corepack" `
  -ArgumentList "pnpm --dir web dev" `
  -WorkingDirectory (Resolve-Path "$PSScriptRoot\..") `
  -WindowStyle Hidden `
  -PassThru

try {
  corepack pnpm dev:server
}
finally {
  if ($webProcess -and -not $webProcess.HasExited) {
    Stop-Process -Id $webProcess.Id
  }
}
