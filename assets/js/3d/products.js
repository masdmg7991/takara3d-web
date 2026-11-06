/** Product capabilities drive the form. Rendering remains in ProductViewer. */
import { MARCO_PRODUCT } from "./marco-product.js?v=back-normals-1";
import { CAJA_PRODUCT, CAJA_FACES } from "./caja-product.js";

export const PRODUCTS = Object.freeze({
  marco: Object.freeze({ key: "marco", code: MARCO_PRODUCT.id, title: "Marco", profile: MARCO_PRODUCT,
    photoFaces: Object.freeze(["frontal"]), hasFormat: true, hasText: true, defaultColor: "actual" }),
  caja: Object.freeze({ key: "caja", code: CAJA_PRODUCT.id, title: "Caja de luz · 4 fotos", profile: CAJA_PRODUCT,
    photoFaces: CAJA_FACES, hasFormat: false, hasText: false, defaultColor: "negro" })
});

export class ProductDrafts {
  constructor(products = PRODUCTS) {
    this.products = products;
    this.current = "marco";
    this.drafts = new Map(Object.entries(products).map(([key, product]) => [key, Object.freeze({ ...product.profile.defaults })]));
  }
  get product() { return this.products[this.current]; }
  get state() { return this.drafts.get(this.current); }
  select(key) {
    if (!Object.hasOwn(this.products, key)) throw new RangeError("Producto desconocido.");
    this.current = key;
    return this.state;
  }
  update(patch) {
    const state = Object.freeze({ ...this.state, ...patch });
    this.product.profile.validate?.(state);
    this.drafts.set(this.current, state);
    return state;
  }
}
