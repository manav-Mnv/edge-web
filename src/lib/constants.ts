export const ALLOWED_EMAIL_DOMAIN =
  process.env.ALLOWED_EMAIL_DOMAIN || "paruluniversity.ac.in";

export const USER_ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  AD: "ad",
  FACULTY: "faculty",
  CLUB_LEAD: "club_lead",
  STUDENT: "student",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];
