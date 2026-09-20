create or replace function public.process_raw_to_survey()
returns integer
language plpgsql
security definer
set search_path = 'survey', 'raw', 'public'
as $function$
declare
  v_processed_count integer;
begin
  -- Create a temporary table to hold the pending rows to process
  create temp table tmp_pending on commit drop as
  select rs.*
  from raw.sugarcane_survey rs
  where rs.validation_status = 'Approved'
    and rs.unique_id is not null
    and not exists (
      select 1 from survey.surveys s where s.unique_id = rs.unique_id
    );

  select count(*) into v_processed_count from tmp_pending;

  if v_processed_count = 0 then
    return 0;
  end if;

  -- 1. Insert new farmers (skip if farmer_code is null or already exists)
  insert into survey.farmers
    (farmer_code, farmer_name, age, education, mobile_number, village_name, block_name, district_name, state)
  select distinct on (farmer_code)
    farmer_code, 
    coalesce(farmer_name, 'Unknown'), 
    coalesce(age, 'Unknown'), 
    coalesce(education, 'Unknown'), 
    coalesce(mobile_number, 'Unknown'), 
    coalesce(village_name, 'Unknown'), 
    coalesce(block_name, 'Unknown'), 
    coalesce(district_name, 'Unknown'), 
    coalesce(state, 'Unknown')
  from tmp_pending
  where farmer_code is not null
  on conflict (farmer_code) do nothing;

  -- 2. Insert new users (enumerators)
  insert into survey.users (employee_name, designation, organization_name, role)
  select distinct on (replace(trim(employee_name), '_', ' '))
    replace(trim(employee_name), '_', ' '), 
    coalesce(enumerator_designation, 'Unknown'), 
    coalesce(organization_name, 'Unknown'), 
    'ENUMERATOR'
  from tmp_pending
  where employee_name is not null
  on conflict (employee_name) do nothing;

  -- 3. Insert surveys
  insert into survey.surveys
    (unique_id, farmer_id, user_id, collection_date, survey_year, crop, consent_response, source)
  select 
    p.unique_id,
    f.farmer_id,
    u.user_id,
    p.collection_date,
    p.survey_year,
    p.crop,
    p.consent_response,
    p.source
  from tmp_pending p
  left join survey.farmers f on f.farmer_code = p.farmer_code
  left join survey.users u on u.employee_name = replace(trim(p.employee_name), '_', ' ');

  -- 4. Insert land_details
  insert into survey.land_details
    (survey_id, total_acreage, largest_plot_acres, land_area_hectare, irrigation_type)
  select 
    s.survey_id, p.total_acreage, p.largest_plot_acres, p.land_area_hectare, p.irrigation_type
  from tmp_pending p
  join survey.surveys s on s.unique_id = p.unique_id;

  -- 5. Insert crop_yield
  insert into survey.crop_yield
    (survey_id, crop_type, ratoon_type, next_ratoon_wish, yield_tonnes, yield_tonnes_ha)
  select 
    s.survey_id, p.crop_type, p.ratoon_type, p.next_ratoon_wish, p.yield_tonnes, p.yield_tonnes_ha
  from tmp_pending p
  join survey.surveys s on s.unique_id = p.unique_id;

  -- 6. Insert climate_events
  insert into survey.climate_events
    (survey_id, normal_year_flag, climatic_events, impact_stages,
     event_erratic_rainfall, event_cyclone, event_drought, event_flood, event_none,
     stage_sprouting, stage_tillering, stage_grand_growth, stage_maturity)
  select 
    s.survey_id, p.normal_year_flag, p.climatic_events, p.impact_stages,
    p.event_erratic_rainfall, p.event_cyclone, p.event_drought, p.event_flood, p.event_none,
    p.stage_sprouting, p.stage_tillering, p.stage_grand_growth, p.stage_maturity
  from tmp_pending p
  join survey.surveys s on s.unique_id = p.unique_id;

  -- 7. Insert fertilizer_application (unpivot)
  insert into survey.fertilizer_application (survey_id, fertilizer_name, quantity_kg, application_method)
  select s.survey_id, x.fertilizer_name, x.quantity_kg, p.fertilizer_application_method
  from tmp_pending p
  join survey.surveys s on s.unique_id = p.unique_id
  cross join lateral (
    values
      ('Urea', p.urea_kg),
      ('DAP', p.dap_kg),
      ('SSP', p.ssp_kg),
      ('MOP', p.mop_kg),
      ('NPK 10:26:26', p.npk_10_26_26_kg),
      ('NPK 12:32:16', p.npk_12_32_16_kg),
      ('NPS 20:20:0:13', p.nps_20_20_0_13_kg),
      ('Ammonium Sulphate', p.ammonium_sulphate_kg),
      ('Ammonium Chloride', p.ammonium_chloride_kg),
      ('NPK 17:17:17', p.npk_17_17_17_kg),
      ('NPKS 16:20:0:13', p.npks_16_20_0_13_kg),
      ('NPK 16:16:16', p.npk_16_16_16_kg),
      ('NPK 12:61:0', p.npk_12_61_0_kg),
      ('NPKS 15:15:15:09', p.npks_15_15_15_09_kg),
      ('NPK 19:19:19', p.npk_19_19_19_kg),
      ('Mono 11:52:0', p.mono_11_52_0_kg),
      ('Calcium Ammonium Nitrate', p.calcium_ammonium_nitrate_kg),
      ('Farm Yard Manure', p.farm_yard_manure_kg),
      ('Vermicompost', p.vermicompost_kg),
      ('Goat/Sheep Manure', p.goat_sheep_manure_kg),
      ('Poultry Manure', p.poultry_manure_kg),
      ('Press Mud', p.press_mud_kg),
      ('Jeevamrut', p.jeevamrut_kg)
  ) as x(fertilizer_name, quantity_kg)
  where x.quantity_kg is not null and x.quantity_kg <> 0;

  return v_processed_count;
end;
$function$;

revoke all on function public.process_raw_to_survey() from public;
grant execute on function public.process_raw_to_survey() to service_role;
