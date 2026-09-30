<# : Script Windows (partie Batch puis PowerShell) - ne pas modifier ce bloc
@echo off
setlocal
for /f "tokens=2 delims=:." %%c in ('chcp') do set "KIT_OLDCP=%%c"
chcp 65001 >nul
set "KIT_SELF=%~f0"
set "KIT_ARGS=%*"
powershell -NoProfile -ExecutionPolicy Bypass -Command "iex ([IO.File]::ReadAllText($env:KIT_SELF, [Text.Encoding]::UTF8))"
set "KIT_RC=%ERRORLEVEL%"
chcp %KIT_OLDCP% >nul
exit /b %KIT_RC%
#>
# ---------------------------------------------------------------------------
# talend-log-extract.bat - extrait la preuve utile d'un log Talend / Runtime.
# Produit : premiere erreur avec contexte, chaine "Caused by" filtree,
# compteurs d'exceptions, lignes de fin de Job. Secrets masques. Lecture seule.
#
# Usage :
#   scripts\talend-log-extract.bat logs\J_LOAD_CLIENTS.log
#   scripts\talend-log-extract.bat karaf.log --context 8 --frames 5
#   scripts\talend-log-extract.bat job.log --grep tMysqlOutput_1
# Compatible Windows PowerShell 5.1 et pwsh 7.
# ---------------------------------------------------------------------------
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch { }
$kitArgs = @()
if ($env:KIT_ARGS) {
  foreach ($m in [regex]::Matches($env:KIT_ARGS, '"([^"]*)"|(\S+)')) {
    if ($m.Groups[1].Success) { $kitArgs += $m.Groups[1].Value } else { $kitArgs += $m.Groups[2].Value }
  }
}
$logFile = $null; $ctx = 5; $maxFrames = 3; $grep = $null; $enc = 'utf-8'
for ($i = 0; $i -lt $kitArgs.Count; $i++) {
  switch ($kitArgs[$i]) {
    '--context' { $i++; $ctx = [int]$kitArgs[$i] }
    '--frames' { $i++; $maxFrames = [int]$kitArgs[$i] }
    '--grep' { $i++; $grep = $kitArgs[$i] }
    '--encoding' { $i++; $enc = $kitArgs[$i] }
    default { $logFile = $kitArgs[$i] }
  }
}
if (-not $logFile -or -not (Test-Path -LiteralPath $logFile -PathType Leaf)) {
  Write-Output 'Usage : scripts\talend-log-extract.bat <fichier.log> [--context 5] [--frames 3] [--grep motif] [--encoding utf-8|windows-1252]'
  exit 2
}
$reErr = '\b(ERROR|FATAL|SEVERE)\b|Exception\b|^\s*Caused by:|Exception in component'
$reExc = '\b((?:[a-z_$][\w$]*\.)+[A-Z][\w$]*(?:Exception|Error))\b'
$reCaused = 'Caused by:\s*([\w$.]+)'
$reFrame = '^\s+at\s+(?:[\w.]+/)?([\w$.<>]+)\('
$reJobPkg = '\.[a-z0-9_]+_\d+_\d+\.'
$reStats = '(?i)\b(tStatCatcher|NB_LINE|rows?\s+(inserted|updated|rejected)|Job .* (ended|exited))'
$noise = @('java.', 'javax.', 'jdk.', 'sun.', 'org.apache.camel.impl', 'org.apache.cxf.phase', 'org.eclipse.', 'org.osgi.', 'com.sun.')
function Hide-Secrets([string]$l) {
  $l = [regex]::Replace($l, '(?i)(password|passwd|pwd|secret|token|apikey|api_key)(\s*[=:]\s*)([^\s,;&"'']+)', '$1$2****')
  $l = [regex]::Replace($l, '(?i)(authorization:\s*(?:bearer|basic)\s+)\S+', '$1****')
  $l = [regex]::Replace($l, '(://[^:/\s]+:)[^@/\s]+@', '$1****@')
  return $l.TrimEnd()
}
function Test-Noise([string]$meth) { foreach ($p in $noise) { if ($meth.StartsWith($p)) { return $true } }; return $false }
function Fmt([int]$n, [string]$l) { return ('{0,6}: {1}' -f ($n + 1), (Hide-Secrets $l)) }

