-- Search secondary sort: Arabic name (أ → ي) instead of newest-first
CREATE OR REPLACE FUNCTION public.search_products_public(
  p_query TEXT,
  p_limit INT DEFAULT 24
)
RETURNS SETOF public.products_public
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT p.*
  FROM public.products_public p
  WHERE
    p_query IS NULL
    OR btrim(p_query) = ''
    OR p.name_ar ILIKE '%' || btrim(p_query) || '%'
    OR COALESCE(p.name_de, '') ILIKE '%' || btrim(p_query) || '%'
    OR COALESCE(p.description, '') ILIKE '%' || btrim(p_query) || '%'
    OR COALESCE(p.ingredients, '') ILIKE '%' || btrim(p_query) || '%'
    OR COALESCE(p.origin_country, '') ILIKE '%' || btrim(p_query) || '%'
  ORDER BY
    CASE
      WHEN p.name_ar ILIKE btrim(p_query) || '%' THEN 0
      WHEN p.name_ar ILIKE '%' || btrim(p_query) || '%' THEN 1
      ELSE 2
    END,
    p.name_ar ASC NULLS LAST
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 24), 100));
$$;

GRANT EXECUTE ON FUNCTION public.search_products_public(TEXT, INT) TO anon, authenticated;
