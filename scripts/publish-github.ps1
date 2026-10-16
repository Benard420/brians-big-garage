# Creates the public GitHub repo "brians-big-garage" and pushes main.
# Signs in through Git Credential Manager (a browser window), so no terminal prompts are needed.
# The GitHub token is only used inside this process and is never printed.
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

Write-Host 'Getting GitHub sign-in from Git Credential Manager (a browser window may open)...'
$cred = "protocol=https`nhost=github.com`n`n" | git credential fill
$token = ($cred | Where-Object { $_ -like 'password=*' }) -replace '^password=', ''
if (-not $token) { throw 'No GitHub credential was returned. Sign in when the browser window opens, then run this again.' }
"protocol=https`nhost=github.com`nusername=$((($cred | Where-Object { $_ -like 'username=*' }) -replace '^username=', ''))`npassword=$token`n`n" | git credential approve

$env:GH_TOKEN = $token
$user = gh api user --jq .login
Write-Host "Signed in as $user"

if (git remote | Select-String -Quiet '^origin$') { git remote remove origin }
gh repo create "$user/brians-big-garage" --public --description "Brian's Big Garage - interactive animated STEM comic for kids (episodes 1-6)" --homepage "https://brians-big-garage.vercel.app" --source . --remote origin --push
Write-Host "Done: https://github.com/$user/brians-big-garage"
