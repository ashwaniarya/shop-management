import type {
  AuthUser,
  Category,
  CategoryCreate,
  CategoryUpdate,
  InventoryItem,
  InventoryItemUpdate,
  InvoiceCreate,
  InvoiceDetail,
  InvoiceListItem,
  LoginResponse,
  Register,
  Manufacturer,
  ManufacturerCreate,
  ManufacturerUpdate,
  Meta,
  Part,
  PartCreate,
  PartCrossReference,
  PartCrossReferenceCreate,
  PartFitment,
  PartFitmentCreate,
  PartGrade,
  PartGradeCreate,
  PartGradeUpdate,
  PartUpdate,
  Shop,
  ShopCreate,
  ShopUpdate,
  StockTransaction,
  StockTransactionCreate,
  StockTransactionType,
  Supplier,
  SupplierCreate,
  SupplierPart,
  SupplierPartCreate,
  SupplierPartUpdate,
  SupplierUpdate,
  User,
  UserCreate,
  UserUpdate,
  VehicleClass,
  VehicleClassCreate,
  VehicleClassUpdate,
  VehicleMake,
  VehicleMakeCreate,
  VehicleMakeUpdate,
  VehicleModel,
  VehicleModelCreate,
  VehicleModelUpdate,
} from '@shop/shared';

import { clearAuthToken, getAuthToken } from '@/lib/authToken';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const API_PREFIX = '/api/v1';

export interface Paginated<T> {
  data: T[];
  meta: Meta;
}

interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = payload.code;
    this.details = payload.details;
  }
}

type QueryValue = string | number | boolean | undefined;
// `any`-valued on purpose: this is the boundary type every resource function's own
// (fully-typed) *Params interface gets passed through as. A Record<string, QueryValue>
// index signature would reject those interfaces outright ("index signature missing"),
// since plain interfaces don't structurally carry one — only Record<string, any> does.
type QueryParams = Record<string, any>;

function buildQueryString(params?: QueryParams): string {
  if (!params) {
    return '';
  }
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params) as [string, QueryValue][]) {
    if (value !== undefined) {
      searchParams.set(key, String(value));
    }
  }
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

interface RequestOptions {
  query?: QueryParams;
  body?: unknown;
}

const LOGIN_PATH = '/auth/login';

function buildRequestHeaders(hasBody: boolean): HeadersInit | undefined {
  const headers: Record<string, string> = {};
  if (hasBody) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return Object.keys(headers).length > 0 ? headers : undefined;
}

// A 401 means the stored token is missing/expired/invalid, except on the login
// call itself (a 401 there just means "wrong username/PIN" and must surface as
// a normal ApiError to the login form). Everywhere else, drop the dead token and
// hard-redirect to /login — skipping the redirect when already there avoids a
// reload loop if some in-flight request 401s right as the login page mounts.
export function decideUnauthorizedAction(
  method: string,
  path: string,
  currentPathname: string,
): { clearToken: boolean; redirect: boolean } {
  if (method === 'POST' && path === LOGIN_PATH) {
    return { clearToken: false, redirect: false };
  }
  return { clearToken: true, redirect: currentPathname !== '/login' };
}

