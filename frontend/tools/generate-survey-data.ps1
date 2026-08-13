param(
  [string]$WorkbookPath = "C:\Users\shrut\Downloads\EDF_SUGARCANE_APPROVED_SURVEY.xlsx",
  [string]$OutFile = "src\app\data\surveyData.ts"
)

$ErrorActionPreference = "Stop"

function Normalize-Key($value) {
  if ($null -eq $value) { return "" }
  return (($value.ToString().Trim() -replace "\s+", " ").ToLowerInvariant())
}

function To-Number($value) {
  if ($null -eq $value -or $value -eq "") { return 0.0 }
  $n = 0.0
  if ([double]::TryParse($value.ToString(), [System.Globalization.NumberStyles]::Any, [System.Globalization.CultureInfo]::InvariantCulture, [ref]$n)) {
    return $n
  }
  return 0.0
}

function Round-To($value, [int]$digits = 1) {
  return [Math]::Round([double]$value, $digits)
}

$villageMap = @{
  "appakudal" = "Appakudal"
  "chennimalai goundan pudhur" = "Chennimalai Goundan Pudur"
  "kallangattu pudhur" = "Kallangattu Pudur"
  "kandhampalayam" = "Kandhampalayam"
  "kanthampalayam" = "Kandhampalayam"
  "kanjikovil" = "Kanjikovil"
  "kanjokovil" = "Kanjikovil"
  "keelvani" = "Keelvani"
  "koil palayam" = "Koilpalayam"
  "koilpalayam" = "Koilpalayam"
  "kolipalayam" = "Kolipalayam"
  "koothampoondi" = "Koothampoondi"
  "moongilpatti" = "Moongilpatti"
  "mullampatti" = "Mullampatti"
  "nalligoundan pudhur" = "Nalligoundan Pudur"
  "nallampatti" = "Nallampatti"
  "nichampalayam" = "Nichampalayam"
  "olapalayam" = "Olapalayam"
  "olappalayam" = "Olapalayam"
  "oricheri" = "Oricheri"
  "pallapalayam" = "Pallapalayam"
  "periaveerasangi" = "Periaveerasangi"
  "periyavilamalai" = "Periyavilamalai"
  "petham palayam" = "Pethampalayam"
  "pethampalayam" = "Pethampalayam"
  "pethampalyam" = "Pethampalayam"
  "prakash nagar" = "Prakash Nagar"
  "punnam" = "Punnam"
  "singanallur" = "Singanallur"
  "unja palayam" = "Unja Palayam"
  "vembathi" = "Vembathy"
  "vembathy" = "Vembathy"
}

$villagePosition = @{
  "Pallapalayam" = @{ block = "Sakthinagar"; x = 38; y = 26 }
  "Appakudal" = @{ block = "Sakthinagar"; x = 28; y = 36 }
  "Pethampalayam" = @{ block = "Sakthinagar"; x = 46; y = 18 }
  "Vembathy" = @{ block = "Sakthinagar"; x = 22; y = 22 }
  "Keelvani" = @{ block = "Sakthinagar"; x = 34; y = 14 }
  "Koothampoondi" = @{ block = "Sakthinagar"; x = 48; y = 32 }
  "Punnam" = @{ block = "Sakthinagar"; x = 18; y = 40 }
  "Kanjikovil" = @{ block = "Kanjikovil"; x = 42; y = 74 }
  "Oricheri" = @{ block = "Kanjikovil"; x = 32; y = 80 }
  "Nallampatti" = @{ block = "Kanjikovil"; x = 52; y = 68 }
  "Moongilpatti" = @{ block = "Kanjikovil"; x = 26; y = 70 }
  "Mullampatti" = @{ block = "Kanjikovil"; x = 38; y = 62 }
  "Chennimalai Goundan Pudur" = @{ block = "Vellalapalayam"; x = 12; y = 52 }
  "Singanallur" = @{ block = "Vellalapalayam"; x = 18; y = 60 }
  "Periyavilamalai" = @{ block = "Vellalapalayam"; x = 7; y = 44 }
  "Koilpalayam" = @{ block = "Vellalapalayam"; x = 20; y = 48 }
  "Nalligoundan Pudur" = @{ block = "Vellalapalayam"; x = 7; y = 64 }
  "Nichampalayam" = @{ block = "Vellalapalayam"; x = 14; y = 70 }
  "Kallangattu Pudur" = @{ block = "Erode"; x = 60; y = 46 }
  "Prakash Nagar" = @{ block = "Erode"; x = 66; y = 37 }
  "Kolipalayam" = @{ block = "Erode"; x = 55; y = 54 }
  "Olapalayam" = @{ block = "Erode"; x = 72; y = 55 }
  "Unja Palayam" = @{ block = "Erode"; x = 52; y = 62 }
  "Kandhampalayam" = @{ block = "Erode"; x = 74; y = 44 }
  "Periaveerasangi" = @{ block = "Erode"; x = 79; y = 36 }
}

