-- Per-ingredient: show "delete" and "add more" buttons in order form
ALTER TABLE ingredients
  ADD COLUMN IF NOT EXISTS allow_delete boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_add_more boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN ingredients.allow_delete IS 'If true, customer can remove this ingredient from their order';
COMMENT ON COLUMN ingredients.allow_add_more IS 'If true, customer can add more of this ingredient (quantity layers only)';
