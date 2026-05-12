-- Migration 025: convert policy.images from string[] to {path,caption}[] objects
-- Existing rows: ["uploads/policies/xxx.png"] → [{"path":"uploads/policies/xxx.png","caption":""}]
UPDATE policy
SET images = (
  SELECT COALESCE(
    jsonb_agg(
      CASE jsonb_typeof(el)
        WHEN 'string' THEN jsonb_build_object('path', el #>> '{}', 'caption', '')
        ELSE el
      END
    ),
    '[]'::jsonb
  )
  FROM jsonb_array_elements(images) AS el
)
WHERE images IS NOT NULL AND jsonb_array_length(images) > 0;
