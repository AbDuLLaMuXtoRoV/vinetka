import { env as shared } from "@web/surfaces/shared/env";

export const env = {
  ...shared,
  /** Direct channels on /contact; each is shown only when set. Telegram is a username without "@". */
  contact: {
    phone: process.env.NEXT_PUBLIC_CONTACT_PHONE?.trim() || null,
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || null,
    telegram: process.env.NEXT_PUBLIC_CONTACT_TELEGRAM?.trim().replace(/^@/, "") || null,
  },
};
