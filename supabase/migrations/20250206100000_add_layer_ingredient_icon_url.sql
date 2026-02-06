-- Optional icon/image URL for layers and ingredients (display in form and PDF)
ALTER TABLE layers
  ADD COLUMN IF NOT EXISTS icon_url text;

ALTER TABLE ingredients
  ADD COLUMN IF NOT EXISTS icon_url text;

COMMENT ON COLUMN layers.icon_url IS 'URL to icon or image for this layer';
COMMENT ON COLUMN ingredients.icon_url IS 'URL to icon or image for this ingredient';
