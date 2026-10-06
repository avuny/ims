/** Shapes stored in jsonb columns. */

export type BillingAddress = {
  line1: string; line2?: string; city: string; state?: string; postalCode?: string; country: string;
};
export type BillingSnapshot = {
  legalName: string; email: string; taxId?: string | null; address?: BillingAddress | null;
};
// null = unlimited
export type PlanLimits = {
  managedUsers: number | null;
  branches: number | null;
  warehouses: number | null;
  portalUsers: number | null;
};
export type PlanFeatures = Partial<
  Record<'multiWarehouse' | 'customRoles' | 'apiAccess' | 'auditExport' | 'prioritySupport', boolean>
>;
