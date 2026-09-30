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
# talend-item-extract.bat - resume compact et en LECTURE SEULE d'un Job Talend.
# Remplace la lecture brute d'un .item (souvent des centaines de Ko de XML)
# par des tableaux : contextes, composants, reglages cles, connexions,
# Jobs enfants, tMap, schemas et diagramme Mermaid. Secrets masques (****).
#
# Usage :
#   scripts\talend-item-extract.bat --list .
#   scripts\talend-item-extract.bat --job J_LOAD_CLIENTS . [--mermaid] [--schema]
#   scripts\talend-item-extract.bat process\Dossier\J_LOAD_CLIENTS_0.3.item --component tMap_1
# Aucun fichier n'est modifie. Compatible Windows PowerShell 5.1 et pwsh 7.
# ---------------------------------------------------------------------------
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch { }
$kitArgs = @()
if ($env:KIT_ARGS) {
  foreach ($m in [regex]::Matches($env:KIT_ARGS, '"([^"]*)"|(\S+)')) {
    if ($m.Groups[1].Success) { $kitArgs += $m.Groups[1].Value } else { $kitArgs += $m.Groups[2].Value }
  }
}
$opt = @{ list = $false; job = $null; mermaid = $false; schema = $false; component = $null; target = '.' }
for ($i = 0; $i -lt $kitArgs.Count; $i++) {
  switch ($kitArgs[$i]) {
    '--list' { $opt.list = $true }
    '--mermaid' { $opt.mermaid = $true }
    '--schema' { $opt.schema = $true }
    '--job' { $i++; $opt.job = $kitArgs[$i] }
    '--component' { $i++; $opt.component = $kitArgs[$i] }
    default { $opt.target = $kitArgs[$i] }
  }
}
$ArtifactDirs = @('process', 'process_mr', 'process_storm', 'route', 'service', 'joblets')
$KeyParams = @('FILENAME', 'FILE_NAME', 'DIRECTORY', 'ENCODING', 'FIELDSEPARATOR', 'ROWSEPARATOR', 'HEADER',
  'HOST', 'PORT', 'DBNAME', 'SCHEMA_DB', 'TABLE', 'TABLENAME', 'QUERY', 'DBTABLE',
  'USE_EXISTING_CONNECTION', 'CONNECTION', 'ACTION_ON_TABLE', 'ACTION_ON_DATA', 'COMMIT_EVERY',
  'DIE_ON_ERROR', 'DIE_ON_CHILD_ERROR', 'PROCESS', 'PROCESS:PROCESS_TYPE_CONTEXT',
  'PROCESS:PROCESS_TYPE_VERSION', 'TRANSMIT_WHOLE_CONTEXT', 'USE_DYNAMIC_JOB',
  'USE_INDEPENDENT_PROCESS', 'CONTEXTPARAMS', 'PRINT_OPERATIONS', 'LOAD_NEW_VARIABLE',
  'LOAD_NEW_VARIABLE_NOTINCONTEXT', 'DISABLE_WARNINGS', 'DISABLE_ERROR', 'DISABLE_INFO',
  'URL', 'URI', 'METHOD', 'HTTP_METHOD', 'REST_ENDPOINT', 'ENDPOINT', 'CONDITION', 'CODE',
  'REPOSITORY_SCHEMA_TYPE', 'PROPERTY_TYPE', 'SCHEMA:SCHEMA_TYPE', 'LIBRARY')
$AlwaysShow = @('DIE_ON_ERROR', 'DIE_ON_CHILD_ERROR', 'TRANSMIT_WHOLE_CONTEXT')