$encoding = [Text.Encoding]::GetEncoding($enc)
$lines = [IO.File]::ReadAllLines((Resolve-Path -LiteralPath $logFile).Path, $encoding)
$first = -1
for ($n = 0; $n -lt $lines.Count; $n++) { if ($lines[$n] -match $reErr) { $first = $n; break } }
$counts = [ordered]@{}
foreach ($l in $lines) {
  $mm = [regex]::Match($l, $reCaused); if (-not $mm.Success) { $mm = [regex]::Match($l, $reExc) }
  if ($mm.Success) { $k = $mm.Groups[1].Value; if ($counts.Contains($k)) { $counts[$k]++ } else { $counts[$k] = 1 } }
}
$o = New-Object System.Collections.Generic.List[string]
$o.Add("# Extrait de log — ``$logFile``"); $o.Add('')
$firstTxt = 'aucune'; if ($first -ge 0) { $firstTxt = "ligne $($first + 1)" }
$o.Add("$($lines.Count) lignes lues · première erreur : $firstTxt"); $o.Add('')
$o.Add('> Extrait par `talend-log-extract.bat` ; secrets masqués.'); $o.Add('')
if ($first -lt 0) {
  $o.Add('Aucune ligne ERROR / Exception détectée. Vérifier le bon fichier ou la période.')
  $o | ForEach-Object { Write-Output $_ }; exit 0
}
$lo = [math]::Max(0, $first - $ctx); $hi = [math]::Min($lines.Count - 1, $first + $ctx)
$o.Add('## Première erreur (avec contexte)'); $o.Add(''); $o.Add('```text')
for ($n = $lo; $n -le $hi; $n++) { $o.Add((Fmt $n $lines[$n])) }
$o.Add('```'); $o.Add('')

$o.Add("## Chaîne d'exceptions"); $o.Add(''); $o.Add('```text')
$kept = 0; $frames = 0; $jobFrames = 0; $inChain = $false
for ($n = $first; $n -lt $lines.Count; $n++) {
  $l = $lines[$n]; $st = $l.TrimStart()
  if ($st.StartsWith('Caused by:') -or (-not $inChain -and $l -match $reExc)) {
    $o.Add((Fmt $n $l)); $inChain = $true; $frames = 0; $jobFrames = 0; $kept++
    if ($kept -ge 12) { $o.Add('        … (chaîne tronquée)'); break }
  }
  elseif ($inChain -and $l -match $reFrame) {
    $meth = $matches[1]
    $generated = $meth -match $reJobPkg
    if ($generated -or ($frames -lt $maxFrames -and -not (Test-Noise $meth))) {
      if (-not $generated -or $jobFrames -lt $maxFrames) { $o.Add((Fmt $n $l)) }
      if ($generated) { $jobFrames++ } else { $frames++ }
    }
  }
  elseif ($inChain -and ($st -eq '' -or $st.StartsWith('...'))) { continue }
  elseif ($inChain) { break }
}
$o.Add('```'); $o.Add('')

if ($counts.Count -gt 0) {
  $o.Add('## Exceptions rencontrées'); $o.Add(''); $o.Add('| Exception | Occurrences |'); $o.Add('|---|---:|')
  $counts.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 8 | ForEach-Object { $o.Add("| $($_.Key) | $($_.Value) |") }
  $o.Add('')
}
$stats = @(); for ($n = 0; $n -lt $lines.Count -and $stats.Count -lt 10; $n++) { if ($lines[$n] -match $reStats) { $stats += (Fmt $n $lines[$n]) } }
if ($stats.Count -gt 0) { $o.Add('## Compteurs / fin de Job'); $o.Add(''); $o.Add('```text'); $stats | ForEach-Object { $o.Add($_) }; $o.Add('```'); $o.Add('') }
if ($grep) {
  $hits = @(); for ($n = 0; $n -lt $lines.Count; $n++) { if ($lines[$n].Contains($grep)) { $hits += (Fmt $n $lines[$n]) } }
  $o.Add("## Occurrences de ``$grep`` ($($hits.Count))"); $o.Add(''); $o.Add('```text')
  $hits | Select-Object -First 15 | ForEach-Object { $o.Add($_) }
  if ($hits.Count -gt 15) { $o.Add('        …') }
  $o.Add('```'); $o.Add('')
}
$o | ForEach-Object { Write-Output $_ }
exit 0
