// Constraints for user-uploaded coin invoices (auction/seller receipts). Always
// PDFs. Shared by the service (validation) and the upload UI.
export const ALLOWED_INVOICE_TYPES = ["application/pdf"] as const;

export const MAX_INVOICE_BYTES = 15 * 1024 * 1024; // 15 MB

export type AllowedInvoiceType = (typeof ALLOWED_INVOICE_TYPES)[number];

export function isAllowedInvoiceType(value: string): value is AllowedInvoiceType {
  return (ALLOWED_INVOICE_TYPES as readonly string[]).includes(value);
}