$blockMap = @{
  "kanchikovil" = "Kanjikovil"
  "kanjikovil" = "Kanjikovil"
  "kanjokovil" = "Kanjikovil"
  "sakthi nagar" = "Sakthinagar"
  "sakthinagar" = "Sakthinagar"
  "vellalapalayam" = "Vellalapalayam"
  "erode" = "Erode"
}

function Canonical-Village($value) {
  $key = Normalize-Key $value
  if ($villageMap.ContainsKey($key)) { return $villageMap[$key] }
  return $value.ToString().Trim()
}

function Canonical-Block($value, $canonicalVillage) {
  if ($villagePosition.ContainsKey($canonicalVillage)) {
    return $villagePosition[$canonicalVillage].block
  }
  $key = Normalize-Key $value
  if ($blockMap.ContainsKey($key)) { return $blockMap[$key] }
  return $value.ToString().Trim()
}

function Get-Column($headers, [string]$name) {
  $idx = [array]::IndexOf($headers, $name)
  if ($idx -lt 0) { throw "Missing workbook column: $name" }
  return $idx
}

function Get-OptionalColumn($headers, [string]$name) {
  return [array]::IndexOf($headers, $name)
}

function Cell($row, [int]$idx) {
  if ($idx -lt 0 -or $idx -ge $row.Count) { return $null }
  return $row[$idx]
}

function Text-Cell($row, [int]$idx) {
  $value = Cell $row $idx
  if ($null -eq $value) { return "" }
  return $value.ToString().Trim()
}

function Bool-Flag($row, [int]$idx) {
  $value = Normalize-Key (Cell $row $idx)
  return ($value -eq "1" -or $value -eq "true" -or $value -eq "yes" -or $value -eq "selected")
}

function Sum-Prop($items, [string]$prop) {
  $sum = 0.0
  foreach ($item in $items) {
    if ($item -is [System.Collections.IDictionary]) {
      $sum += [double]$item[$prop]
    } else {
      $sum += [double]$item.$prop
    }
  }
  return $sum
}

function Avg-Prop($items, [string]$prop) {
  $vals = @($items | ForEach-Object {
    if ($_ -is [System.Collections.IDictionary]) {
      [double]$_[$prop]
    } else {
      [double]$_.$prop
    }
  } | Where-Object { $_ -gt 0 })
  if ($vals.Count -eq 0) { return 0.0 }
  return ($vals | Measure-Object -Average).Average
}

function Percent($num, $den) {
  if ($den -eq 0) { return 0 }
  return [int][Math]::Round(($num / $den) * 100)
}

$workbook = powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "extract-xlsx.ps1") -Path $WorkbookPath | ConvertFrom-Json
$sheet = $workbook.sheets[0]
$headers = $sheet.headers

