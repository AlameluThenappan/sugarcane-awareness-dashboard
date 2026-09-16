-- Same bug as public.summary()'s avgNitrogen (see 20260917090000), same
-- fix: public.yield_page()'s avgN averaged coalesce(tna, 0) over every row,
-- which only guards against actual NULLs. The one row with the literal
-- text 'NaN' in raw.sugarcane_survey.tna isn't NULL, so coalesce() left it
-- untouched, and avg() propagated that NaN to the whole "Avg TNA" KPI on
-- the Yield & Nutrition page.
--
-- Also fixed here: the 'records' array serialized that same row's tna as
-- a bare `NaN` token, which is not valid JSON (Postgres's json type does
-- not validate numeric special values on the way out). That risks
-- breaking JSON.parse() for this RPC's entire response in the browser, not
-- just showing a wrong number — so every place tna is emitted or compared
-- below now goes through safe_tna, which maps NaN/invalid to a plain 0.
create or replace function public.yield_page()
returns json
language sql
stable security definer
set search_path to 'survey', 'raw', 'public'
as $function$
  with base as (
    select
      *,
      case when tna is not null and tna <> 'NaN'::numeric then tna else 0 end as safe_tna
    from survey.v_survey
  ),

  bucketed as (
    select
      survey_id, yield_tonnes_ha,
      case
        when safe_tna < 200 then '0-200'
        when safe_tna < 400 then '200-400'
        when safe_tna < 600 then '400-600'
        else '600+'
      end as bucket
    from base
  ),

  combo as (
    select
      bucket as name,
      count(*)::int as farmers,
      coalesce(round(avg(yield_tonnes_ha) filter (
        where yield_tonnes_ha is not null and yield_tonnes_ha <> 0
      )::numeric, 2), 0) as avg_yield
    from bucketed group by bucket
  )

  select json_build_object(
    'avgYield', (select coalesce(round(avg(yield_tonnes_ha) filter (
        where yield_tonnes_ha is not null and yield_tonnes_ha <> 0
      )::numeric, 2), 0) from base),

    -- avgN: only valid, finite, positive tna readings (same rule as
    -- public.summary()'s avgNitrogen). tna <> 'NaN'::numeric excludes
    -- Postgres numeric NaN, which a plain "> 0" check lets through.
    'avgN', (select coalesce(round(avg(tna) filter (
        where tna is not null and tna <> 'NaN'::numeric and tna > 0
      )::numeric, 2), 0) from base),

    'maxYield', (select coalesce(round(max(yield_tonnes_ha) filter (
        where yield_tonnes_ha is not null and yield_tonnes_ha <> 0
      )::numeric, 2), 0) from base),

    'comboData', coalesce((
      select json_agg(json_build_object(
        'name', name, 'Farmers', farmers, 'AvgYield', avg_yield) order by name)
      from combo), '[]'::json),

    'scatterData', coalesce((
      select json_agg(json_build_object(
        'acres', coalesce(total_acreage, 0),
        'yield', coalesce(yield_tonnes_ha, 0),
        'name',  farmer_name) order by survey_id)
      from base), '[]'::json),

    'records', coalesce((
      select json_agg(json_build_object(
        'surveyId', survey_id,
        'name',     farmer_name,
        'village',  village_name,
        'acres',    coalesce(total_acreage, 0),
        'yield',    coalesce(yield_tonnes_ha, 0),
        'tna',      round(safe_tna::numeric, 2)
      ) order by survey_id)
      from base), '[]'::json)
  );
$function$;
