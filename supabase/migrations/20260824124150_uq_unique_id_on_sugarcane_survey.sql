-- Ensure raw.sugarcane_survey.unique_id has a uniqueness constraint so that
-- `insert ... on conflict (unique_id) do nothing` can be used safely by the
-- upload-verifier-export Edge Function.
--
-- NOTE (verified against the live project 2026-08-24): both
-- `sugarcane_survey_unique_id_key` and `uq_unique_id` already exist as
-- UNIQUE (unique_id) constraints on this table. This migration is written
-- idempotently and is effectively a no-op there — it exists for schema
-- history / any future environment that doesn't have it yet.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'raw.sugarcane_survey'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) = 'UNIQUE (unique_id)'
  ) then
    alter table raw.sugarcane_survey
      add constraint uq_unique_id unique (unique_id);
  end if;
end
$$;
