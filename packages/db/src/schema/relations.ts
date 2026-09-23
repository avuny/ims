import { relations } from "drizzle-orm";
import { users, userEmails, userPhones } from "./users";
import { oauthAccounts, authChallenges, authSessions } from "./auth";
import { organizations, organizationMembers } from "./organizations";
import { businessParties, businessPartyRoles, partyUsers } from "./business";

export const usersRelations = relations(users, ({ many }) => ({
  emails: many(userEmails),
  phones: many(userPhones),
  oauthAccounts: many(oauthAccounts),
  challenges: many(authChallenges),
  sessions: many(authSessions),
  organizationMemberships: many(organizationMembers),
  partyMemberships: many(partyUsers),
}));

export const userEmailsRelations = relations(userEmails, ({ one }) => ({
  user: one(users, { fields: [userEmails.userId], references: [users.id] }),
}));

export const userPhonesRelations = relations(userPhones, ({ one }) => ({
  user: one(users, { fields: [userPhones.userId], references: [users.id] }),
}));

export const oauthAccountsRelations = relations(oauthAccounts, ({ one }) => ({
  user: one(users, { fields: [oauthAccounts.userId], references: [users.id] }),
}));

export const authChallengesRelations = relations(authChallenges, ({ one }) => ({
  user: one(users, { fields: [authChallenges.userId], references: [users.id] }),
}));

export const authSessionsRelations = relations(authSessions, ({ one }) => ({
  user: one(users, { fields: [authSessions.userId], references: [users.id] }),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  parties: many(businessParties),
}));

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, { fields: [organizationMembers.organizationId], references: [organizations.id] }),
  user: one(users, { fields: [organizationMembers.userId], references: [users.id] }),
}));

export const businessPartiesRelations = relations(businessParties, ({ one, many }) => ({
  organization: one(organizations, { fields: [businessParties.organizationId], references: [organizations.id] }),
  roles: many(businessPartyRoles),
  users: many(partyUsers),
}));

export const businessPartyRolesRelations = relations(businessPartyRoles, ({ one }) => ({
  party: one(businessParties, { fields: [businessPartyRoles.partyId], references: [businessParties.id] }),
}));

export const partyUsersRelations = relations(partyUsers, ({ one }) => ({
  party: one(businessParties, { fields: [partyUsers.partyId], references: [businessParties.id] }),
  user: one(users, { fields: [partyUsers.userId], references: [users.id] }),
}));
