import { relations } from "drizzle-orm"
import {
  organizationInvitations,
  organizations,
  organizationUsers,
} from "./organizations.js"
import { userIdentifiers, userProviders, users } from "./users.js"
import {
  organizationUserRoles,
  rolePermissions,
  roles,
} from "./access-control.js"
import { billingAccounts } from "./billing-accounts.js"
import { plans, planPrices } from "./plans.js"
import { subscriptionEvents, subscriptions } from "./subscriptions.js"
import { invoiceItems, invoices } from "./invoices.js"
import { paymentMethods, payments, refunds } from "./payments.js"
import { refreshTokens } from "./refresh-token.js"

/**
 * Every relations() definition lives here (kept apart from the tables to avoid import cycles).
 */

/* identity & access */

export const usersRelations = relations(users, ({ many }) => ({
  identifiers: many(userIdentifiers),
  refreshTokens: many(refreshTokens),
  memberships: many(organizationUsers), // the organization switcher
}))

export const userIdentifiersRelations = relations(
  userIdentifiers,
  ({ one, many }) => ({
    user: one(users, {
      fields: [userIdentifiers.userId],
      references: [users.id],
    }),
    providers: many(userProviders),
  })
)

export const userProvidersRelations = relations(userProviders, ({ one }) => ({
  identifier: one(userIdentifiers, {
    fields: [userProviders.identifierId],
    references: [userIdentifiers.id],
  }),
}))

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}))

/* organizations */

export const organizationsRelations = relations(
  organizations,
  ({ one, many }) => ({
    members: many(organizationUsers),
    invitations: many(organizationInvitations),
    roles: many(roles),
    billingAccount: one(billingAccounts),
    subscriptions: many(subscriptions),
    invoices: many(invoices),
    payments: many(payments),
    paymentMethods: many(paymentMethods),
  })
)

export const organizationUsersRelations = relations(
  organizationUsers,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [organizationUsers.orgId],
      references: [organizations.id],
    }),
    user: one(users, {
      fields: [organizationUsers.userId],
      references: [users.id],
    }),
    roleAssignments: many(organizationUserRoles),
  })
)

export const organizationInvitationsRelations = relations(
  organizationInvitations,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationInvitations.orgId],
      references: [organizations.id],
    }),
    inviteeUser: one(users, {
      fields: [organizationInvitations.inviteeUserId],
      references: [users.id],
    }),
    inviter: one(organizationUsers, {
      fields: [organizationInvitations.invitedBy],
      references: [organizationUsers.id],
    }),
    acceptedMember: one(organizationUsers, {
      fields: [organizationInvitations.acceptedOrgUserId],
      references: [organizationUsers.id],
    }),
  })
)

export const rolesRelations = relations(roles, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [roles.orgId],
    references: [organizations.id],
  }), // null = system role
  permissions: many(rolePermissions),
  assignments: many(organizationUserRoles),
}))

export const rolePermissionsRelations = relations(
  rolePermissions,
  ({ one }) => ({
    role: one(roles, {
      fields: [rolePermissions.roleId],
      references: [roles.id],
    }),
  })
)

export const organizationUserRolesRelations = relations(
  organizationUserRoles,
  ({ one }) => ({
    member: one(organizationUsers, {
      fields: [organizationUserRoles.orgUserId],
      references: [organizationUsers.id],
    }),
    role: one(roles, {
      fields: [organizationUserRoles.roleId],
      references: [roles.id],
    }),
    assignedBy: one(users, {
      fields: [organizationUserRoles.assignedByUserId],
      references: [users.id],
    }),
  })
)

/* billing */

export const billingAccountsRelations = relations(
  billingAccounts,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [billingAccounts.orgId],
      references: [organizations.id],
    }),
  })
)

export const plansRelations = relations(plans, ({ many }) => ({
  prices: many(planPrices),
}))

export const planPricesRelations = relations(planPrices, ({ one }) => ({
  plan: one(plans, { fields: [planPrices.planId], references: [plans.id] }),
}))

export const subscriptionsRelations = relations(
  subscriptions,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [subscriptions.orgId],
      references: [organizations.id],
    }),
    planPrice: one(planPrices, {
      fields: [subscriptions.planPriceId],
      references: [planPrices.id],
    }),
    pendingPlanPrice: one(planPrices, {
      fields: [subscriptions.pendingPlanPriceId],
      references: [planPrices.id],
    }),
    invoices: many(invoices),
    events: many(subscriptionEvents),
  })
)

export const subscriptionEventsRelations = relations(
  subscriptionEvents,
  ({ one }) => ({
    subscription: one(subscriptions, {
      fields: [subscriptionEvents.subscriptionId],
      references: [subscriptions.id],
    }),
    actor: one(users, {
      fields: [subscriptionEvents.actorUserId],
      references: [users.id],
    }),
  })
)

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [invoices.orgId],
    references: [organizations.id],
  }),
  subscription: one(subscriptions, {
    fields: [invoices.subscriptionId],
    references: [subscriptions.id],
  }),
  items: many(invoiceItems),
  payments: many(payments),
}))

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
}))

export const paymentMethodsRelations = relations(paymentMethods, ({ one }) => ({
  organization: one(organizations, {
    fields: [paymentMethods.orgId],
    references: [organizations.id],
  }),
}))

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [payments.orgId],
    references: [organizations.id],
  }),
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
  paymentMethod: one(paymentMethods, {
    fields: [payments.paymentMethodId],
    references: [paymentMethods.id],
  }),
  refunds: many(refunds),
}))

export const refundsRelations = relations(refunds, ({ one }) => ({
  payment: one(payments, {
    fields: [refunds.paymentId],
    references: [payments.id],
  }),
}))