$idx = @{
  uniqueID = Get-Column $headers "uniqueID"
  farmerCode = Get-Column $headers "Farmer Code"
  farmerName = Get-Column $headers "Name of the Farmer"
  village = Get-Column $headers "Name of the Village"
  block = Get-Column $headers "Block name"
  district = Get-Column $headers "District name"
  state = Get-Column $headers "State"
  age = Get-Column $headers "Age"
  education = Get-Column $headers "Education"
  year = Get-Column $headers "Select Year"
  crop = Get-Column $headers "Crop"
  cropType = Get-Column $headers "Select Crop Type"
  ratoonType = Get-Column $headers "Select Ratoon Type"
  nextRatoon = Get-Column $headers "Do you wish to go for next Ratoon for this crop?"
  acres = Get-Column $headers 'What is the total acreage of the farmer under ${Crop} for the Year ${Year} in Acres?'
  largestPlotAcres = Get-Column $headers 'What is the size of the largest plot of the ${Crop} Crop for the Year ${Year} in Acres?'
  landHa = Get-Column $headers "LandArea_hectare"
  irrigation = Get-Column $headers 'What is the type of irrigation in your largest plot of ${Crop} Crop for the Year ${Year} in Acres?'
  fertMethod = Get-Column $headers 'What is the type of fertilizer application method in your largest plot of ${Crop} Crop for the Year ${Year} in Acres?'
  yieldTonnes = Get-Column $headers 'What is the Yield from the largest plot for ${Crop} Crop in Tonnes for the Year ${Year}.'
  yieldHa = Get-Column $headers "Yield_Tonnes_ha"
  tna = Get-Column $headers "tna"
}

$eventColumns = @(
  @{ label = "Erratic Rainfall"; idx = Get-Column $headers 'Which severe climatic events your ${Crop} faced during ${Year}?/Erratic_rainfall' }
  @{ label = "Cyclone"; idx = Get-Column $headers 'Which severe climatic events your ${Crop} faced during ${Year}?/Cyclone' }
  @{ label = "Drought"; idx = Get-Column $headers 'Which severe climatic events your ${Crop} faced during ${Year}?/Drought' }
  @{ label = "Flood"; idx = Get-Column $headers 'Which severe climatic events your ${Crop} faced during ${Year}?/Flood' }
  @{ label = "None"; idx = Get-Column $headers 'Which severe climatic events your ${Crop} faced during ${Year}?/None' }
)

$stageColumns = @(
  @{ label = "Sprouting"; idx = Get-Column $headers 'During which stages these severe climatic events impacted your ${Crop} crop in ${Year}?/sprouting' }
  @{ label = "Tillering"; idx = Get-Column $headers 'During which stages these severe climatic events impacted your ${Crop} crop in ${Year}?/tillering' }
  @{ label = "Grand Growth"; idx = Get-Column $headers 'During which stages these severe climatic events impacted your ${Crop} crop in ${Year}?/grand_growth' }
  @{ label = "Maturity"; idx = Get-Column $headers 'During which stages these severe climatic events impacted your ${Crop} crop in ${Year}?/maturity' }
)

