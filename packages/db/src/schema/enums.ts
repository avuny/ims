import { pgEnum } from "drizzle-orm/pg-core";

export const userStatusEnum = pgEnum("user_status", ["ACTIVE", "SUSPENDED", "DELETED"]);
export const organizationMemberRoleEnum = pgEnum("organization_member_role", ["OWNER", "ADMIN", "MEMBER"]);
export const oauthProviderEnum = pgEnum("oauth_provider", ["GOOGLE", "FACEBOOK", "APPLE"]);
export const authChallengePurposeEnum = pgEnum("auth_challenge_purpose", [
  "SIGN_UP", "LOGIN", "VERIFY_EMAIL", "VERIFY_PHONE", "PASSWORD_RESET", "CHANGE_EMAIL", "CHANGE_PHONE"
]);
export const authChallengeChannelEnum = pgEnum("auth_challenge_channel", ["EMAIL", "SMS"]);
export const businessPartyRoleEnum = pgEnum("business_party_role", ["CUSTOMER", "SUPPLIER"]);
