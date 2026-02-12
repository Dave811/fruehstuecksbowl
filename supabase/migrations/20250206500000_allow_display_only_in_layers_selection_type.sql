-- Allow 'display_only' in layers.selection_type (was missing from CHECK)
ALTER TABLE public.layers
  DROP CONSTRAINT IF EXISTS layers_selection_type_check;

ALTER TABLE public.layers
  ADD CONSTRAINT layers_selection_type_check
  CHECK (selection_type = ANY (ARRAY['none'::text, 'single'::text, 'multiple'::text, 'quantity'::text, 'display_only'::text]));