$fertilizers = @(
  @{ name = "Urea"; idx = Get-Column $headers 'Total Urea used in the largest plot of ${Crop} Crop (in Kgs.)'; n = 0.46; p = 0; k = 0 }
  @{ name = "DAP"; idx = Get-Column $headers 'Total DAP used in the largest plot of ${Crop} Crop (in Kgs.)'; n = 0.18; p = 0.46; k = 0 }
  @{ name = "SSP"; idx = Get-Column $headers 'Total SSP used in the largest plot of ${Crop} Crop (in Kgs.)'; n = 0; p = 0.16; k = 0 }
  @{ name = "MOP"; idx = Get-Column $headers 'Total MOP used in the largest plot of ${Crop} Crop (in Kgs.)'; n = 0; p = 0; k = 0.60 }
  @{ name = "NPK 10-26-26"; idx = Get-Column $headers 'Total NPK 10-26-26 used in the largest plot of ${Crop} Crop (in Kgs.)'; n = 0.10; p = 0.26; k = 0.26 }
  @{ name = "NPK 12-32-16"; idx = Get-Column $headers 'Total NPK 12-32-16 used in the largest plot of ${Crop} Crop (in Kgs.)'; n = 0.12; p = 0.32; k = 0.16 }
  @{ name = "NPS 20-20-0-13"; idx = Get-Column $headers 'Total NPS 20-20-0-13 used in the largest plot of ${Crop} Crop (in Kgs.)'; n = 0.20; p = 0.20; k = 0 }
  @{ name = "Am. Sulphate"; idx = Get-Column $headers 'Total Ammonium Sulphate used in the largest plot of ${Crop} Crop (in Kgs.)'; n = 0.21; p = 0; k = 0 }
  @{ name = "Am. Chloride"; idx = Get-Column $headers 'Total Ammonium Chloride used in the largest plot of ${Crop} Crop (in Kgs.)'; n = 0.25; p = 0; k = 0 }
  @{ name = "NPK 17-17-17"; idx = Get-Column $headers 'Total NPK 17-17-17 used in the largest plot of ${Crop} Crop (in Kgs.)'; n = 0.17; p = 0.17; k = 0.17 }
  @{ name = "NPKS 16-20-0-13"; idx = Get-Column $headers 'Total NPKS-16-20-0-13 used in the largest plot of ${Crop} Crop (in Kgs.)'; n = 0.16; p = 0.20; k = 0 }
  @{ name = "NPK 16-16-16"; idx = Get-Column $headers 'Total NPK-16-16-16 used in the largest plot of ${Crop} Crop (in Kgs.)'; n = 0.16; p = 0.16; k = 0.16 }
  @{ name = "NPK 12-61-0"; idx = Get-Column $headers 'Total NPK-12-61-0 used in the largest plot of ${Crop} Crop (in Kgs.)'; n = 0.12; p = 0.61; k = 0 }
  @{ name = "NPKS 15-15-15-09"; idx = Get-Column $headers 'Total NPKS-15-15-15-09 used in the largest plot of ${Crop} Crop (in Kgs.)'; n = 0.15; p = 0.15; k = 0.15 }
  @{ name = "NPK 19-19-19"; idx = Get-Column $headers 'Total NPK-19-19-19 used in the largest plot of ${Crop} Crop (in Kgs.)'; n = 0.19; p = 0.19; k = 0.19 }
  @{ name = "Mono 11-52-0"; idx = Get-Column $headers 'Total Mono_11_52_0 used in the largest plot of ${Crop} Crop (in Kgs.)'; n = 0.11; p = 0.52; k = 0 }
  @{ name = "CAN"; idx = Get-Column $headers 'Total Calcium_ammonium_nitrate used in the largest plot of ${Crop} Crop (in Kgs.)'; n = 0.26; p = 0; k = 0 }
)

$organics = @(
  @{ name = "Farm Yard Manure"; idx = Get-Column $headers 'Total Farm Yard Manure used in the largest plot of ${Crop} Crop (in Kgs.)' }
  @{ name = "Vermicompost"; idx = Get-Column $headers 'Total Vermicompost used in the largest plot of ${Crop} Crop (in Kgs.)' }
  @{ name = "Goat/Sheep Manure"; idx = Get-Column $headers 'Total Goat/Sheep Manure used in the largest plot of ${Crop} Crop (in Kgs.)' }
  @{ name = "Poultry Manure"; idx = Get-Column $headers 'Total Poultry Manure used in the largest plot of ${Crop} Crop (in Kgs.)' }
  @{ name = "Press Mud"; idx = Get-Column $headers 'Total Press Mud used in the largest plot of ${Crop} Crop (in Kgs.)' }
  @{ name = "Jeevamrut/GhanaJivamrut"; idx = Get-Column $headers 'Total Jeevamrut/GhanaJivamrut used in the largest plot of ${Crop} Crop (in Kgs.)' }
)

