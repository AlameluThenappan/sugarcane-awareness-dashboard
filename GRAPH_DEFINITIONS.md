# Dashboard Graph Definitions

This catalogue describes every graph-like visualization rendered by the current frontend, including Recharts charts, the Leaflet spatial view, custom progress visuals, and verifier summary visuals. The admin charts use Supabase RPC payloads returned by `frontend/src/app/lib/api.ts`; the verifier visuals use the contracts in `frontend/src/app/lib/verifierTypes.ts`.

## Overview

### Survey Acknowledgement

- **Type**: Custom SVG circular progress ring.
- **Source**: `summary()` fields `acknowledgedCount` and `totalSurveys`.
- **Definition**: `acknowledgedCount / totalSurveys * 100`, rounded to a whole percentage. The ring shows acknowledged surveys against the full survey count; the accompanying text also shows pending acknowledgements.
- **Reading**: A larger filled arc means more surveys have been acknowledged.

### Village Yield Landscape

- **Type**: Horizontal bar chart.
- **Source**: `villages()` payload, sorted by `yield` descending and limited to the top 10 villages.
- **X-axis**: Average yield in tonnes per hectare (`t/ha`).
- **Y-axis**: Village.
- **Reading**: Longer bars indicate higher average village yield.

### Production Overview

- **Type**: Vertical bar chart.
- **Source**: `villages()` payload, sorted by `farmers` descending and limited to the top 8 villages.
- **X-axis**: Village.
- **Y-axis**: Number of farmers.
- **Reading**: Taller bars indicate more surveyed farmers in a village.

### Climate Impact

- **Type**: Donut chart.
- **Source**: `summary()` fields `normalYearPct` and `stressedYearPct`.
- **Segments**: Normal Year and Stressed.
- **Definition**: Percentage share of surveyed years reported as normal versus climate-stressed. The two displayed percentages form the climate split.
- **Interaction**: Hovering a segment moves it outward and fades the other segment.

### Nitrogen Watch

- **Type**: Custom threshold progress bar, not a Recharts graph.
- **Source**: `summary().avgNitrogen`.
- **Definition**: The bar scales average nitrogen against `max(130 * 1.4, average nitrogen * 1.2)`. A marker is placed at the EDF threshold of `130 kg N`.
- **Reading**: Green means the average is at or below the threshold; clay/red means it is above the threshold.

## District Map

### Farmer And Block Coverage Map

- **Type**: Interactive Leaflet map.
- **Source**: `farmer_locations()` for farmer points; the block geometry is generated in the browser from those points.
- **Layers**: CARTO light basemap, one dashed padded bounding polygon per block, and one circle marker per farmer location.
- **Block polygon definition**: For each block, the minimum and maximum latitude/longitude of its farmer points are expanded by `0.02` degrees to create a rectangular visual boundary. This is a coverage envelope, not a surveyed administrative boundary.
- **Point detail**: Farmer name, farmer code, village, block, and yield appear in a popup. Block labels and popups show the block name and farmer count.
- **Interaction**: Pan, zoom, and click farmer or block features to inspect popups.

The adjacent Coverage list aggregates `villages()` by block and reports total acreage per block and the overall acreage total. It is a summary list rather than a plotted graph.

## Yield And Nutrition

### Yield Vs Nitrogen Efficiency Quadrants

- **Type**: Four-cell diagnostic matrix.
- **Source**: `analytics_raw()` rows filtered to rows with positive yield and positive nitrogen, plus `yield_page().avgYield`.
- **Splits**: High yield is `yield >= average yield`; high nitrogen is `n >= 130 kg`.
- **Cells**:
  - Efficient Target: high yield, low nitrogen.
  - Excessive N: high yield, high nitrogen.
  - Under-fertilized: low yield, low nitrogen.
  - Critical Outliers: low yield, high nitrogen.
- **Reading**: Each cell counts farms in that combination. It is a classification summary, not a geometric scatter plot.

### Nitrogen Applied Vs Average Yield

- **Type**: Dual-axis composed chart with bars and a line.
- **Source**: `yield_page()` field `comboData`.
- **X-axis**: Nitrogen application bucket (`name`), based on TNA in kilograms.
- **Left Y-axis / bars**: Number of farmers in the bucket (`Farmers`).
- **Right Y-axis / line**: Average yield for the bucket (`AvgYield`, `t/ha`).
- **Reading**: Compare the number of farms in each nitrogen range with the yield trend across ranges.

### Plot Size Vs Yield

- **Type**: Scatter plot.
- **Source**: `yield_page()` field `scatterData`.
- **X-axis**: Plot size in acres.
- **Y-axis**: Yield in tonnes per hectare.
- **Point identity**: Each point includes farmer name in the tooltip payload.
- **Reading**: The distribution shows whether larger or smaller plots tend to correspond with different yields; it does not claim causation.

## Farmer Details

### Farmers By Village

