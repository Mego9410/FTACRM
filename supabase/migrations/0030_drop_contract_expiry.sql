-- The agency contract expiry date isn't tracked by FTA — drop it and everything
-- that fed off it (the "contracts expiring" smart list and dashboard metric were
-- removed in the app in the same change).

alter table public.practices drop column if exists contract_expiry;
