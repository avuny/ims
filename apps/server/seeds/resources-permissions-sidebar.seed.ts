import {
  ActionName,
  ResourceName,
  SidebarHeadingType,
  SystemCustomPermission,
  prisma,
} from "@avuny/db"

/* ============================================================================
 * ACTIONS
 * ============================================================================
 */

const ACTIONS = [
  {
    name: ActionName.create,
    description: "Create records",
  },
  {
    name: ActionName.read,
    description: "Read records",
  },
  {
    name: ActionName.update,
    description: "Update records",
  },
  {
    name: ActionName.delete,
    description: "Delete records",
  },
] as const

/* ============================================================================
 * SIDEBAR HEADINGS
 * ============================================================================
 */

const SIDEBAR_HEADINGS = [
  {
    name: SidebarHeadingType.users,
    icon: "users",
  },
  {
    name: SidebarHeadingType.purchases,
    icon: "shopping-cart",
  },
  {
    name: SidebarHeadingType.inventory,
    icon: "package",
  },
] as const

/* ============================================================================
 * RESOURCE CONFIGURATION
 *
 * SINGLE SOURCE OF TRUTH
 *
 * Add a new resource here and everything else gets generated automatically:
 *  - Resource
 *  - Permissions
 *  - Sidebar Option
 * ============================================================================
 */

const RESOURCES = {
  [ResourceName.user]: {
    description: "System users",

    actions: [
      ActionName.create,
      ActionName.read,
      ActionName.update,
      ActionName.delete,
    ],

    sidebar: {
      heading: SidebarHeadingType.users,
      icon: "users",
      path: "/workspace/:orgId/users",
    },
  },

  [ResourceName.role]: {
    description: "Roles and permissions",

    actions: [
      ActionName.create,
      ActionName.read,
      ActionName.update,
      ActionName.delete,
    ],

    sidebar: {
      heading: SidebarHeadingType.users,
      icon: "shield",
      path: "/workspace/:orgId/roles",
    },
  },

  [ResourceName.item]: {
    description: "Inventory items",

    actions: [
      ActionName.create,
      ActionName.read,
      ActionName.update,
      ActionName.delete,
    ],

    sidebar: {
      heading: SidebarHeadingType.inventory,
      icon: "package",
      path: "/workspace/:orgId/items",
    },
  },

  [ResourceName.unit]: {
    description: "Measurement units",

    actions: [
      ActionName.create,
      ActionName.read,
      ActionName.update,
      ActionName.delete,
    ],

    sidebar: {
      heading: SidebarHeadingType.inventory,
      icon: "ruler",
      path: "/workspace/:orgId/units",
    },
  },

  [ResourceName.unitCollection]: {
    description: "Unit collections",

    actions: [
      ActionName.create,
      ActionName.read,
      ActionName.update,
      ActionName.delete,
    ],

    sidebar: {
      heading: SidebarHeadingType.inventory,
      icon: "layers",
      path: "/workspace/:orgId/unit-collections",
    },
  },

  [ResourceName.supplier]: {
    description: "Suppliers",

    actions: [
      ActionName.create,
      ActionName.read,
      ActionName.update,
      ActionName.delete,
    ],

    sidebar: {
      heading: SidebarHeadingType.purchases,
      icon: "truck",
      path: "/workspace/:orgId/suppliers",
    },
  },

  [ResourceName.purchaseOrder]: {
    description: "Purchase orders",

    actions: [
      ActionName.create,
      ActionName.read,
      ActionName.update,
      ActionName.delete,
    ],

    sidebar: {
      heading: SidebarHeadingType.purchases,
      icon: "receipt",
      path: "/workspace/:orgId/purchase-orders",
    },
  },

  [ResourceName.organization]: {
    description: "Organizations",

    actions: [ActionName.read, ActionName.update],

    sidebar: undefined,
  },

  [ResourceName.organizationUser]: {
    description: "Organization users",

    actions: [ActionName.read, ActionName.update],

    sidebar: undefined,
  },

  [ResourceName.invoice]: {
    description: "Invoices",

    actions: [
      ActionName.create,
      ActionName.read,
      ActionName.update,
      ActionName.delete,
    ],

    sidebar: undefined,
  },

  [ResourceName.customer]: {
    description: "Customers",

    actions: [
      ActionName.create,
      ActionName.read,
      ActionName.update,
      ActionName.delete,
    ],

    sidebar: undefined,
  },

  [ResourceName.salesOrder]: {
    description: "Sales orders",

    actions: [
      ActionName.create,
      ActionName.read,
      ActionName.update,
      ActionName.delete,
    ],

    sidebar: undefined,
  },

  [ResourceName.warehouse]: {
    description: "Warehouses",

    actions: [
      ActionName.create,
      ActionName.read,
      ActionName.update,
      ActionName.delete,
    ],

    sidebar: undefined,
  },

  [ResourceName.report]: {
    description: "Reports",

    actions: [ActionName.read],

    sidebar: undefined,
  },
} as const

