-- The Overview "Avg Nitrogen" KPI showed 0 kg. Root cause: public.summary()
-- computed avg_nitrogen as avg(tna) with no validity filter (unlike
-- avg_yield, which already filters "is not null and <> 0" in this same
-- function). survey.v_survey.tna is numeric text::numeric cast on
-- raw.sugarcane_survey.tna, and one row (unique_id 202607041312283) has the
-- literal text value 'NaN' there. Postgres `numeric` treats NaN as *larger*
-- than every other value for comparisons (unlike IEEE float), so that row's
-- tna::numeric > 0 evaluated true inside v_survey's CASE and got selected as
-- a "valid" tna of NaN. avg() then propagated that single NaN to the whole
-- aggregate. json_build_object serialized it in a form the frontend's
-- `Number.isFinite` check rejects, so OverviewPage.tsx silently fell back to
-- displaying 0 (see safeAvgNitrogen in OverviewPage.tsx) — the UI wasn't
-- wrong, the number it received was already unusable.
--
-- Verified against the live data before this fix: 699 v_survey rows, 1 with
-- tna = 'NaN', 9 with tna <= 0 (survey.v_survey defaults tna to 0 when
-- neither raw.tna nor an elemental-N/land-area computation is available —
-- not a real zero-usage reading), 689 with a valid positive tna. Total
-- valid tna = 258173.17 kg, average = 374.71 kg.
create or replace function public.summary()
returns json
language sql
stable security definer
set search_path to 'survey', 'raw', 'public'
as $function$
  with base as (
    select * from survey.v_survey
  ),
  agg as (
    select
      count(distinct farmer_id)                                   as total_farmers,
      count(*)                                                    as total_surveys,
      round(coalesce(sum(total_acreage), 0)::numeric, 2)          as total_acres,

      -- _avg(yields): only truthy yields, so > 0 and not null
      coalesce(round(avg(yield_tonnes_ha) filter (
        where yield_tonnes_ha is not null and yield_tonnes_ha <> 0
      )::numeric, 2), 0)                                          as avg_yield,

      -- avg nitrogen: only valid, finite, positive tna readings. tna <>
      -- 'NaN'::numeric excludes Postgres numeric NaN, which otherwise
      -- passes a plain "> 0" check and poisons avg() for every row.
      coalesce(round(avg(tna) filter (
        where tna is not null and tna <> 'NaN'::numeric and tna > 0
      )::numeric, 2), 0)                                          as avg_nitrogen,

      count(*) filter (where coalesce(crop_type, '') = 'Plant Crop') as plant_crop,
      count(*) filter (where coalesce(crop_type, '') = 'Ratoon')     as ratoon,

      count(*) filter (where survey.is_yes(normal_year_flag))     as normal_year,
      count(*) filter (where normal_year_flag is not null)        as climate_total,

      count(distinct block_name)   filter (where block_name is not null)   as block_count,
      count(distinct village_name) filter (where village_name is not null) as village_count
    from base
  ),
  calc as (
    select
      *,
      -- `crop_total = plant_crop + ratoon or 1` — Python's `or` returns 1
      -- only when the sum is 0, never for other values
      nullif(plant_crop + ratoon, 0)  as crop_total_or_null,
      nullif(climate_total, 0)        as climate_total_or_null
    from agg
  )
  select json_build_object(
    'totalFarmers',  total_farmers,
    'totalSurveys',  total_surveys,
    'totalAcres',    total_acres,
    'avgYield',      avg_yield,
    'avgNitrogen',   avg_nitrogen,
    'plantCropPct',  round(plant_crop::numeric  / coalesce(crop_total_or_null, 1) * 100),
    'ratoonPct',     round(ratoon::numeric      / coalesce(crop_total_or_null, 1) * 100),
    'blockCount',    block_count,
    'villageCount',  village_count,
    'acknowledgedCount',            0,
    'pendingAcknowledgementCount',  total_surveys,
    'normalYearPct', round(normal_year::numeric / coalesce(climate_total_or_null, 1) * 100),
    'stressedYearPct',
        round(100 - (normal_year::numeric / coalesce(climate_total_or_null, 1) * 100))
  )
  from calc;
$function$;
