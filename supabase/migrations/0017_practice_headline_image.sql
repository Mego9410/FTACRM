-- Practice headline image ---------------------------------------------------
-- Optional uploaded photo shown at the top of a practice. When null, the app
-- renders a generated England & Wales map with a pin at the practice's
-- coordinates instead — no column needed for that (it derives from lat/lng).

alter table public.practices
  add column if not exists headline_image_path text;