function Test-Sensitive([string]$name, [string]$field, [string]$value) {
  return ($field -eq 'PASSWORD') -or ($name -match '(?i)pass|pwd|secret|token|apikey|api_key|credential|private') -or ($value -like 'enc:*')
}
function Format-Value([string]$v, [bool]$sensitive) {
  if ($sensitive -and $v -ne '' -and $v -ne '""') { return '****' }
  $v = ($v -replace '\s+', ' ').Trim()
  if ($v.Length -gt 140) { return $v.Substring(0, 140) + '…' }
  return $v
}
function Esc([string]$v) { return $v.Replace('|', '\|') }
function Get-Params($el) {
  $h = [ordered]@{}
  foreach ($p in $el.ChildNodes) {
    if ($p.LocalName -ne 'elementParameter') { continue }
    $rows = @()
    foreach ($e in $p.ChildNodes) { if ($e.LocalName -eq 'elementValue') { $rows += , @($e.GetAttribute('elementRef'), $e.GetAttribute('value')) } }
    $h[$p.GetAttribute('name')] = @{ field = $p.GetAttribute('field'); value = $p.GetAttribute('value'); rows = $rows }
  }
  return $h
}
function Format-Rows($rows) {
  $vals = @($rows | ForEach-Object { "$($_[0])=$(Format-Value $_[1] (Test-Sensitive $_[0] '' $_[1]))" })
  $out = @()
  for ($k = 0; $k -lt $vals.Count; $k += 2) { $out += ($vals[$k..([math]::Min($k + 1, $vals.Count - 1))] -join ', ') }
  return ($out -join '; ')
}
function Read-Job([string]$path) {
  $xml = New-Object System.Xml.XmlDocument
  $xml.Load((Resolve-Path -LiteralPath $path).Path)
  $r = $xml.DocumentElement
  $job = @{ file = $path; jobType = $r.GetAttribute('jobType'); defaultContext = $r.GetAttribute('defaultContext');
            contexts = @(); settings = [ordered]@{}; nodes = @(); connections = @() }
  foreach ($c in $r.ChildNodes) {
    switch ($c.LocalName) {
      'context' {
        foreach ($cp in $c.ChildNodes) {
          if ($cp.LocalName -eq 'contextParameter') {
            $job.contexts += , @{ group = $c.GetAttribute('name'); name = $cp.GetAttribute('name'); type = $cp.GetAttribute('type');
                                   value = $cp.GetAttribute('value'); repo = [bool]$cp.GetAttribute('repositoryContextId') }
          }
        }
      }
      'parameters' {
        $ps = Get-Params $c
        foreach ($k in $ps.Keys) { if ($k -match 'IMPLICIT|STATS|^MULTI_THREAD') { $job.settings[$k] = $ps[$k].value } }
      }
      'node' {
        $ps = Get-Params $c
        $schema = @(); $mapper = $null
        foreach ($ch in $c.ChildNodes) {
          if ($ch.LocalName -eq 'metadata' -and ($ch.GetAttribute('connector') -eq 'FLOW' -or -not $ch.GetAttribute('connector'))) {
            foreach ($col in $ch.ChildNodes) {
              if ($col.LocalName -eq 'column') {
                $schema += , @($col.GetAttribute('name'), ($col.GetAttribute('type') -replace '^id_', ''), $col.GetAttribute('length'),
                               $col.GetAttribute('precision'), $col.GetAttribute('nullable'), $col.GetAttribute('key'), $col.GetAttribute('pattern'))
              }
            }
          }
          if ($ch.LocalName -eq 'nodeData') {
            $mapper = @{ in = @(); out = @(); var = @() }
            foreach ($t in $ch.ChildNodes) {
              $kind = switch ($t.LocalName) { 'inputTables' { 'in' } 'outputTables' { 'out' } 'varTables' { 'var' } default { $null } }
              if (-not $kind) { continue }
              $entries = @()
              foreach ($e in $t.ChildNodes) { if ($e.LocalName -eq 'mapperTableEntries') { $entries += , @($e.GetAttribute('name'), $e.GetAttribute('expression'), ($e.GetAttribute('type') -replace '^id_', '')) } }
              $join = $t.GetAttribute('joinType'); if (-not $join) { $join = $t.GetAttribute('matchingMode') }
              $filter = ''; if ($t.GetAttribute('activateExpressionFilter') -eq 'true') { $filter = $t.GetAttribute('expressionFilter') }
              $mapper[$kind] += , @{ name = $t.GetAttribute('name'); entries = $entries; join = $join; lookup = $t.GetAttribute('lookupMode');
                                      filter = $filter; reject = ($t.GetAttribute('reject') -eq 'true' -or $t.GetAttribute('rejectInnerJoin') -eq 'true') }
            }
          }
        }
        $un = '?'; if ($ps.Contains('UNIQUE_NAME')) { $un = $ps['UNIQUE_NAME'].value }
        $lab = ''; if ($ps.Contains('LABEL')) { $lab = $ps['LABEL'].value }
        $act = $true; if ($ps.Contains('ACTIVATE') -and $ps['ACTIVATE'].value -eq 'false') { $act = $false }
        $job.nodes += , @{ type = $c.GetAttribute('componentName'); name = $un; label = $lab; active = $act; params = $ps; schema = $schema; mapper = $mapper }
      }
      'connection' {
        $ps = Get-Params $c
        $cond = ''; if ($ps.Contains('CONDITION')) { $cond = $ps['CONDITION'].value }
        $job.connections += , @{ source = $c.GetAttribute('source'); target = $c.GetAttribute('target');
                                  type = $c.GetAttribute('connectorName'); label = $c.GetAttribute('label'); cond = $cond }
      }
    }
  }
  return $job
}
function Get-KeySettings($n) {
  $parts = @()
  foreach ($name in $KeyParams) {
    if (-not $n.params.Contains($name)) { continue }
    $p = $n.params[$name]
    if ($p.rows.Count -gt 0 -and $p.field -eq 'TABLE') { $t = Format-Rows $p.rows; if ($t) { $parts += "$name=[$t]" } }
    elseif (($p.value -ne '' -and $p.value -ne '""' -and $p.value -ne 'false') -or ($AlwaysShow -contains $name)) {
      $parts += "$name=$(Format-Value $p.value (Test-Sensitive $name $p.field $p.value))"
    }
  }
  foreach ($k in $n.params.Keys) { $p = $n.params[$k]; if ($p.field -eq 'PASSWORD' -and $p.value -ne '' -and $p.value -ne '""') { $parts += "$k=****" } }
  if ($n.schema.Count -gt 0) { $parts += "schéma=$($n.schema.Count) col." }
  if ($n.mapper) {
    $ins = @(); $idx = 0
    foreach ($t in $n.mapper.in) { $s = $t.name; if ($idx -gt 0 -and ($t.join -or $t.lookup)) { $s += "($($t.join)/$($t.lookup))" }; $ins += $s; $idx++ }
    $outs = @($n.mapper.out | ForEach-Object { $s = $_.name; if ($_.reject) { $s += '[reject]' }; if ($_.filter) { $s += '[filtre]' }; $s })
    $txt = "entrées=$($ins -join ', '); sorties=$($outs -join ', ')"
    if ($n.mapper.var.Count -gt 0) { $nv = 0; foreach ($v in $n.mapper.var) { $nv += $v.entries.Count }; $txt += "; variables=$nv" }
    $parts += "$txt (détail : --component)"
  }
  return ($parts -join '; ')
}
function Get-Param($n, $name) { if ($n.params.Contains($name)) { return $n.params[$name].value } return '?' }

