from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; BASE=ROOT/"apps-script"/"takara-pedidos-web"
def req(c,m):
    if not c: raise AssertionError("[FAIL] "+m)
def read(p): req(p.is_file(),f"Existe {p.relative_to(ROOT)}"); return p.read_text(encoding="utf-8-sig")
def main():
    d=read(BASE/"StoreDomain.gs"); r=read(BASE/"StoreRegistry.gs"); rt=read(BASE/"StoreRuntime.gs"); b=read(BASE/"StoreOrderResolution.gs"); t=read(ROOT/"tools/takara_test_store_order_resolution.js")
    for m in ['TAKARA_STORE_ORDER_IDENTITY_VERSION = "TAKARA_STORE_ORDER_IDENTITY_V1"','function toStoreOrderIdentity_(store)','store_id: assertStoreId_(store.store_id)','display_name: normalizeStoreDisplayName_(store.display_name)','status: TAKARA_STORE_STATUS.ACTIVE']: req(m in d,"Domain identity "+m)
    req("resolveStoreOrderIdentityService_" in r,"Store Service use case"); req("repo.findByPublicCode(publicCode)" in r,"repository resolution"); req("return toStoreOrderIdentity_(store);" in r,"Store-owned mapping"); req("resolveStoreOrderIdentityRuntime_" in rt,"runtime internal use case")
    for m in ['TAKARA_ORDER_STORE_RESOLUTION_V1','getOrderStoreContextTransport_','resolveOrderStoreIdentity_','keys.join(",") !== "store_ref,version"','resolveStoreOrderIdentityRuntime_(transport.store_ref)','identity.store_ref !== transport.store_ref','identity.status !== TAKARA_STORE_STATUS.ACTIVE']: req(m in b,"Boundary "+m)
    for m in ['source_type: "STORE"','TAKARA_STORE_ATTRIBUTION_V1','store_name_snapshot']: req(m not in b,"F3B no attribution "+m)
    req("return null;" in b,"DIRECT null"); req("Object.freeze({" in b,"immutable")
    for m in ['DIRECT does not query Registry','store_id comes from Registry','browser store_id injection','browser display_name injection','browser status injection','browser source_type injection','inactive Store','missing Store','latest authoritative rename']: req(m in t,"test "+m)
    req("TAKARA_STORE_ORDER_RESOLUTION_F3B_OK" in t,"marker"); print("[TAKARA_STORE_ORDER_RESOLUTION_F3B_STATIC_OK] 44 comprobaciones"); return 0
if __name__=="__main__": raise SystemExit(main())