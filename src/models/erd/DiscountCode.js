/** ERD entity: DiscountCode */
export class DiscountCode {
  constructor({ CodeID, CodeString, DiscountValue, ValidFrom, ValidTo, UsageLimit = null }) {
    Object.assign(this, { CodeID, CodeString, DiscountValue, ValidFrom, ValidTo, UsageLimit });
  }
}
