-- One shared classification source for the Overview quadrant cards and the
-- drill-down overlay. Keep threshold changes here; neither frontend feature
-- assigns a quadrant independently.
create or replace view public.quadrant_classification as
with eligible as (
  select
    s.survey_id,
    rs.farmer_code,
    rs.farmer_name,
    rs.village_name,
    rs.block_name,
    rs.crop_type,
    rs.largest_plot_acres,
    rs.irrigation_type,
    rs.fertilizer_application_method,
    rs.yield_tonnes_ha::numeric as yield_tonnes_ha,
    rs.tna::numeric as nitrogen_kg_ha,
    array_remove(array[
      case when coalesce(rs.farm_yard_manure_kg, 0) > 0 then 'Farm Yard Manure' end,
      case when coalesce(rs.vermicompost_kg, 0) > 0 then 'Vermicompost' end,
      case when coalesce(rs.goat_sheep_manure_kg, 0) > 0 then 'Goat/Sheep Manure' end,
      case when coalesce(rs.poultry_manure_kg, 0) > 0 then 'Poultry Manure' end,
      case when coalesce(rs.press_mud_kg, 0) > 0 then 'Press Mud' end,
      case when coalesce(rs.jeevamrut_kg, 0) > 0 then 'Jeevamrut/GhanaJivamrut' end
    ], null) as organic_inputs
  from raw.sugarcane_survey rs
  join survey.surveys s on s.unique_id = rs.unique_id
  where rs.validation_status = 'Approved'
    and coalesce(rs.yield_tonnes_ha, 0) > 0
    and coalesce(rs.tna, 0) > 0
), thresholds as (
  select round(avg(yield_tonnes_ha), 1) as yield_split, 130::numeric as n_threshold
  from eligible
)
select
  e.*,
  t.yield_split,
  t.n_threshold,
  case
    when e.yield_tonnes_ha >= t.yield_split and e.nitrogen_kg_ha < t.n_threshold then 'eff'
    when e.yield_tonnes_ha >= t.yield_split and e.nitrogen_kg_ha >= t.n_threshold then 'exc'
    when e.yield_tonnes_ha < t.yield_split and e.nitrogen_kg_ha < t.n_threshold then 'und'
    else 'cri'
  end as quadrant_key
from eligible e cross join thresholds t;

create or replace function public.quadrant_overview()
returns json
language sql
stable
security definer
set search_path to 'public', 'survey', 'raw'
as $function$
  with source as (select * from public.quadrant_classification), counts as (
    select quadrant_key, count(*)::integer as farmer_count
    from source
    group by quadrant_key
  )
  select json_build_object(
    'yieldSplit', coalesce((select max(yield_split) from source), 0),
    'nThreshold', coalesce((select max(n_threshold) from source), 130),
    'eligibleFarmers', (select count(*)::integer from source),
    'counts', json_build_object(
      'eff', coalesce((select farmer_count from counts where quadrant_key = 'eff'), 0),
      'exc', coalesce((select farmer_count from counts where quadrant_key = 'exc'), 0),
      'und', coalesce((select farmer_count from counts where quadrant_key = 'und'), 0),
      'cri', coalesce((select farmer_count from counts where quadrant_key = 'cri'), 0)
    )
  );
$function$;

create or replace function public.quadrant_insights(p_quadrant text)
returns json
language sql
stable
security definer
set search_path to 'public', 'survey', 'raw'
as $function$
  with source as (
    select * from public.quadrant_classification where quadrant_key = p_quadrant
  ), modes as (
    select
      (select json_build_object('value', irrigation_type, 'count', count, 'pct', pct)
       from (select irrigation_type, count(*)::integer as count, round(count(*) * 100.0 / nullif((select count(*) from source), 0))::integer as pct from source where irrigation_type is not null group by irrigation_type order by count(*) desc, irrigation_type limit 1) x) as irrigation,
      (select json_build_object('value', fertilizer_application_method, 'count', count, 'pct', pct)
       from (select fertilizer_application_method, count(*)::integer as count, round(count(*) * 100.0 / nullif((select count(*) from source), 0))::integer as pct from source where fertilizer_application_method is not null group by fertilizer_application_method order by count(*) desc, fertilizer_application_method limit 1) x) as method,
      (select json_build_object('value', crop_type, 'count', count, 'pct', pct)
       from (select crop_type, count(*)::integer as count, round(count(*) * 100.0 / nullif((select count(*) from source), 0))::integer as pct from source where crop_type is not null group by crop_type order by count(*) desc, crop_type limit 1) x) as crop_type
  )
  select json_build_object(
    'key', p_quadrant,
    'label', case p_quadrant when 'eff' then 'Efficient Target' when 'exc' then 'Excessive N' when 'und' then 'Under-Fertilized' when 'cri' then 'Critical Outliers' else 'Unknown' end,
    'yieldSplit', coalesce((select max(yield_split) from source), (select max(yield_split) from public.quadrant_classification), 0),
    'nThreshold', coalesce((select max(n_threshold) from source), (select max(n_threshold) from public.quadrant_classification), 130),
    'eligibleFarmers', (select count(*)::integer from public.quadrant_classification),
    'farmerCount', (select count(*)::integer from source),
    'avgYield', coalesce((select round(avg(yield_tonnes_ha), 1) from source), 0),
    'avgNitrogen', coalesce((select round(avg(nitrogen_kg_ha), 1) from source), 0),
    'avgLargestPlotAcres', (select round(avg(largest_plot_acres), 2) from source where largest_plot_acres is not null),
    'organicUsers', (select count(*)::integer from source where cardinality(organic_inputs) > 0),
    'organicPct', coalesce((select round(count(*) filter (where cardinality(organic_inputs) > 0) * 100.0 / nullif(count(*), 0))::integer from source), 0),
    'dominantIrrigation', modes.irrigation,
    'dominantMethod', modes.method,
    'dominantCropType', modes.crop_type,
    'records', coalesce((select json_agg(json_build_object(
      'surveyId', survey_id, 'farmerCode', farmer_code, 'name', farmer_name,
      'village', village_name, 'block', block_name, 'cropType', crop_type,
      'largestPlotAcres', largest_plot_acres, 'yield', yield_tonnes_ha,
      'nitrogen', nitrogen_kg_ha, 'irrigation', irrigation_type,
      'fertilizerMethod', fertilizer_application_method, 'organicInputs', organic_inputs
    ) order by farmer_name, survey_id) from source), '[]'::json)
  )
  from modes;
$function$;

grant execute on function public.quadrant_overview() to authenticated;
grant execute on function public.quadrant_insights(text) to authenticated;