/* ============================================================================
 * CUSTOM PERMISSIONS
 * ============================================================================
 */

const CUSTOM_PERMISSIONS = [
  {
    code: SystemCustomPermission.FULL_ACCESS,
    name: "Full Access",
    category: "DATA",
    riskLevel: "CRITICAL",
    requiresApproval: true,
  },

  {
    code: SystemCustomPermission.VIEW_FINANCIAL_REPORTS,
    name: "View Financial Reports",
    category: "FINANCIAL",
    riskLevel: "LOW",
  },

  {
    code: SystemCustomPermission.PROCESS_BULK_PAYMENTS,
    name: "Process Bulk Payments",
    category: "FINANCIAL",
    riskLevel: "HIGH",
    requiresApproval: true,
  },

  {
    code: SystemCustomPermission.OVERRIDE_PRICING,
    name: "Override Pricing",
    category: "FINANCIAL",
    riskLevel: "HIGH",
    requiresApproval: true,
  },

  {
    code: SystemCustomPermission.VIEW_COST_PRICES,
    name: "View Cost Prices",
    category: "FINANCIAL",
    riskLevel: "MEDIUM",
  },

  {
    code: SystemCustomPermission.ACCESS_PROFIT_MARGINS,
    name: "Access Profit Margins",
    category: "FINANCIAL",
    riskLevel: "MEDIUM",
  },

  {
    code: SystemCustomPermission.MANAGE_ORGANIZATION_SETTINGS,
    name: "Manage Organization Settings",
    category: "ADMINISTRATIVE",
    riskLevel: "HIGH",
  },

  {
    code: SystemCustomPermission.INVITE_USERS,
    name: "Invite Users",
    category: "ADMINISTRATIVE",
    riskLevel: "LOW",
  },

  {
    code: SystemCustomPermission.MANAGE_BILLING,
    name: "Manage Billing",
    category: "ADMINISTRATIVE",
    riskLevel: "HIGH",
  },

  {
    code: SystemCustomPermission.EXPORT_ALL_DATA,
    name: "Export All Data",
    category: "ADMINISTRATIVE",
    riskLevel: "CRITICAL",
    requiresApproval: true,
  },

  {
    code: SystemCustomPermission.ACCESS_AUDIT_LOGS,
    name: "Access Audit Logs",
    category: "ADMINISTRATIVE",
    riskLevel: "HIGH",
  },

  {
    code: SystemCustomPermission.OVERRIDE_INVENTORY,
    name: "Override Inventory",
    category: "OPERATIONAL",
    riskLevel: "HIGH",
    requiresApproval: true,
  },

  {
    code: SystemCustomPermission.BYPASS_APPROVAL_WORKFLOWS,
    name: "Bypass Approval Workflows",
    category: "OPERATIONAL",
    riskLevel: "CRITICAL",
    requiresApproval: true,
  },

  {
    code: SystemCustomPermission.MANAGE_INTEGRATIONS,
    name: "Manage Integrations",
    category: "OPERATIONAL",
    riskLevel: "MEDIUM",
  },

  {
    code: SystemCustomPermission.SCHEDULE_BATCH_OPERATIONS,
    name: "Schedule Batch Operations",
    category: "OPERATIONAL",
    riskLevel: "MEDIUM",
  },

  {
    code: SystemCustomPermission.ACCESS_ADMIN_DASHBOARD,
    name: "Access Admin Dashboard",
    category: "OPERATIONAL",
    riskLevel: "LOW",
  },

  {
    code: SystemCustomPermission.VIEW_SENSITIVE_DATA,
    name: "View Sensitive Data",
    category: "DATA",
    riskLevel: "CRITICAL",
    requiresApproval: true,
  },

  {
    code: SystemCustomPermission.ACCESS_ALL_RECORDS,
    name: "Access All Records",
    category: "DATA",
    riskLevel: "CRITICAL",
    requiresApproval: true,
  },

  {
    code: SystemCustomPermission.OVERRIDE_DATA_RETENTION,
    name: "Override Data Retention",
    category: "DATA",
    riskLevel: "HIGH",
    requiresApproval: true,
  },
] as const