function handleUnauthorizedResponse(method: string, path: string): void {
  const currentPathname = typeof window !== 'undefined' ? window.location.pathname : '/login';
  const { clearToken, redirect } = decideUnauthorizedAction(method, path, currentPathname);
  if (clearToken) {
    clearAuthToken();
  }
  if (redirect && typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const url = `${API_BASE_URL}${API_PREFIX}${path}${buildQueryString(options.query)}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: buildRequestHeaders(options.body !== undefined),
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch (cause) {
    throw new ApiError(0, {
      code: 'NETWORK_ERROR',
      message: cause instanceof Error ? cause.message : 'Network request failed',
    });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await response.json().catch(() => undefined);

  if (!response.ok) {
    const errorPayload: ApiErrorPayload = payload?.error ?? {
      code: 'UNKNOWN_ERROR',
      message: response.statusText || `Request failed with status ${response.status}`,
    };
    if (response.status === 401) {
      handleUnauthorizedResponse(method, path);
    }
    throw new ApiError(response.status, errorPayload);
  }

  return payload as T;
}

export function get<T>(path: string, query?: QueryParams): Promise<T> {
  return request<T>('GET', path, { query });
}

export function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>('POST', path, { body });
}

export function patch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>('PATCH', path, { body });
}

export function put<T>(path: string, body?: unknown): Promise<T> {
  return request<T>('PUT', path, { body });
}

export function del<T = void>(path: string): Promise<T> {
  return request<T>('DELETE', path);
}

function list<T>(path: string, query?: QueryParams): Promise<Paginated<T>> {
  return get<Paginated<T>>(path, query);
}

// The following DTOs are API-only projections with no zod schema in @shop/shared
// (they add display-only fields, like a joined name, on top of a shared shape).
export type InventoryRow = InventoryItem & {
  part: { sku: string; name: string; manufacturerName: string };
};

export type PartFitmentExpanded = PartFitment & {
  vehicleClassName: string;
  vehicleMakeName: string | null;
  vehicleModelName: string | null;
};

export type SupplierPartExpanded = SupplierPart & { supplierName: string };

export type InventoryItemExpanded = InventoryItem & { shopName: string };

export type PartSearchMatchedBy = 'SKU' | 'MPN' | 'CROSS_REFERENCE' | 'SUPPLIER_NUMBER';

export type PartSearchResult = Part & {
  matchedBy: PartSearchMatchedBy;
  matchedNumber: string;
};

export type PartIncludeValue = 'fitments' | 'crossReferences' | 'suppliers' | 'inventory';

export type Part360 = Part & {
  fitments?: PartFitmentExpanded[];
  crossReferences?: PartCrossReference[];
  suppliers?: SupplierPartExpanded[];
  inventory?: InventoryItemExpanded[];
};

export type PartFamilyMember = Part & {
  gradeName: string | null;
  quantityOnHand?: number | null;
  sellingPrice?: number | null;
};

export type PartFamily = {
  original: PartFamilyMember;
  copies: PartFamilyMember[];
};

export interface TransactionSummary {
  sales: { count: number; quantity: number; revenue: number };
  purchases: { count: number; quantity: number; cost: number };
  adjustments: { count: number; quantity: number };
}

// --- Auth --------------------------------------------------------------------------

export function login(username: string, pin: string): Promise<LoginResponse> {
  return post<LoginResponse>('/auth/login', { username, pin });
}

export function register(input: Register): Promise<LoginResponse> {
  return post<LoginResponse>('/auth/register', input);
}

export function getMe(): Promise<AuthUser> {
  return get<AuthUser>('/auth/me');
}

export function logout(): Promise<void> {
  return post<void>('/auth/logout');
}

// --- Parts -----------------------------------------------------------------------

export interface ListPartsParams extends PaginationParams {
  q?: string;
  categoryId?: number;
  manufacturerId?: number;
  gradeId?: number;
  isActive?: boolean;
  vehicleClassId?: number;
  vehicleMakeId?: number;
  vehicleModelId?: number;
}

export function listParts(params?: ListPartsParams): Promise<Paginated<Part>> {
  return list<Part>('/parts', params);
}

export function createPart(body: PartCreate): Promise<Part> {
  return post<Part>('/parts', body);
}

export function updatePart(id: number, body: PartUpdate): Promise<Part> {
  return patch<Part>(`/parts/${id}`, body);
}

export function softDeletePart(id: number): Promise<void> {
  return del(`/parts/${id}`);
}

export function searchPartsByNumber(number: string, params?: PaginationParams): Promise<Paginated<PartSearchResult>> {
  return list<PartSearchResult>('/parts/search', { ...params, number });
}

export function getPart360(id: number, include?: PartIncludeValue[]): Promise<Part360> {
  return get<Part360>(`/parts/${id}`, include?.length ? { include: include.join(',') } : undefined);
}

export function getPartFamily(partId: number, shopId?: number): Promise<PartFamily> {
  return get<PartFamily>(`/parts/${partId}/family`, { shopId });
}

export function listPartFitments(partId: number, params?: PaginationParams): Promise<Paginated<PartFitment>> {
  return list<PartFitment>(`/parts/${partId}/fitments`, params);
}

export function createPartFitment(partId: number, body: PartFitmentCreate): Promise<PartFitment> {
  return post<PartFitment>(`/parts/${partId}/fitments`, body);
}

export function deletePartFitment(partId: number, fitmentId: number): Promise<void> {
  return del(`/parts/${partId}/fitments/${fitmentId}`);
}

export function listPartCrossReferences(
  partId: number,
  params?: PaginationParams,
): Promise<Paginated<PartCrossReference>> {
  return list<PartCrossReference>(`/parts/${partId}/cross-references`, params);
}

export function createPartCrossReference(
  partId: number,
  body: PartCrossReferenceCreate,
): Promise<PartCrossReference> {
  return post<PartCrossReference>(`/parts/${partId}/cross-references`, body);
}

export function deletePartCrossReference(partId: number, crossReferenceId: number): Promise<void> {
  return del(`/parts/${partId}/cross-references/${crossReferenceId}`);
}

export function listPartSuppliers(partId: number, params?: PaginationParams): Promise<Paginated<SupplierPart>> {
  return list<SupplierPart>(`/parts/${partId}/suppliers`, params);
}

export function createPartSupplier(partId: number, body: SupplierPartCreate): Promise<SupplierPart> {
  return post<SupplierPart>(`/parts/${partId}/suppliers`, body);
}

export function updatePartSupplier(
  partId: number,
  supplierPartId: number,
  body: SupplierPartUpdate,
): Promise<SupplierPart> {
  return patch<SupplierPart>(`/parts/${partId}/suppliers/${supplierPartId}`, body);
}

export function deletePartSupplier(partId: number, supplierPartId: number): Promise<void> {
  return del(`/parts/${partId}/suppliers/${supplierPartId}`);
}

// --- Manufacturers -----------------------------------------------------------------

export function listManufacturers(params?: PaginationParams): Promise<Paginated<Manufacturer>> {
  return list<Manufacturer>('/manufacturers', params);
}

export function createManufacturer(body: ManufacturerCreate): Promise<Manufacturer> {
  return post<Manufacturer>('/manufacturers', body);
}

export function updateManufacturer(id: number, body: ManufacturerUpdate): Promise<Manufacturer> {
  return patch<Manufacturer>(`/manufacturers/${id}`, body);
}

export function softDeleteManufacturer(id: number): Promise<void> {
  return del(`/manufacturers/${id}`);
}

// --- Categories ----------------------------------------------------------------------

export interface ListCategoriesParams extends PaginationParams {
  parentId?: number;
  tree?: boolean;
}

export function listCategories(params?: ListCategoriesParams): Promise<Paginated<Category>> {
  return list<Category>('/categories', params);
}

export function createCategory(body: CategoryCreate): Promise<Category> {
  return post<Category>('/categories', body);
}

export function updateCategory(id: number, body: CategoryUpdate): Promise<Category> {
  return patch<Category>(`/categories/${id}`, body);
}

// Categories have no isActive flag, so this is a real hard delete: the API responds
// 409 if the category still has child categories or parts assigned to it.
export function deleteCategory(id: number): Promise<void> {
  return del(`/categories/${id}`);
}

// --- Part Grades ---------------------------------------------------------------------

export function listPartGrades(params?: PaginationParams): Promise<Paginated<PartGrade>> {
  return list<PartGrade>('/part-grades', params);
}

export function createPartGrade(body: PartGradeCreate): Promise<PartGrade> {
  return post<PartGrade>('/part-grades', body);
}

export function updatePartGrade(id: number, body: PartGradeUpdate): Promise<PartGrade> {
  return patch<PartGrade>(`/part-grades/${id}`, body);
}

export function softDeletePartGrade(id: number): Promise<void> {
  return del(`/part-grades/${id}`);
}

// --- Suppliers -----------------------------------------------------------------------

export function listSuppliers(params?: PaginationParams): Promise<Paginated<Supplier>> {
  return list<Supplier>('/suppliers', params);
}

export function createSupplier(body: SupplierCreate): Promise<Supplier> {
  return post<Supplier>('/suppliers', body);
}

export function updateSupplier(id: number, body: SupplierUpdate): Promise<Supplier> {
  return patch<Supplier>(`/suppliers/${id}`, body);
}

export function softDeleteSupplier(id: number): Promise<void> {
  return del(`/suppliers/${id}`);
}

// --- Vehicle Classes -------------------------------------------------------------------

export function listVehicleClasses(params?: PaginationParams): Promise<Paginated<VehicleClass>> {
  return list<VehicleClass>('/vehicle-classes', params);
}

export function createVehicleClass(body: VehicleClassCreate): Promise<VehicleClass> {
  return post<VehicleClass>('/vehicle-classes', body);
}

export function updateVehicleClass(id: number, body: VehicleClassUpdate): Promise<VehicleClass> {
  return patch<VehicleClass>(`/vehicle-classes/${id}`, body);
}

export function softDeleteVehicleClass(id: number): Promise<void> {
  return del(`/vehicle-classes/${id}`);
}

// --- Vehicle Makes ---------------------------------------------------------------------

export function listVehicleMakes(params?: PaginationParams): Promise<Paginated<VehicleMake>> {
  return list<VehicleMake>('/vehicle-makes', params);
}

export function createVehicleMake(body: VehicleMakeCreate): Promise<VehicleMake> {
  return post<VehicleMake>('/vehicle-makes', body);
}

export function updateVehicleMake(id: number, body: VehicleMakeUpdate): Promise<VehicleMake> {
  return patch<VehicleMake>(`/vehicle-makes/${id}`, body);
}

export function softDeleteVehicleMake(id: number): Promise<void> {
  return del(`/vehicle-makes/${id}`);
}

// --- Vehicle Models --------------------------------------------------------------------

export interface ListVehicleModelsParams extends PaginationParams {
  makeId?: number;
  classId?: number;
}

export function listVehicleModels(params?: ListVehicleModelsParams): Promise<Paginated<VehicleModel>> {
  return list<VehicleModel>('/vehicle-models', params);
}

export function createVehicleModel(body: VehicleModelCreate): Promise<VehicleModel> {
  return post<VehicleModel>('/vehicle-models', body);
}

export function updateVehicleModel(id: number, body: VehicleModelUpdate): Promise<VehicleModel> {
  return patch<VehicleModel>(`/vehicle-models/${id}`, body);
}

export function softDeleteVehicleModel(id: number): Promise<void> {
  return del(`/vehicle-models/${id}`);
}

// --- Shops ------------------------------------------------------------------------------

export function listShops(params?: PaginationParams): Promise<Paginated<Shop>> {
  return list<Shop>('/shops', params);
}

export function createShop(body: ShopCreate): Promise<Shop> {
  return post<Shop>('/shops', body);
}

export function updateShop(id: number, body: ShopUpdate): Promise<Shop> {
  return patch<Shop>(`/shops/${id}`, body);
}

export function softDeleteShop(id: number): Promise<void> {
  return del(`/shops/${id}`);
}

// --- Shop Users --------------------------------------------------------------------------

export function listShopUsers(shopId: number, params?: PaginationParams): Promise<Paginated<User>> {
  return list<User>(`/shops/${shopId}/users`, params);
}

export function createShopUser(shopId: number, body: UserCreate): Promise<User> {
  return post<User>(`/shops/${shopId}/users`, body);
}

export function updateShopUser(shopId: number, id: number, body: UserUpdate): Promise<User> {
  return patch<User>(`/shops/${shopId}/users/${id}`, body);
}

export function softDeleteShopUser(shopId: number, id: number): Promise<void> {
  return del(`/shops/${shopId}/users/${id}`);
}

// --- Inventory --------------------------------------------------------------------------

export interface ListInventoryParams extends PaginationParams {
  belowReorder?: boolean;
  categoryId?: number;
  q?: string;
}

export function listInventory(shopId: number, params?: ListInventoryParams): Promise<Paginated<InventoryRow>> {
  return list<InventoryRow>(`/shops/${shopId}/inventory`, params);
}

export function getInventoryItem(shopId: number, partId: number): Promise<InventoryItem> {
  return get<InventoryItem>(`/shops/${shopId}/inventory/${partId}`);
}

export function upsertInventoryItem(
  shopId: number,
  partId: number,
  body: InventoryItemUpdate,
): Promise<InventoryItem> {
  return put<InventoryItem>(`/shops/${shopId}/inventory/${partId}`, body);
}

// --- Stock Transactions ------------------------------------------------------------------

export interface ListStockTransactionsParams extends PaginationParams {
  type?: StockTransactionType;
  partId?: number;
  userId?: number;
  from?: string;
  to?: string;
}

export function listStockTransactions(
  shopId: number,
  params?: ListStockTransactionsParams,
): Promise<Paginated<StockTransaction>> {
  return list<StockTransaction>(`/shops/${shopId}/stock-transactions`, params);
}

export function createStockTransaction(shopId: number, body: StockTransactionCreate): Promise<StockTransaction> {
  return post<StockTransaction>(`/shops/${shopId}/stock-transactions`, body);
}

export interface TransactionsSummaryParams {
  from?: string;
  to?: string;
}

export function getTransactionsSummary(
  shopId: number,
  params?: TransactionsSummaryParams,
): Promise<TransactionSummary> {
  return get<TransactionSummary>(`/shops/${shopId}/stock-transactions/summary`, params);
}

// --- Invoices --------------------------------------------------------------------------

export interface ListInvoicesParams extends PaginationParams {
  from?: string;
  to?: string;
  q?: string;
}

export function listInvoices(shopId: number, params?: ListInvoicesParams): Promise<Paginated<InvoiceListItem>> {
  return list<InvoiceListItem>(`/shops/${shopId}/invoices`, params);
}

export function createInvoice(shopId: number, body: InvoiceCreate): Promise<InvoiceDetail> {
  return post<InvoiceDetail>(`/shops/${shopId}/invoices`, body);
}

export function getInvoice(shopId: number, id: number): Promise<InvoiceDetail> {
  return get<InvoiceDetail>(`/shops/${shopId}/invoices/${id}`);
}
