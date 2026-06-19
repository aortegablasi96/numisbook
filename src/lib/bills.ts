// Constraints for user-uploaded coin bills (auction/seller receipts). Always
// PDFs. Shared by the service (validation) and the upload UI.
export const ALLOWED_BILL_TYPES = ["application/pdf"] as const;

export const MAX_BILL_BYTES = 15 * 1024 * 1024; // 15 MB

export type AllowedBillType = (typeof ALLOWED_BILL_TYPES)[number];

export function isAllowedBillType(value: string): value is AllowedBillType {
  return (ALLOWED_BILL_TYPES as readonly string[]).includes(value);
}
