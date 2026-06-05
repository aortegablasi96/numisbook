import { z } from "zod";

// Validation for collection input. Shared by the API boundary (raw HTTP body)
// and the service (domain invariant on the name).
export const collectionNameSchema = z
  .string({ required_error: "Name is required" })
  .trim()
  .min(1, "Name is required")
  .max(120, "Name must be 120 characters or fewer");

export const createCollectionSchema = z.object({ name: collectionNameSchema });
export const renameCollectionSchema = z.object({ name: collectionNameSchema });

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
export type RenameCollectionInput = z.infer<typeof renameCollectionSchema>;
