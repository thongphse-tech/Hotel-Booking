ALTER TABLE DiscountCode
  ADD COLUMN IF NOT EXISTS DiscountType VARCHAR(20) NOT NULL DEFAULT 'percentage';

ALTER TABLE DiscountCode
  ALTER COLUMN DiscountValue TYPE DECIMAL(12, 2);

ALTER TABLE DiscountCode
  DROP CONSTRAINT IF EXISTS discountcode_discountvalue_check;

ALTER TABLE DiscountCode
  DROP CONSTRAINT IF EXISTS discountcode_discount_type_check;

ALTER TABLE DiscountCode
  ADD CONSTRAINT discountcode_discount_type_check
  CHECK (DiscountType IN ('percentage', 'fixed'));

ALTER TABLE DiscountCode
  DROP CONSTRAINT IF EXISTS discountcode_fixed_value_check;

ALTER TABLE DiscountCode
  ADD CONSTRAINT discountcode_fixed_value_check
  CHECK (
    (DiscountType = 'percentage' AND DiscountValue BETWEEN 0 AND 100)
    OR (DiscountType = 'fixed' AND DiscountValue >= 0)
  );