$surveyRows = @()
$rowNum = 1
foreach ($raw in $sheet.rows) {
  $row = $raw.value
  $originalVillage = Text-Cell $row $idx.village
  if (-not $originalVillage) { continue }
  $village = Canonical-Village $originalVillage
  $block = Canonical-Block (Text-Cell $row $idx.block) $village
  $landHa = To-Number (Cell $row $idx.landHa)
  $nFromFertilizer = 0.0
  $pFromFertilizer = 0.0
  $kFromFertilizer = 0.0
  foreach ($fert in $fertilizers) {
    $kg = To-Number (Cell $row $fert.idx)
    $nFromFertilizer += $kg * $fert.n
    $pFromFertilizer += $kg * $fert.p
    $kFromFertilizer += $kg * $fert.k
  }
  $nPerHa = To-Number (Cell $row $idx.tna)
  if ($nPerHa -eq 0 -and $landHa -gt 0) { $nPerHa = $nFromFertilizer / $landHa }
  $pPerHa = if ($landHa -gt 0) { $pFromFertilizer / $landHa } else { 0 }
  $kPerHa = if ($landHa -gt 0) { $kFromFertilizer / $landHa } else { 0 }

  $events = @()
  foreach ($event in $eventColumns) {
    if (Bool-Flag $row $event.idx) { $events += $event.label }
  }
  if ($events.Count -eq 0) { $events = @("None") }

  $stages = @()
  foreach ($stage in $stageColumns) {
    if (Bool-Flag $row $stage.idx) { $stages += $stage.label }
  }

  $fymKg = To-Number (Cell $row $organics[0].idx)
  $id = Text-Cell $row $idx.farmerCode
  if (-not $id) { $id = Text-Cell $row $idx.uniqueID }
  if (-not $id) { $id = "ROW$rowNum" }

  $surveyRows += [pscustomobject][ordered]@{
    id = $id
    uniqueID = Text-Cell $row $idx.uniqueID
    name = Text-Cell $row $idx.farmerName
    village = $village
    originalVillage = $originalVillage
    block = $block
    originalBlock = Text-Cell $row $idx.block
    district = Text-Cell $row $idx.district
    state = Text-Cell $row $idx.state
    age = Text-Cell $row $idx.age
    edu = Text-Cell $row $idx.education
    year = Text-Cell $row $idx.year
    crop = Text-Cell $row $idx.cropType
    cropName = Text-Cell $row $idx.crop
    ratoonType = Text-Cell $row $idx.ratoonType
    nextRatoon = Text-Cell $row $idx.nextRatoon
    acres = Round-To (To-Number (Cell $row $idx.acres)) 2
    largestPlotAcres = Round-To (To-Number (Cell $row $idx.largestPlotAcres)) 2
    landAreaHa = Round-To $landHa 3
    yield = Round-To (To-Number (Cell $row $idx.yieldHa)) 2
    yieldTonnes = Round-To (To-Number (Cell $row $idx.yieldTonnes)) 2
    irrigation = Text-Cell $row $idx.irrigation
    fertilizerMethod = Text-Cell $row $idx.fertMethod
    n = Round-To $nPerHa 1
    p = Round-To $pPerHa 1
    k = Round-To $kPerHa 1
    fym = if ($fymKg -gt 0) { "Yes" } else { "No" }
    event = ($events -join ", ")
    stages = ($stages -join ", "); raw = $row
  }
  $rowNum += 1
}

$totalFarmers = $surveyRows.Count
$totalAcres = Round-To (Sum-Prop $surveyRows "acres") 1
$avgYield = Round-To (Avg-Prop $surveyRows "yield") 1
$avgNitrogen = Round-To (Avg-Prop $surveyRows "n") 1
$plantCount = @($surveyRows | Where-Object { $_.crop -match "Plant" }).Count
$ratoonCount = @($surveyRows | Where-Object { $_.crop -match "Ratoon" }).Count
$organicUserCount = @($surveyRows | Where-Object { $_.fym -eq "Yes" -or ($_.p -gt 0 -or $_.k -gt 0) }).Count