- **Type**: Horizontal bar chart.
- **Source**: `identity_page().villageData`, labelled `Top 10` by the backend payload.
- **X-axis**: Number of farmers.
- **Y-axis**: Village.
- **Reading**: Longer bars represent greater survey participation by village.

### Age Distribution

- **Type**: Vertical bar chart.
- **Source**: `identity_page().ageData`.
- **X-axis**: Age group.
- **Y-axis**: Farmer count, displayed on a fixed `0-320` domain.
- **Reading**: Taller bars represent more farmers in an age group.

### Education Vs Average Yield

- **Type**: Dual-axis composed chart with bars and a line.
- **Source**: `identity_page().eduData`.
- **X-axis**: Education category.
- **Left Y-axis / bars**: Farmers in the education category (`Farmers`).
- **Right Y-axis / line**: Average yield in tonnes per hectare (`AvgYield`).
- **Reading**: Compare the size of each education group with its associated average yield. Different axes mean bar height and line height should not be compared as the same unit.

## Land Details

### Irrigation Method

- **Type**: Donut chart.
- **Source**: `land_page().yieldIrrData`.
- **Segments**: Irrigation categories in `name`.
- **Value**: Farmer count (`Farmers`).
- **Reading**: Segment size represents the number of farmers using each irrigation method.

### Acreage Vs Yield

- **Type**: Dual-axis composed chart with bars and a line.
- **Source**: `land_page().yieldIrrData`.
- **X-axis**: Irrigation category.
- **Left Y-axis / bars**: Total acreage (`TotalAcres`).
- **Right Y-axis / line**: Average yield (`AvgYield`, `t/ha`).
- **Reading**: Compare land area represented by each irrigation category with its average yield.

### Yield Distribution

- **Type**: Vertical bar chart.
- **Source**: `land_page().yieldDistData`.
- **X-axis**: Yield range/category (`name`).
- **Y-axis**: Farmers in the range (`value`).
- **Reading**: Taller bars indicate more farmers within a yield band.

## Fertilizer Method

### Fertilizer Usage

- **Type**: Vertical bar chart.
- **Source**: `longtail_fertilizer_page().chartData`.
- **X-axis**: Specialty or secondary fertilizer name.
- **Y-axis**: Number of farmers using that input (`value`).
- **Reading**: Taller bars indicate wider farmer adoption. The related KPI identifies the most-used input and the count using any fertilizer.

### Organics Usage

- **Type**: Vertical bar chart.
- **Source**: `longtail_organic_page().chartData`.
- **X-axis**: Organic input name.
- **Y-axis**: Number of farmers using that input (`value`).
- **Reading**: Taller bars indicate wider adoption of the organic input. Volume is shown separately as a KPI, not as the bar height.

The same page also provides searchable tables for application methods, specialty fertilizer quantities, and organic quantities. Those tables are data views, not graphs.

## Climate Details

### Severe Climate Events

- **Type**: Vertical bar chart.
- **Source**: `climate_page().evData`.
- **X-axis**: Severe event category.
- **Y-axis**: Number of reports (`value`), displayed on a fixed `0-600` domain.
- **Reading**: Taller bars indicate more reported occurrences of the event.

### Growth Stage Impacted

- **Type**: Horizontal bar chart.
- **Source**: `climate_page().stData`.
- **X-axis**: Number of reports (`value`), displayed on a fixed `0-40` domain.
- **Y-axis**: Crop growth stage.
- **Reading**: Longer bars indicate that more reports identified that stage as impacted by severe climate events.

## Verifier Dashboard Visuals

### Approval By Block

- **Type**: Stacked proportional progress bars, one row per block.
- **Source**: `verifier_approval_by_block()` returning `block`, `approved`, and `notApproved`.
- **Definition**: Each row totals `approved + notApproved`; the green segment is the approved share and the clay segment is the not-approved share.
- **Ordering**: Rows are sorted by rejection rate descending, where rejection rate is `notApproved / total * 100`.
- **Reading**: The row label shows total records and rejection percentage. A larger clay segment means a higher rejection share.

### Village Coverage

- **Type**: Ranked coverage list, not a plotted chart.
- **Source**: `verifier_village_coverage()` returning village record count and approval rate.
- **Ordering**: Lowest record count first; six villages are shown initially, with an expand control for the full list.
- **Reading**: This highlights under-covered villages while preserving each village's approval rate.

### Upload History

- **Type**: Tabular time series of processing batches, not a plotted chart.
- **Source**: `verifier_upload_batches()`.
- **Fields**: Upload date, filename, row count, approved rows, and not-approved rows. The backend contract also includes new records, updated records, and status.
- **Ordering**: Newest upload first.

## Interaction Conventions

Recharts bars, scatter points, and donut slices support hover feedback. Bar and scatter elements fade their peers and slightly enlarge the hovered element; donut slices move outward. These interactions are transient hover states and do not select or persist a data point. Chart cards include accessible text labels containing their title and subtitle, while table rows and leaderboard entries provide the drill-down path to the full Farmer Profile.
