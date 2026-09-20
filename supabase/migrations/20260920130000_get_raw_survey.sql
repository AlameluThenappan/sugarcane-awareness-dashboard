-- Create a function to fetch the raw row for a specific survey_id
create or replace function public.get_raw_survey_profile(p_survey_id integer)
returns jsonb
language plpgsql
security definer
set search_path = 'survey', 'raw', 'public'
as $$
declare
  v_raw jsonb;
begin
  select to_jsonb(rs.*) into v_raw
  from survey.surveys s
  join raw.sugarcane_survey rs on rs.unique_id = s.unique_id
  where s.survey_id = p_survey_id;

  return v_raw;
end;
$$;

revoke all on function public.get_raw_survey_profile(integer) from public;
grant execute on function public.get_raw_survey_profile(integer) to authenticated, service_role;