$villageData = @()
foreach ($group in ($surveyRows | Group-Object village | Sort-Object Count -Descending)) {
  $items = @($group.Group)
  $plant = @($items | Where-Object { $_.crop -match "Plant" }).Count
  $ratoon = @($items | Where-Object { $_.crop -match "Ratoon" }).Count
  $avgN = Round-To (Avg-Prop $items "n") 1
  $avgP = Round-To (Avg-Prop $items "p") 1
  $avgK = Round-To (Avg-Prop $items "k") 1
  $organicUsers = @($items | Where-Object { $_.fym -eq "Yes" }).Count
  $dominantCrop = if ($plant -ge $ratoon) { "Plant Crop" } else { "Ratoon" }
  $villageData += [pscustomobject][ordered]@{
    village = $group.Name
    block = Canonical-Block $items[0].originalBlock $group.Name
    farmers = $items.Count
    acres = Round-To (Sum-Prop $items "acres") 1
    yield = Round-To (Avg-Prop $items "yield") 1
    plantCrop = $plant
    ratoon = $ratoon
    n = $avgN
    p = $avgP
    k = $avgK
    organicUsers = $organicUsers
    cropType = $dominantCrop
  }
}

$mapLocations = @()
$mapId = 1
foreach ($village in $villageData) {
  $pos = if ($villagePosition.ContainsKey($village.village)) { $villagePosition[$village.village] } else { @{ x = 50; y = 50; block = $village.block } }
  $concentration = if ($village.farmers -ge 50) { "high" } elseif ($village.farmers -ge 25) { "medium" } else { "low" }
  $mapLocations += [pscustomobject][ordered]@{
    id = $mapId
    name = $village.village
    block = $pos.block
    x = $pos.x
    y = $pos.y
    farmers = $village.farmers
    acres = $village.acres
    yield = $village.yield
    cropType = $village.cropType
    concentration = $concentration
  }
  $mapId += 1
}

$yieldByVillage = @()
foreach ($village in ($villageData | Sort-Object farmers -Descending | Select-Object -First 10)) {
  $items = @($surveyRows | Where-Object { $_.village -eq $village.village })
  $plantYield = Round-To (Avg-Prop (@($items | Where-Object { $_.crop -match "Plant" })) "yield") 1
  $ratoonYield = Round-To (Avg-Prop (@($items | Where-Object { $_.crop -match "Ratoon" })) "yield") 1
  $yieldByVillage += [pscustomobject][ordered]@{
    village = if ($village.village.Length -gt 10) { $village.village.Substring(0, 10) } else { $village.village }
    "Plant Crop" = $plantYield
    "Ratoon" = $ratoonYield
  }
}

$ageData = @()
foreach ($group in ($surveyRows | Where-Object { $_.age } | Group-Object age | Sort-Object Count -Descending)) {
  $label = ($group.Name -replace "_years", " years" -replace "_", " ")
  $ageData += [pscustomobject][ordered]@{ group = $label; count = $group.Count }
}

$educationData = @()
foreach ($group in ($surveyRows | Where-Object { $_.edu } | Group-Object edu | Sort-Object Count -Descending)) {
  $educationData += [pscustomobject][ordered]@{ level = $group.Name; count = $group.Count }
}

$climateEventData = @()
foreach ($event in $eventColumns) {
  $count = @($sheet.rows | Where-Object { Bool-Flag $_.value $event.idx }).Count
  $climateEventData += [pscustomobject][ordered]@{ name = $event.label; value = $count; pct = Percent $count $totalFarmers }
}

$growthStageData = @()
foreach ($stage in $stageColumns) {
  $count = @($sheet.rows | Where-Object { Bool-Flag $_.value $stage.idx }).Count
  $growthStageData += [pscustomobject][ordered]@{ stage = $stage.label; affected = $count }
}

