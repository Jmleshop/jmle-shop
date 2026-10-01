-- Manuell ausführbar (idempotent)
CREATE OR REPLACE FUNCTION public.increment_discount_usage(p_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_id UUID;
BEGIN
  IF p_code IS NULL OR btrim(p_code) = '' THEN
    RETURN FALSE;
  END IF;

  UPDATE public.discount_codes
  SET usage_count = COALESCE(usage_count, 0) + 1
  WHERE code = upper(btrim(p_code))
    AND active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (usage_limit IS NULL OR COALESCE(usage_count, 0) < usage_limit)
  RETURNING id INTO updated_id;

  RETURN updated_id IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_discount_usage(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_discount_usage(TEXT) TO authenticated;
