$ErrorActionPreference = "Stop"

$env:Path = "$PSScriptRoot;$env:Path"
corepack pnpm check
