/**
 * TAKARA STORE ORDER RESOLUTION V1
 * Trusted backend boundary between order payload transport and Store Service.
 */
const TAKARA_ORDER_STORE_RESOLUTION_VERSION = "TAKARA_ORDER_STORE_RESOLUTION_V1";
function orderStoreResolutionError_(code, message) { const error = new Error(message); error.code = code; return error; }
function getOrderStoreContextTransport_(payload) {
  const source = payload || {}; const meta = source.meta || {};
  if (!Object.prototype.hasOwnProperty.call(meta, "store_context")) return null;
  const context = meta.store_context;
  if (!context || typeof context !== "object" || Array.isArray(context)) throw orderStoreResolutionError_("ORDER_STORE_CONTEXT_INVALID", "Invalid StoreContext transport.");
  const keys = Object.keys(context).sort();
  if (keys.join(",") !== "store_ref,version") throw orderStoreResolutionError_("ORDER_STORE_CONTEXT_INVALID", "Unexpected StoreContext fields.");
  if (context.version !== TAKARA_STORE_CONTEXT_VERSION) throw orderStoreResolutionError_("ORDER_STORE_CONTEXT_VERSION_INVALID", "Unsupported StoreContext version.");
  return Object.freeze({ version: TAKARA_STORE_CONTEXT_VERSION, store_ref: assertStorePublicCode_(context.store_ref) });
}
function resolveOrderStoreIdentity_(payload) {
  const transport = getOrderStoreContextTransport_(payload);
  if (transport === null) return null;
  const identity = resolveStoreOrderIdentityRuntime_(transport.store_ref);
  if (!identity || identity.version !== TAKARA_STORE_ORDER_IDENTITY_VERSION || identity.store_ref !== transport.store_ref || identity.status !== TAKARA_STORE_STATUS.ACTIVE) throw orderStoreResolutionError_("ORDER_STORE_RESOLUTION_INVALID", "Store Service returned an invalid order identity.");
  return identity;
}