$irrigationData = @()
foreach ($group in ($surveyRows | Where-Object { $_.irrigation } | Group-Object irrigation | Sort-Object Count -Descending)) {
  $irrigationData += [pscustomobject][ordered]@{ name = $group.Name; value = $group.Count }
}

$fertilizerData = @()
foreach ($fert in $fertilizers) {
  $kg = 0.0
  foreach ($raw in $sheet.rows) { $kg += To-Number (Cell $raw.value $fert.idx) }
  if ($kg -le 0) { continue }
  $fertilizerData += [pscustomobject][ordered]@{
    name = $fert.name
    n = Round-To ($kg * $fert.n) 1
    p = Round-To ($kg * $fert.p) 1
    k = Round-To ($kg * $fert.k) 1
    bags = Round-To $kg 1
  }
}

$organicData = @()
foreach ($organic in $organics) {
  $users = 0
  foreach ($raw in $sheet.rows) {
    if ((To-Number (Cell $raw.value $organic.idx)) -gt 0) { $users += 1 }
  }
  $organicData += [pscustomobject][ordered]@{ name = $organic.name; value = $users; pct = Percent $users $totalFarmers }
}

$years = @($surveyRows | ForEach-Object { $_.year } | Where-Object { $_ } | Sort-Object -Unique)
$blocks = @("Sakthinagar", "Kanjikovil", "Vellalapalayam", "Erode") | Where-Object {
  $b = $_
  @($villageData | Where-Object { $_.block -eq $b }).Count -gt 0
}
$villages = @($villageData | Sort-Object village | ForEach-Object { $_.village })

$aboveOptimal = @($surveyRows | Where-Object { $_.n -gt 150 }).Count
$balancedNpk = @($surveyRows | Where-Object { $_.n -gt 0 -and $_.p -gt 0 -and $_.k -gt 0 -and $_.n -le 150 -and $_.p -ge 30 -and $_.k -ge 30 }).Count
$pDeficiency = @($surveyRows | Where-Object { $_.p -gt 0 -and $_.p -lt 30 }).Count
$kWithin = @($surveyRows | Where-Object { $_.k -ge 40 -and $_.k -le 100 }).Count
$highNBlocks = @($villageData | Group-Object block | Where-Object { (Avg-Prop $_.Group "n") -gt 150 }).Count

$topYieldVillage = $villageData | Sort-Object yield -Descending | Select-Object -First 1
$lowYieldVillage = $villageData | Where-Object { $_.yield -gt 0 } | Sort-Object yield | Select-Object -First 1
$topClimate = $climateEventData | Where-Object { $_.name -ne "None" } | Sort-Object value -Descending | Select-Object -First 1
$topOrganic = $organicData | Sort-Object value -Descending | Select-Object -First 1
$topFertilizer = $fertilizerData | Sort-Object bags -Descending | Select-Object -First 1
$topAge = $ageData | Sort-Object count -Descending | Select-Object -First 1
$topBlock = $villageData | Group-Object block | ForEach-Object {
  [pscustomobject]@{ block = $_.Name; farmers = (Sum-Prop $_.Group "farmers"); villages = $_.Count }
} | Sort-Object farmers -Descending | Select-Object -First 1
$topEducation = $educationData | Select-Object -First 1

