CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT public.unaccent($1)
$$;

CREATE INDEX "client_fullName_global_search_trgm_idx"
  ON "client" USING GIN ((lower(immutable_unaccent("fullName"))) gin_trgm_ops);

CREATE INDEX "client_phone_global_search_trgm_idx"
  ON "client" USING GIN ((regexp_replace(COALESCE("phone", ''), '[^0-9]', '', 'g')) gin_trgm_ops);

CREATE INDEX "pet_name_global_search_trgm_idx"
  ON "pet" USING GIN ((lower(immutable_unaccent("name"))) gin_trgm_ops);

CREATE INDEX "product_name_global_search_trgm_idx"
  ON "product" USING GIN ((lower(immutable_unaccent("name"))) gin_trgm_ops);

CREATE INDEX "product_sku_global_search_trgm_idx"
  ON "product" USING GIN ((lower(COALESCE("sku", ''))) gin_trgm_ops);

CREATE INDEX "service_name_global_search_trgm_idx"
  ON "service" USING GIN ((lower(immutable_unaccent("name"))) gin_trgm_ops);
