-- The verifier dashboard (VerifierApp.tsx) has always called four RPCs that
-- were never implemented: verifier_summary, verifier_approval_by_block,
-- verifier_village_coverage, verifier_upload_batches. Every call 404'd
-- (PGRST202) and was silently swallowed by .catch() fallbacks in the
-- frontend, so the KPI cards rendered zero/blank even though real rows
-- exist in raw.sugarcane_survey and survey.upload_batch.
--
-- These mirror the style of the existing analytics RPCs (summary(),
-- villages(), etc.): `language sql stable security definer`, an explicit
-- search_path so `raw`/`survey` are reachable even though neither schema
-- is exposed to PostgREST, and json_build_object/json_agg with the exact
-- camelCase keys the frontend types (verifierTypes.ts) expect.
--
-- Field names deliberately match verifierTypes.ts exactly, case-sensitive.

create or replace function public.verifier_summary()
returns json
language sql
stable security definer
set search_path to 'survey', 'raw', 'public'
as $function$
  with counts as (
    select
      count(*)                                                  as total_records,
      count(*) filter (where validation_status = 'Approved')     as approved,
      count(*) filter (where validation_status = 'Not Approved') as not_approved
    from raw.sugarcane_survey
  ),
  latest_batch as (
    select uploaded_at, new_records
    from survey.upload_batch
    where status = 'complete'
    order by uploaded_at desc
    limit 1
  )
  select json_build_object(
    'totalRecords',  counts.total_records,
    'approved',      counts.approved,
    'notApproved',   counts.not_approved,
    'approvalRate',  coalesce(round(counts.approved::numeric / nullif(counts.total_records, 0) * 100), 0),
    'lastUpload',    latest_batch.uploaded_at,
    'newThisUpload', latest_batch.new_records
  )
  from counts left join latest_batch on true;
$function$;

create or replace function public.verifier_approval_by_block()
returns json
language sql
stable security definer
set search_path to 'survey', 'raw', 'public'
as $function$
  select coalesce((
    select json_agg(json_build_object(
      'block',       block_name,
      'approved',    approved,
      'notApproved', not_approved
    ) order by block_name)
    from (
      select
        block_name,
        count(*) filter (where validation_status = 'Approved')     as approved,
        count(*) filter (where validation_status = 'Not Approved') as not_approved
      from raw.sugarcane_survey
      where block_name is not null
      group by block_name
    ) grouped
  ), '[]'::json);
$function$;

create or replace function public.verifier_village_coverage()
returns json
language sql
stable security definer
set search_path to 'survey', 'raw', 'public'
as $function$
  select coalesce((
    select json_agg(json_build_object(
      'village',      village_name,
      'records',      records,
      'approvalRate', approval_rate
    ) order by village_name)
    from (
      select
        village_name,
        count(*) as records,
        round(
          count(*) filter (where validation_status = 'Approved')::numeric
          / count(*) * 100
        ) as approval_rate
      from raw.sugarcane_survey
      where village_name is not null
      group by village_name
    ) grouped
  ), '[]'::json);
$function$;

create or replace function public.verifier_upload_batches()
returns json
language sql
stable security definer
set search_path to 'survey', 'raw', 'public'
as $function$
  select coalesce((
    select json_agg(json_build_object(
      'id',             id,
      'uploadedAt',     uploaded_at,
      'filename',       filename,
      'rowCount',       row_count,
      'approved',       approved,
      'notApproved',    not_approved,
      'newRecords',     new_records,
      'updatedRecords', updated_records,
      'status',         status
    ) order by uploaded_at desc)
    from survey.upload_batch
  ), '[]'::json);
$function$;
