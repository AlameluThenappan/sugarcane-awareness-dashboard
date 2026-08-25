-- Moves approved rows from raw.sugarcane_survey into the normalized
-- survey.* tables (farmers, users, surveys, land_details, crop_yield,
-- climate_events, fertilizer_application) that the Admin dashboard
-- actually reads (via survey.v_survey). Until now nothing did this for
-- rows landed by the verifier-upload pipeline, so new uploads sat in
-- raw.sugarcane_survey and never reached the dashboard.
--
-- Schema verified live against the project before writing this (see
-- conversation): survey.surveys.unique_id is the join key back to
-- raw.sugarcane_survey.unique_id; survey.surveys.user_id is NOT NULL and
-- points at survey.users (the enumerator, matched by employee_name), not
-- at the verifier's auth uid in raw.created_by.
--
-- Note: raw.sugarcane_survey.employee_name for rows inserted by the
-- verifier-upload Edge Function comes through as "Gokulraj_N" (Kobo's
-- underscore-joined option value) while the 5 enumerators already in
-- survey.users are stored as "Gokulraj N" (spaces, from the original KOBO
-- load). Matched/inserted here with underscores normalized to spaces so
-- these resolve to the same existing survey.users rows instead of forking
-- duplicate enumerators.
create or replace function public.process_raw_to_survey()
returns integer
language plpgsql
security definer
set search_path = 'survey', 'raw', 'public'
as $function$
declare
  v_row raw.sugarcane_survey%rowtype;
  v_employee_name text;
  v_farmer_id bigint;
  v_user_id bigint;
  v_survey_id bigint;
  v_processed_count integer := 0;
begin
  for v_row in
    select rs.*
    from raw.sugarcane_survey rs
    where rs.validation_status = 'Approved'
      and rs.unique_id is not null
      and not exists (
        select 1 from survey.surveys s where s.unique_id = rs.unique_id
      )
    order by rs.id
  loop
    v_employee_name := replace(trim(v_row.employee_name), '_', ' ');

    -- farmers: skip if this farmer_code already exists
    insert into survey.farmers
      (farmer_code, farmer_name, age, education, mobile_number, village_name, block_name, district_name, state)
    values
      (v_row.farmer_code, v_row.farmer_name, v_row.age, v_row.education, v_row.mobile_number,
       v_row.village_name, v_row.block_name, v_row.district_name, v_row.state)
    on conflict (farmer_code) do nothing;

    select farmer_id into v_farmer_id from survey.farmers where farmer_code = v_row.farmer_code;

    -- users (enumerator): skip if this employee already exists
    insert into survey.users (employee_name, designation, organization_name, role)
    values (v_employee_name, v_row.enumerator_designation, v_row.organization_name, 'ENUMERATOR')
    on conflict (employee_name) do nothing;

    select user_id into v_user_id from survey.users where employee_name = v_employee_name;

    -- surveys: one row per raw row
    insert into survey.surveys
      (unique_id, farmer_id, user_id, collection_date, survey_year, crop, consent_response, source)
    values
      (v_row.unique_id, v_farmer_id, v_user_id, v_row.collection_date, v_row.survey_year,
       v_row.crop, v_row.consent_response, v_row.source)
    returning survey_id into v_survey_id;

    insert into survey.land_details
      (survey_id, total_acreage, largest_plot_acres, land_area_hectare, irrigation_type)
    values
      (v_survey_id, v_row.total_acreage, v_row.largest_plot_acres, v_row.land_area_hectare, v_row.irrigation_type);

    insert into survey.crop_yield
      (survey_id, crop_type, ratoon_type, next_ratoon_wish, yield_tonnes, yield_tonnes_ha)
    values
      (v_survey_id, v_row.crop_type, v_row.ratoon_type, v_row.next_ratoon_wish, v_row.yield_tonnes, v_row.yield_tonnes_ha);

    insert into survey.climate_events
      (survey_id, normal_year_flag, climatic_events, impact_stages,
       event_erratic_rainfall, event_cyclone, event_drought, event_flood, event_none,
       stage_sprouting, stage_tillering, stage_grand_growth, stage_maturity)
    values
      (v_survey_id, v_row.normal_year_flag, v_row.climatic_events, v_row.impact_stages,
       v_row.event_erratic_rainfall, v_row.event_cyclone, v_row.event_drought, v_row.event_flood, v_row.event_none,
       v_row.stage_sprouting, v_row.stage_tillering, v_row.stage_grand_growth, v_row.stage_maturity);

    -- fertilizer_application: unpivot the ~20 fertilizer columns, one row per non-zero value
    insert into survey.fertilizer_application (survey_id, fertilizer_name, quantity_kg, application_method)
    select v_survey_id, x.fertilizer_name, x.quantity_kg, v_row.fertilizer_application_method
    from (values
      ('Urea', v_row.urea_kg),
      ('DAP', v_row.dap_kg),
      ('SSP', v_row.ssp_kg),
      ('MOP', v_row.mop_kg),
      ('NPK 10:26:26', v_row.npk_10_26_26_kg),
      ('NPK 12:32:16', v_row.npk_12_32_16_kg),
      ('NPS 20:20:0:13', v_row.nps_20_20_0_13_kg),
      ('Ammonium Sulphate', v_row.ammonium_sulphate_kg),
      ('Ammonium Chloride', v_row.ammonium_chloride_kg),
      ('NPK 17:17:17', v_row.npk_17_17_17_kg),
      ('NPKS 16:20:0:13', v_row.npks_16_20_0_13_kg),
      ('NPK 16:16:16', v_row.npk_16_16_16_kg),
      ('NPK 12:61:0', v_row.npk_12_61_0_kg),
      ('NPKS 15:15:15:09', v_row.npks_15_15_15_09_kg),
      ('NPK 19:19:19', v_row.npk_19_19_19_kg),
      ('Mono 11:52:0', v_row.mono_11_52_0_kg),
      ('Calcium Ammonium Nitrate', v_row.calcium_ammonium_nitrate_kg),
      ('Farm Yard Manure', v_row.farm_yard_manure_kg),
      ('Vermicompost', v_row.vermicompost_kg),
      ('Goat/Sheep Manure', v_row.goat_sheep_manure_kg),
      ('Poultry Manure', v_row.poultry_manure_kg),
      ('Press Mud', v_row.press_mud_kg),
      ('Jeevamrut', v_row.jeevamrut_kg)
    ) as x(fertilizer_name, quantity_kg)
    where x.quantity_kg is not null and x.quantity_kg <> 0;

    v_processed_count := v_processed_count + 1;
  end loop;

  return v_processed_count;
end;
$function$;

-- Idempotent by construction (the NOT EXISTS filter re-derives the same
-- work list on every call) and mutates survey.* rather than reading
-- PostgREST-exposed tables, so it doesn't need to go through the Data API:
-- restrict it to service_role (the Edge Function's direct DB connection,
-- and any future backend/manual invocation), not anon/authenticated.
revoke all on function public.process_raw_to_survey() from public;
grant execute on function public.process_raw_to_survey() to service_role;
