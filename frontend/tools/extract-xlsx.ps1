param(
  [Parameter(Mandatory = $true)]
  [string]$Path,

  [string]$OutFile = ""
)

Add-Type -AssemblyName System.IO.Compression.FileSystem

function Get-ColumnIndex([string]$cellRef) {
  $letters = ([regex]::Match($cellRef, "^[A-Z]+")).Value
  $index = 0
  foreach ($ch in $letters.ToCharArray()) {
    $index = ($index * 26) + ([int][char]$ch - [int][char]'A' + 1)
  }
  return $index - 1
}

function Get-EntryText($zip, [string]$entryName) {
  $entry = $zip.GetEntry($entryName)
  if ($null -eq $entry) { return $null }
  $reader = New-Object System.IO.StreamReader($entry.Open())
  try {
    return $reader.ReadToEnd()
  } finally {
    $reader.Dispose()
  }
}

function Get-Xml($zip, [string]$entryName) {
  $text = Get-EntryText $zip $entryName
  if ($null -eq $text) { return $null }
  $xml = New-Object System.Xml.XmlDocument
  $xml.PreserveWhitespace = $false
  $xml.LoadXml($text)
  return $xml
}

function Get-CellValue($cell, $sharedStrings) {
  $type = $cell.GetAttribute("t")
  $v = $null
  foreach ($child in $cell.ChildNodes) {
    if ($child.LocalName -eq "v") {
      $v = $child.InnerText
      break
    }
    if ($child.LocalName -eq "is") {
      $texts = @()
      foreach ($node in $child.GetElementsByTagName("t")) {
        $texts += $node.InnerText
      }
      return ($texts -join "")
    }
  }

  if ($null -eq $v) { return $null }

  switch ($type) {
    "s" {
      $idx = 0
      if ([int]::TryParse($v, [ref]$idx) -and $idx -ge 0 -and $idx -lt $sharedStrings.Count) {
        return $sharedStrings[$idx]
      }
      return $v
    }
    "b" { return ($v -eq "1") }
    default {
      $n = 0.0
      if ([double]::TryParse($v, [System.Globalization.NumberStyles]::Any, [System.Globalization.CultureInfo]::InvariantCulture, [ref]$n)) {
        return $n
      }
      return $v
    }
  }
}

$resolved = Resolve-Path -LiteralPath $Path
$zip = [System.IO.Compression.ZipFile]::OpenRead($resolved.Path)
try {
  $sharedStrings = @()
  $sstXml = Get-Xml $zip "xl/sharedStrings.xml"
  if ($null -ne $sstXml) {
    foreach ($si in $sstXml.DocumentElement.ChildNodes) {
      if ($si.LocalName -ne "si") { continue }
      $parts = @()
      foreach ($node in $si.GetElementsByTagName("t")) {
        $parts += $node.InnerText
      }
      $sharedStrings += ($parts -join "")
    }
  }

  $relsXml = Get-Xml $zip "xl/_rels/workbook.xml.rels"
  $relationships = @{}
  foreach ($rel in $relsXml.DocumentElement.ChildNodes) {
    if ($rel.LocalName -eq "Relationship") {
      $relationships[$rel.GetAttribute("Id")] = $rel.GetAttribute("Target")
    }
  }

  $workbookXml = Get-Xml $zip "xl/workbook.xml"
  $sheets = @()
  foreach ($sheet in $workbookXml.GetElementsByTagName("sheet")) {
    $rid = $sheet.GetAttribute("id", "http://schemas.openxmlformats.org/officeDocument/2006/relationships")
    $target = $relationships[$rid]
    if (-not $target.StartsWith("xl/")) {
      $target = "xl/" + $target.TrimStart("/")
    }
    $sheetXml = Get-Xml $zip $target
    $rows = @()
    $maxCol = 0
    foreach ($rowNode in $sheetXml.GetElementsByTagName("row")) {
      $rowValues = @{}
      foreach ($cell in $rowNode.ChildNodes) {
        if ($cell.LocalName -ne "c") { continue }
        $ref = $cell.GetAttribute("r")
        $col = Get-ColumnIndex $ref
        if ($col -gt $maxCol) { $maxCol = $col }
        $rowValues[$col] = Get-CellValue $cell $sharedStrings
      }
      if ($rowValues.Count -eq 0) {
        $rows += ,@()
        continue
      }
      $arr = New-Object object[] ($maxCol + 1)
      foreach ($key in $rowValues.Keys) {
        $arr[[int]$key] = $rowValues[$key]
      }
      $rows += ,$arr
    }

    $headers = if ($rows.Count -gt 0) { $rows[0] } else { @() }
    $dataRows = if ($rows.Count -gt 1) { $rows[1..($rows.Count - 1)] } else { @() }
    $sheets += [pscustomobject]@{
      name = $sheet.GetAttribute("name")
      headers = $headers
      rowCount = $dataRows.Count
      columnCount = $headers.Count
      rows = $dataRows
    }
  }

  $json = ([pscustomobject]@{ path = $resolved.Path; sheets = $sheets } | ConvertTo-Json -Depth 100)
  if ($OutFile) {
    $json | Set-Content -LiteralPath $OutFile -Encoding UTF8
  } else {
    $json
  }
} finally {
  $zip.Dispose()
}
