import { pgEnum } from 'drizzle-orm/pg-core';

/** How a user relates to an organization (stored on organization_users). */
export const orgMemberTypeEnum = pgEnum('org_member_type', ['owner', 'managed', 'portal']);
export const orgStatusEnum = pgEnum('org_status', ['active', 'suspended', 'closed']);

/** Permission statement effect. An explicit deny always beats any allow. */
export const permissionEffectEnum = pgEnum('permission_effect', ['allow', 'deny']);

// Add providers with ALTER TYPE ... ADD VALUE in a migration.
export const billingProviderEnum = pgEnum('billing_provider', ['manual', 'stripe', 'paymob']);
export const billingIntervalEnum = pgEnum('billing_interval', ['month', 'year']);
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'incomplete', // created, first payment pending
  'trialing',
  'active',
  'past_due',   // renewal payment failed; grace period running
  'paused',
  'canceled',   // terminal
  'expired',    // terminal
]);
export const invoiceStatusEnum = pgEnum('invoice_status', ['draft', 'open', 'paid', 'void', 'uncollectible']);
export const invoiceItemTypeEnum = pgEnum('invoice_item_type', ['subscription', 'proration', 'usage', 'adjustment']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'requires_action', 'succeeded', 'failed', 'canceled']);
export const paymentMethodTypeEnum = pgEnum('payment_method_type', ['card', 'wallet', 'bank_transfer', 'cash', 'other']);
export const refundStatusEnum = pgEnum('refund_status', ['pending', 'succeeded', 'failed']);
export const webhookStatusEnum = pgEnum('webhook_status', ['received', 'processed', 'failed', 'ignored']);

// Value types derived from the enums (import these in repositories / services).
export type OrgMemberType = (typeof orgMemberTypeEnum.enumValues)[number];
export type OrgStatus = (typeof orgStatusEnum.enumValues)[number];
export type PermissionEffect = (typeof permissionEffectEnum.enumValues)[number];
export type BillingProvider = (typeof billingProviderEnum.enumValues)[number];
export type BillingInterval = (typeof billingIntervalEnum.enumValues)[number];
export type SubscriptionStatus = (typeof subscriptionStatusEnum.enumValues)[number];
export type InvoiceStatus = (typeof invoiceStatusEnum.enumValues)[number];
export type InvoiceItemType = (typeof invoiceItemTypeEnum.enumValues)[number];
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];
export type PaymentMethodType = (typeof paymentMethodTypeEnum.enumValues)[number];
export type RefundStatus = (typeof refundStatusEnum.enumValues)[number];
export type WebhookStatus = (typeof webhookStatusEnum.enumValues)[number];
