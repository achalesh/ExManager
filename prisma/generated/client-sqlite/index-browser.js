
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  Serializable: 'Serializable'
});

exports.Prisma.EventScalarFieldEnum = {
  id: 'id',
  name: 'name',
  location: 'location',
  startDate: 'startDate',
  endDate: 'endDate',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TicketInventoryScalarFieldEnum = {
  id: 'id',
  eventId: 'eventId',
  seriesLabel: 'seriesLabel',
  startNumber: 'startNumber',
  endNumber: 'endNumber',
  currentNumber: 'currentNumber',
  status: 'status',
  price: 'price',
  category: 'category',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StaffScalarFieldEnum = {
  id: 'id',
  name: 'name',
  age: 'age',
  dob: 'dob',
  address: 'address',
  contactNo: 'contactNo',
  secContact: 'secContact',
  adharNumber: 'adharNumber',
  photoUrl: 'photoUrl',
  department: 'department',
  eventId: 'eventId',
  userId: 'userId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StaffTicketAssignmentScalarFieldEnum = {
  id: 'id',
  staffId: 'staffId',
  ticketInventoryId: 'ticketInventoryId',
  ticketTypeId: 'ticketTypeId',
  seriesLabel: 'seriesLabel',
  startNumber: 'startNumber',
  endNumber: 'endNumber',
  assignedCount: 'assignedCount',
  assignedDate: 'assignedDate',
  status: 'status',
  returnDate: 'returnDate',
  returnedCount: 'returnedCount',
  soldCount: 'soldCount',
  totalAmount: 'totalAmount',
  cashReceived: 'cashReceived',
  upiReceived: 'upiReceived',
  difference: 'difference',
  remarks: 'remarks',
  isSettled: 'isSettled',
  settlementDate: 'settlementDate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SpaceCategoryScalarFieldEnum = {
  id: 'id',
  name: 'name',
  price: 'price',
  shape: 'shape',
  dimensions: 'dimensions',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SpaceScalarFieldEnum = {
  id: 'id',
  label: 'label',
  eventId: 'eventId',
  categoryId: 'categoryId',
  positionX: 'positionX',
  positionY: 'positionY',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ExhibitorScalarFieldEnum = {
  id: 'id',
  name: 'name',
  faciaName: 'faciaName',
  productCategory: 'productCategory',
  idProof: 'idProof',
  contact: 'contact',
  phone: 'phone',
  secondaryPhone: 'secondaryPhone',
  address: 'address',
  advancePaid: 'advancePaid',
  isPhysicalFormSubmitted: 'isPhysicalFormSubmitted',
  email: 'email',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BookingScalarFieldEnum = {
  id: 'id',
  eventId: 'eventId',
  spaceId: 'spaceId',
  exhibitorId: 'exhibitorId',
  bookedAt: 'bookedAt',
  totalAmount: 'totalAmount',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  username: 'username',
  password: 'password',
  name: 'name',
  email: 'email',
  roleId: 'roleId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RoleScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  permissions: 'permissions',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SessionScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  activeEventId: 'activeEventId',
  token: 'token',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MaterialScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  price: 'price',
  unit: 'unit',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MaterialItemScalarFieldEnum = {
  id: 'id',
  materialId: 'materialId',
  uniqueCode: 'uniqueCode',
  status: 'status',
  activeAllocationId: 'activeAllocationId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ElectricalItemScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  price: 'price',
  wattage: 'wattage',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ShedScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  dimensions: 'dimensions',
  price: 'price',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MaterialAllocationScalarFieldEnum = {
  id: 'id',
  exhibitorId: 'exhibitorId',
  materialId: 'materialId',
  quantity: 'quantity',
  totalPrice: 'totalPrice',
  eventId: 'eventId',
  isFOC: 'isFOC',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ElectricalAllocationScalarFieldEnum = {
  id: 'id',
  exhibitorId: 'exhibitorId',
  electricalItemId: 'electricalItemId',
  quantity: 'quantity',
  totalPrice: 'totalPrice',
  totalWattage: 'totalWattage',
  eventId: 'eventId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ShedAllocationScalarFieldEnum = {
  id: 'id',
  exhibitorId: 'exhibitorId',
  shedId: 'shedId',
  price: 'price',
  eventId: 'eventId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TicketTypeScalarFieldEnum = {
  id: 'id',
  eventId: 'eventId',
  category: 'category',
  name: 'name',
  price: 'price',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TicketBatchScalarFieldEnum = {
  id: 'id',
  ticketTypeId: 'ticketTypeId',
  startNumber: 'startNumber',
  endNumber: 'endNumber',
  currentNumber: 'currentNumber',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TicketSaleScalarFieldEnum = {
  id: 'id',
  eventId: 'eventId',
  totalAmount: 'totalAmount',
  source: 'source',
  createdAt: 'createdAt'
};

exports.Prisma.TicketSaleItemScalarFieldEnum = {
  id: 'id',
  saleId: 'saleId',
  ticketTypeId: 'ticketTypeId',
  ticketNumber: 'ticketNumber',
  price: 'price'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  eventId: 'eventId',
  userId: 'userId',
  action: 'action',
  details: 'details',
  createdAt: 'createdAt'
};

exports.Prisma.InvoiceScalarFieldEnum = {
  id: 'id',
  invoiceNumber: 'invoiceNumber',
  exhibitorId: 'exhibitorId',
  eventId: 'eventId',
  spaceTotal: 'spaceTotal',
  materialTotal: 'materialTotal',
  electricalTotal: 'electricalTotal',
  shedTotal: 'shedTotal',
  subtotal: 'subtotal',
  taxAmount: 'taxAmount',
  discountAmount: 'discountAmount',
  grandTotal: 'grandTotal',
  status: 'status',
  dueDate: 'dueDate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PaymentScalarFieldEnum = {
  id: 'id',
  receiptNumber: 'receiptNumber',
  exhibitorId: 'exhibitorId',
  invoiceId: 'invoiceId',
  amount: 'amount',
  paymentMethod: 'paymentMethod',
  referenceNumber: 'referenceNumber',
  paymentDate: 'paymentDate',
  category: 'category',
  notes: 'notes',
  collectedBy: 'collectedBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TransactionScalarFieldEnum = {
  id: 'id',
  eventId: 'eventId',
  type: 'type',
  category: 'category',
  amount: 'amount',
  paymentMethod: 'paymentMethod',
  description: 'description',
  transactionDate: 'transactionDate',
  recordedBy: 'recordedBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};


exports.Prisma.ModelName = {
  Event: 'Event',
  TicketInventory: 'TicketInventory',
  Staff: 'Staff',
  StaffTicketAssignment: 'StaffTicketAssignment',
  SpaceCategory: 'SpaceCategory',
  Space: 'Space',
  Exhibitor: 'Exhibitor',
  Booking: 'Booking',
  User: 'User',
  Role: 'Role',
  Session: 'Session',
  Material: 'Material',
  MaterialItem: 'MaterialItem',
  ElectricalItem: 'ElectricalItem',
  Shed: 'Shed',
  MaterialAllocation: 'MaterialAllocation',
  ElectricalAllocation: 'ElectricalAllocation',
  ShedAllocation: 'ShedAllocation',
  TicketType: 'TicketType',
  TicketBatch: 'TicketBatch',
  TicketSale: 'TicketSale',
  TicketSaleItem: 'TicketSaleItem',
  AuditLog: 'AuditLog',
  Invoice: 'Invoice',
  Payment: 'Payment',
  Transaction: 'Transaction'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
