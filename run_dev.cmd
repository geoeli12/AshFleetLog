@echo off
setlocal

REM --- Portable Node path ---
set "NODE_PATH=C:\Users\JorgeCastaneda\Documents\Tools\node\node-v24.13.0-win-x64"

REM --- Folder this .cmd is in (so it works from double-click) ---
set "HERE=%~dp0"
if "%HERE:~-1%"=="\" set "HERE=%HERE:~0,-1%"

REM --- Run from this folder (must contain package.json with dev script) ---
pushd "%HERE%"

REM --- Start dev server (PowerShell stays open because -NoExit) ---
start "DEV SERVER" "%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -NoExit -Command "$env:Path='%NODE_PATH%;%NODE_PATH%\node_modules\npm\bin;' + $env:Path; Set-Location '%HERE%'; node -v; & '%NODE_PATH%\npm.cmd' -v; & '%NODE_PATH%\npm.cmd' run dev;"

popd
