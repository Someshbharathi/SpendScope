-- Require pricing_snapshot on new anon inserts (aligns with app always sending benchmark snapshot).
DROP POLICY IF EXISTS "audits_anon_insert" ON public.audits;

CREATE POLICY "audits_anon_insert"
  ON public.audits
  FOR INSERT
  TO anon
  WITH CHECK (
    share_id IS NOT NULL
    AND results_json IS NOT NULL
    AND tools_json IS NOT NULL
    AND pricing_snapshot IS NOT NULL
  );