$dashboardTotals = [ordered]@{
  totalFarmers = $totalFarmers
  totalAcres = $totalAcres
  avgYield = $avgYield
  avgNitrogen = $avgNitrogen
  plantCropPct = Percent $plantCount $totalFarmers
  ratoonPct = Percent $ratoonCount $totalFarmers
  blockCount = $blocks.Count
  villageCount = $villages.Count
  organicUserPct = Percent $topOrganic.value $totalFarmers
  aboveOptimalNPct = Percent $aboveOptimal $totalFarmers
  balancedNpkPct = Percent $balancedNpk $totalFarmers
  pDeficiencyPct = Percent $pDeficiency $totalFarmers
  kWithinPct = Percent $kWithin $totalFarmers
  highNBlocks = $highNBlocks
  state = ($surveyRows | Select-Object -First 1).state
  district = ($surveyRows | Select-Object -First 1).district
  yearLabel = if ($years.Count -eq 1) { $years[0] } else { ($years -join ", ") }
  topYieldVillage = $topYieldVillage.village
  topYieldValue = $topYieldVillage.yield
  lowYieldVillage = $lowYieldVillage.village
  lowYieldValue = $lowYieldVillage.yield
  topClimateEvent = $topClimate.name
  topClimatePct = $topClimate.pct
  topOrganicInput = $topOrganic.name
  topOrganicPct = $topOrganic.pct
  topFertilizer = $topFertilizer.name
  topFertilizerKg = $topFertilizer.bags
  topAgeGroup = $topAge.group
  topAgeCount = $topAge.count
  topBlock = $topBlock.block
  topBlockFarmers = [int]$topBlock.farmers
  topBlockVillages = $topBlock.villages
  topEducation = $topEducation.level
  topEducationPct = Percent $topEducation.count $totalFarmers
}

$data = [ordered]@{
  SURVEY_META = $dashboardTotals
  YEARS = $years
  BLOCKS = $blocks
  VILLAGES = $villages
  villageData = $villageData
  ageData = $ageData
  educationData = $educationData
  climateEventData = $climateEventData
  growthStageData = $growthStageData
  irrigationData = $irrigationData
  yieldByVillage = $yieldByVillage
  fertilizerData = $fertilizerData
  organicData = $organicData
  surveyRows = $surveyRows
  mapLocations = $mapLocations
  headers = $headers
}

$json = $data | ConvertTo-Json -Depth 100
$content = @"
// Generated from EDF_SUGARCANE_APPROVED_SURVEY.xlsx by tools/generate-survey-data.ps1.
// Row-level farmer names and survey values are sourced from the approved workbook.

export type SurveyRow = {
  id: string;
  uniqueID: string;
  name: string;
  village: string;
  originalVillage: string;
  block: string;
  originalBlock: string;
  district: string;
  state: string;
  age: string;
  edu: string;
  year: string;
  crop: string;
  cropName: string;
  ratoonType: string;
  nextRatoon: string;
  acres: number;
  largestPlotAcres: number;
  landAreaHa: number;
  yield: number;
  yieldTonnes: number;
  irrigation: string;
  fertilizerMethod: string;
  n: number;
  p: number;
  k: number;
  fym: "Yes" | "No";
  event: string;
  stages: string; raw: any[];
};

const data = $json as const;

export const SURVEY_META = data.SURVEY_META;
export const YEARS = data.YEARS;
export const BLOCKS = data.BLOCKS;
export const VILLAGES = data.VILLAGES;
export const villageData = data.villageData;
export const ageData = data.ageData;
export const educationData = data.educationData;
export const climateEventData = data.climateEventData;
export const growthStageData = data.growthStageData;
export const irrigationData = data.irrigationData;
export const yieldByVillage = data.yieldByVillage;
export const fertilizerData = data.fertilizerData;
export const organicData = data.organicData;
export const surveyRows = data.surveyRows as readonly SurveyRow[];
export const mapLocations = data.mapLocations;
export const HEADERS = data.headers as string[];
"@

$dir = Split-Path -Parent $OutFile
if ($dir -and -not (Test-Path -LiteralPath $dir)) {
  New-Item -ItemType Directory -Path $dir | Out-Null
}
$content | Set-Content -LiteralPath $OutFile -Encoding UTF8

Write-Host "Generated $OutFile from $($sheet.rowCount) workbook rows."
Write-Host "Farmers: $totalFarmers; villages: $($villages.Count); blocks: $($blocks.Count); acres: $totalAcres; avg yield: $avgYield; avg N: $avgNitrogen"
