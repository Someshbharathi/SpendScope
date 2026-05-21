-- Allow public share/re-audit links to resolve either share_id or internal row id (one row max).
-- Safe: still equality on a single UUID; no table scan beyond indexed columns.

CREATE OR REPLACE FUNCTION public.get_audit_by_share_id(p_share_id uuid)
RETURNS SETOF public.audits
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.audits
  WHERE share_id = p_share_id OR id = p_share_id
  ORDER BY created_at DESC NULLS LAST
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_audit_by_share_id(uuid) IS
  'Public share/re-audit lookup: returns at most one audit for share_id or internal id. Bypasses RLS.';
