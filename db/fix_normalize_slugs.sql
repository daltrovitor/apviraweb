-- Normalize existing `slug` values in `public.presentations` to remove diacritics
-- and invalid characters, collapsing duplicates by appending a numeric suffix.
-- Run inside Supabase SQL editor or psql connected to your project.

begin;

-- ensure unaccent extension
create extension if not exists unaccent;

-- Build normalized base slugs from the current slug column (preserves any timestamp suffix)
create temporary table tmp_normalized as
select
  id,
  trim(both '-' from regexp_replace(regexp_replace(lower(unaccent(slug)), '[^a-z0-9\s-]', '', 'g'), '\s+', '-', 'g')) as base_slug,
  slug
from public.presentations;

-- collapse repeated dashes
update tmp_normalized set base_slug = regexp_replace(base_slug, '-+', '-', 'g');

-- Create final slug with suffix when duplicates occur
create temporary table tmp_final as
select id,
       case when rn = 1 then base_slug else base_slug || '-' || (rn::text) end as new_slug,
       slug as old_slug
from (
  select id, base_slug, row_number() over (partition by base_slug order by id) as rn
  from tmp_normalized
) s;

-- Safety check: ensure new_slug values are unique
select new_slug, count(*) from tmp_final group by new_slug having count(*) > 1;

-- If the above returns no rows, it's safe to update
update public.presentations p
set slug = f.new_slug
from tmp_final f
where p.id = f.id;

commit;

-- Notes:
-- 1) This normalizes slugs in-place. It uses the current `slug` value as input
--    and applies `unaccent` + lowercasing + removal of invalid characters.
-- 2) If you instead want to recompute slugs from `title` (recommended in some cases),
--    change the source column in the tmp_normalized step from `slug` to `title`.
-- 3) Test on a staging copy before running in production.
-- 4) If you have foreign references that rely on the exact slug string, update them accordingly.