function Write-Report($job) {
  $o = New-Object System.Collections.Generic.List[string]
  $o.Add("# Résumé Talend — ``$([IO.Path]::GetFileName($job.file))``"); $o.Add('')
  $o.Add("Source : ``$($job.file)`` · Type : $($job.jobType) · Contexte par défaut : $($job.defaultContext)"); $o.Add('')
  $o.Add('> Extrait en lecture seule par `talend-item-extract.bat`. Valeurs sensibles masquées (****).'); $o.Add('')
  $o.Add('## Contextes'); $o.Add('')
  if ($job.contexts.Count -gt 0) {
    $o.Add('| Groupe | Variable | Type | Valeur | Repository |'); $o.Add('|---|---|---|---|---|')
    foreach ($c in $job.contexts) {
      $sens = ($c.type -eq 'id_Password') -or (Test-Sensitive $c.name '' $c.value)
      $val = Esc (Format-Value $c.value $sens); if (-not $val) { $val = '(vide)' }
      $o.Add("| $($c.group) | $($c.name) | $($c.type -replace '^id_','') | $val | $(if ($c.repo) {'oui'} else {'non'}) |")
    }
  } else { $o.Add('Aucun contexte déclaré dans le Job.') }
  $set = @($job.settings.Keys | Where-Object { $job.settings[$_] -and $job.settings[$_] -ne 'false' } | ForEach-Object { "$_=$($job.settings[$_])" })
  if ($set.Count -gt 0) { $o.Add(''); $o.Add("Réglages Job (chargement implicite, stats) : $($set -join '; ')") }
  $o.Add(''); $o.Add('## Composants'); $o.Add('')
  $o.Add('| Nom | Type | Actif | Libellé | Réglages clés |'); $o.Add('|---|---|---|---|---|')
  foreach ($n in $job.nodes) {
    $lab = ''; if ($n.label -and $n.label -ne '__UNIQUE_NAME__') { $lab = Esc (Format-Value $n.label $false) }
    $o.Add("| $($n.name) | $($n.type) | $(if ($n.active) {'oui'} else {'**NON**'}) | $lab | $(Esc (Get-KeySettings $n)) |")
  }
  $o.Add(''); $o.Add('## Connexions'); $o.Add('')
  $o.Add('| Source | → Cible | Type | Libellé | Condition |'); $o.Add('|---|---|---|---|---|')
  foreach ($c in $job.connections) { $o.Add("| $($c.source) | $($c.target) | $($c.type) | $(Esc $c.label) | $(Esc (Format-Value $c.cond $false)) |") }
  $children = @($job.nodes | Where-Object { $_.type -eq 'tRunJob' -or $_.type -eq 'cRunJob' })
  if ($children.Count -gt 0) {
    $o.Add(''); $o.Add('## Jobs enfants (tRunJob)'); $o.Add('')
    foreach ($n in $children) {
      $o.Add("- **$($n.name)** → Job ``$(Get-Param $n 'PROCESS')`` · contexte ``$(Get-Param $n 'PROCESS:PROCESS_TYPE_CONTEXT')`` · transmit whole context=$(Get-Param $n 'TRANSMIT_WHOLE_CONTEXT') · die on child error=$(Get-Param $n 'DIE_ON_CHILD_ERROR')")
    }
  }
  if ($opt.schema) {
    $o.Add(''); $o.Add('## Schémas (connecteur FLOW)'); $o.Add('')
    foreach ($n in $job.nodes) {
      if ($n.schema.Count -eq 0) { continue }
      $o.Add("### $($n.name)"); $o.Add(''); $o.Add('| Colonne | Type | Long. | Préc. | Nullable | Clé | Pattern |'); $o.Add('|---|---|---|---|---|---|---|')
      foreach ($c in $n.schema) { $o.Add('| ' + (($c | ForEach-Object { Esc $_ }) -join ' | ') + ' |') }
      $o.Add('')
    }
  }
  if ($opt.mermaid) {
    $o.Add(''); $o.Add("## Diagramme [F] (généré depuis l'artefact)"); $o.Add(''); $o.Add('```mermaid'); $o.Add('flowchart LR')
    foreach ($n in $job.nodes) { $st = ''; if (-not $n.active) { $st = ':::inactive' }; $o.Add("  $($n.name)[`"$($n.name)<br/>$($n.type)`"]$st") }
    foreach ($c in $job.connections) {
      $arrow = '-.->'; if (@('FLOW', 'MAIN', 'ITERATE', 'LOOKUP', 'REJECT', 'FILTER') -contains $c.type) { $arrow = '-->' }
      $lbl = $c.type; if ($c.label -and $c.label -ne $c.type) { $lbl += " $($c.label)" }
      $o.Add("  $($c.source) $arrow|`"$lbl`"| $($c.target)")
    }
    $o.Add('  classDef inactive stroke-dasharray: 4 4,opacity:0.5'); $o.Add('```')
    $o.Add("Source : ``$($job.file)`` · Contexte : $($job.defaultContext) (par défaut, le contexte réellement lancé reste à confirmer)")
  }
  $o | ForEach-Object { Write-Output $_ }
}
function Write-Component($job, [string]$name) {
  $n = $job.nodes | Where-Object { $_.name -eq $name } | Select-Object -First 1
  if (-not $n) { Write-Output "Composant ``$name`` introuvable. Composants : $((@($job.nodes | ForEach-Object { $_.name })) -join ', ')"; return }
  Write-Output "# $($n.name) ($($n.type))"; Write-Output ''; Write-Output '| Paramètre | Valeur |'; Write-Output '|---|---|'
  foreach ($k in $n.params.Keys) {
    $p = $n.params[$k]
    if ($p.rows.Count -gt 0) { $v = Format-Rows $p.rows } else { $v = Format-Value $p.value (Test-Sensitive $k $p.field $p.value) }
    if ($v -and $v -ne '""' -and $v -ne 'false') { Write-Output "| $k | $(Esc $v) |" }
  }
  if ($n.mapper) {
    foreach ($pair in @(@('in', 'Entrée'), @('var', 'Variables'), @('out', 'Sortie'))) {
      foreach ($t in $n.mapper[$pair[0]]) {
        $extra = @($t.join, $t.lookup, $(if ($t.reject) { 'reject' } else { '' }), $(if ($t.filter) { "filtre : $(Format-Value $t.filter $false)" } else { '' })) | Where-Object { $_ }
        $title = "## $($pair[1]) ``$($t.name)``"; if ($extra) { $title += " — $(Esc ($extra -join ' · '))" }
        Write-Output ''; Write-Output $title; Write-Output ''; Write-Output '| Colonne | Type | Expression |'; Write-Output '|---|---|---|'
        foreach ($e in $t.entries) { $x = Esc (Format-Value $e[1] $false); if (-not $x) { $x = '—' }; Write-Output "| $($e[0]) | $($e[2]) | $x |" }
      }
    }
  }
}
function Get-Items([string]$root) {
  $res = @()
  foreach ($d in $ArtifactDirs) {
    $p = Join-Path $root $d
    if (Test-Path -LiteralPath $p -PathType Container) { $res += @(Get-ChildItem -LiteralPath $p -Recurse -File -Filter '*.item' | Sort-Object FullName) }
  }
  return $res
}
function Get-VersionKey($f) {
  if ($f.Name -match '_(\d+(\.\d+)*)\.item$') { return [version](($matches[1] + '.0.0').Split('.')[0..2] -join '.') }
  return [version]'0.0.0'
}

$target = $opt.target
if ($opt.list) {
  $rootFull = (Resolve-Path -LiteralPath $target).Path
  Write-Output '| Artefact | Version | Dossier |'; Write-Output '|---|---|---|'
  foreach ($f in (Get-Items $target)) {
    $rel = $f.DirectoryName.Substring($rootFull.Length).TrimStart('\', '/')
    if ($f.Name -match '^(.+)_(\d+(\.\d+)*)\.item$') { Write-Output "| $($matches[1]) | $($matches[2]) | $rel |" }
    else { Write-Output "| $($f.BaseName) | ? | $rel |" }
  }
  exit 0
}
if ($opt.job) {
  $pattern = '^' + [regex]::Escape($opt.job) + '_\d+(\.\d+)*\.item$'
  $cands = @(Get-Items $target | Where-Object { $_.Name -match $pattern })
  if ($cands.Count -eq 0) { Write-Output "Job ``$($opt.job)`` introuvable sous $($ArtifactDirs -join ', '). Essayer --list ."; exit 1 }
  $best = $cands | Sort-Object { Get-VersionKey $_ } | Select-Object -Last 1
  $rootFull = (Resolve-Path -LiteralPath $target).Path
  $target = $best.FullName.Substring($rootFull.Length).TrimStart('\', '/')
  if (-not [IO.Path]::IsPathRooted($opt.target) -and $opt.target -ne '.') { $target = Join-Path $opt.target $target }
  if ($cands.Count -gt 1) { Write-Output "> $($cands.Count) versions trouvées, résumé de la plus récente : ``$($best.Name)``"; Write-Output '' }
}
if (-not (Test-Path -LiteralPath $target -PathType Leaf)) { Write-Output 'Indiquer un fichier .item, --job <nom> <dossier> ou --list <dossier>.'; exit 2 }
try { $job = Read-Job $target } catch { Write-Output "XML illisible ($($_.Exception.Message)) : ouvrir le fichier par plages de lignes ciblées."; exit 1 }
if ($opt.component) { Write-Component $job $opt.component } else { Write-Report $job }
exit 0
