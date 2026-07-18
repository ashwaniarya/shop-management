-- A model-level fitment must carry its make: enforces the ladder invariant
-- at the DB level (service-layer validation is bypassed by direct writes, e.g. seed).
ALTER TABLE "part_fitment"
  ADD CONSTRAINT "part_fitment_model_requires_make"
  CHECK ("vehicle_model_id" IS NULL OR "vehicle_make_id" IS NOT NULL);