/* ============================================================================
 * MAIN
 * ============================================================================
 */

async function main() {
  console.log("🌱 Starting system seed")

  /*
   * --------------------------------------------------------------------------
   * ACTIONS
   * --------------------------------------------------------------------------
   */

  for (const action of ACTIONS) {
    await prisma.action.upsert({
      where: {
        name: action.name,
      },
      update: {
        description: action.description,
      },
      create: action,
    })
  }

  console.log(`✅ Actions seeded (${ACTIONS.length})`)

  /*
   * --------------------------------------------------------------------------
   * SIDEBAR HEADINGS
   * --------------------------------------------------------------------------
   */

  for (const heading of SIDEBAR_HEADINGS) {
    await prisma.sidebarHeading.upsert({
      where: {
        name: heading.name,
      },
      update: {
        icon: heading.icon,
      },
      create: heading,
    })
  }

  console.log(`✅ Sidebar headings seeded (${SIDEBAR_HEADINGS.length})`)

  /*
   * --------------------------------------------------------------------------
   * RESOURCES
   * --------------------------------------------------------------------------
   */

  for (const [name, config] of Object.entries(RESOURCES)) {
    await prisma.resource.upsert({
      where: {
        name: name as ResourceName,
      },
      update: {
        description: config.description,
      },
      create: {
        name: name as ResourceName,
        description: config.description,
      },
    })
  }

  console.log(`✅ Resources seeded`)

  /*
   * --------------------------------------------------------------------------
   * LOOKUP MAPS
   * --------------------------------------------------------------------------
   */

  const actions = await prisma.action.findMany()

  const resources = await prisma.resource.findMany()

  const headings = await prisma.sidebarHeading.findMany()

  const actionMap = new Map(actions.map((x) => [x.name, x.id]))

  const resourceMap = new Map(resources.map((x) => [x.name, x.id]))

  const headingMap = new Map(headings.map((x) => [x.name, x.id]))

  /*
   * --------------------------------------------------------------------------
   * STANDARD PERMISSIONS
   * --------------------------------------------------------------------------
   */

  for (const [resourceName, config] of Object.entries(RESOURCES)) {
    for (const actionName of config.actions) {
      await prisma.permission.upsert({
        where: {
          actionId_resourceId: {
            actionId: actionMap.get(actionName)!,
            resourceId: resourceMap.get(resourceName as ResourceName)!,
          },
        },

        update: {},

        create: {
          actionId: actionMap.get(actionName)!,
          resourceId: resourceMap.get(resourceName as ResourceName)!,
          category: "STANDARD",
          description: `${actionName} ${resourceName}`,
          isDangerous: actionName === ActionName.delete,
        },
      })
    }
  }

  console.log("✅ Permissions seeded")

  /*
   * --------------------------------------------------------------------------
   * SIDEBAR OPTIONS
   * --------------------------------------------------------------------------
   */

  for (const [resourceName, config] of Object.entries(RESOURCES)) {
    if (!config.sidebar) continue

    await prisma.sidebarOption.upsert({
      where: {
        name: resourceName as ResourceName,
      },

      update: {
        icon: config.sidebar.icon,
        path: config.sidebar.path,
      },

      create: {
        name: resourceName as ResourceName,

        resourceId: resourceMap.get(resourceName as ResourceName)!,

        icon: config.sidebar.icon,

        path: config.sidebar.path,

        sidebarHeadingId: headingMap.get(config.sidebar.heading)!,
      },
    })
  }

  console.log("✅ Sidebar options seeded")

  /*
   * --------------------------------------------------------------------------
   * CUSTOM PERMISSIONS
   * --------------------------------------------------------------------------
   */

  for (const permission of CUSTOM_PERMISSIONS) {
    await prisma.customPermission.upsert({
      where: {
        code: permission.code,
      },

      update: {
        name: permission.name,
        category: permission.category,
        riskLevel: permission.riskLevel,
        requiresApproval: permission.riskLevel === "HIGH",
      },

      create: {
        ...permission,
        description: permission.name,
      },
    })
  }

  console.log(`✅ Custom permissions seeded (${CUSTOM_PERMISSIONS.length})`)
  console.log("🎉 System seed completed")
}

main()
  .catch((error) => {
    console.error("❌ Seed failed")
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
