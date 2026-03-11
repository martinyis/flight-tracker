import { z } from "zod";

export const googleLoginSchema = {
  body: z.object({
    idToken: z.string({ error: "Google ID token is required" }),
  }),
};

export const appleLoginSchema = {
  body: z.object({
    identityToken: z.string({ error: "Apple identity token is required" }),
  }),
};

export const updateProfileSchema = {
  body: z
    .object({
      firstName: z.string().max(50, "First name must be 50 characters or less").trim().nullish(),
      lastName: z.string().max(50, "Last name must be 50 characters or less").trim().nullish(),
    })
    .refine((data) => data.firstName !== undefined || data.lastName !== undefined, {
      message: "No fields to update",
    }),
};
