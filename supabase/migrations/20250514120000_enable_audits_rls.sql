-- SpendScope MVP: enable RLS on public.audits without auth.
-- Run in Supabase Dashboard → SQL Editor (or supabase db push) BEFORE deploying app code that calls get_audit_by_share_id.
--
-- Model:
-- - anon: INSERT new audits only (no SELECT/UPDATE/DELETE policies → those default deny under RLS).
-- - Public reads: use RPC get_audit_by_share_id (SECURITY DEFINER) so share links work without exposing table scans.

-- ---------------------------------------------------------------------------
-- Read path: single-row fetch by capability (share UUID)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_audit_by_share_id(p_share_id uuid)
RETURNS SETOF public.audits
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.audits
  WHERE share_id = p_share_id
  ORDER BY created_at DESC NULLS LAST
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_audit_by_share_id(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_audit_by_share_id(uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.get_audit_by_share_id(uuid) IS
  'Public share page lookup: returns at most one audit row for the given share_id. Bypasses RLS; do not widen beyond share_id equality.';

-- ---------------------------------------------------------------------------
-- RLS on audits
-- ---------------------------------------------------------------------------
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audits_anon_insert" ON public.audits;

CREATE POLICY "audits_anon_insert"
  ON public.audits
  FOR INSERT
  TO anon
  WITH CHECK (
    share_id IS NOT NULL
    AND results_json IS NOT NULL
    AND tools_json IS NOT NULL
  );

-- Optional: if you later add a logged-in role that inserts via the same table + JWT, mirror an insert policy here.

-- No SELECT / UPDATE / DELETE policies for anon → default deny (share reads go through RPC only).

-- ---------------------------------------------------------------------------
-- Index: fast RPC lookup (safe if duplicate; query uses LIMIT 1)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS audits_share_id_idx ON public.audits (share_id);
