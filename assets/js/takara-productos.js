/** Catalog presentation. Commercial prices come from catalogo.json. */
(function () {
  "use strict";

  const grid = document.querySelector("[data-products-grid]");
  if (!grid) return;

  const products = [
    {
      id: "marco-vertical", category: "marcos", title: "Marco vertical",
      measure: "Foto 108 × 144 mm", measurePrefix: "Foto ",
      productCode: "MARCO_LITOFANIA_144X108", variantCode: "vertical",
      image: "assets/img/fotos/producto-marco-vertical-familia-card-v18.webp",
      alt: "Marco vertical de litofanía personalizada Takara 3D",
      modifier: "product-tile--vertical", action: "Pedir este formato", href: "pedido.html", fromPrice: true
    },
    {
      id: "marco-horizontal", category: "marcos", title: "Marco horizontal",
      measure: "Foto 144 × 108 mm", measurePrefix: "Foto ",
      productCode: "MARCO_LITOFANIA_144X108", variantCode: "horizontal",
      image: "assets/img/fotos/producto-marco-horizontal-mascota.webp",
      alt: "Marco horizontal de litofanía personalizada Takara 3D",
      modifier: "product-tile--horizontal", action: "Pedir este formato", href: "pedido.html", fromPrice: true
    },
    {
      id: "caja-cuatro-fotos", category: "cajas", title: "Caja de luz · 4 fotos",
      measure: "4 fotos de 100 × 100 mm", measurePrefix: "4 fotos de ",
      productCode: "CAJA_LITOFANIA_4_FOTOS_100X100", variantCode: "cuatro_fotos",
      image: "assets/img/fotos/producto-caja-cuatro-fotos-100x100.png",
      alt: "Caja negra de litofanía personalizada con cuatro fotos y luz cálida",
      modifier: "product-tile--caja", action: "Personalizar esta caja", channel: "configurador", href: "pedido.html?producto=caja",
      description: "Un giro de 360° para iluminar tus recuerdos.", fromPrice: false
    }
  ];
  const buttons = [...document.querySelectorAll("[data-filter]")];
  let filter = "todos";
  let cards = products;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function contactHref(product) {
    const price = product.price && product.price !== "Consultar" ? ` (${product.price})` : "";
    const message = `Hola, me interesa la caja de litofanía de 4 fotos de 100 × 100 mm${price}. ¿Podemos preparar mi pedido?`;
    // Share the existing site's contact destination; never send a message here.
    return `https://wa.me/${TAKARA.whatsappNumber}?text=${encodeURIComponent(message)}`;
  }

  function productCard(product) {
    const article = element("article", `product-tile ${product.modifier}`);
    article.id = product.id;
    article.dataset.category = product.category;
    const media = element("div", "product-tile__media");
    const image = element("img");
    image.src = product.image;
    image.alt = product.alt;
    image.loading = "lazy";
    image.decoding = "async";
    media.append(image);
    const body = element("div", "product-tile__body");
    body.append(element("p", "product-tile__status", "Disponible"), element("h3", "", product.title),
      element("p", "product-tile__measure", product.measure));
    if (product.description) body.append(element("p", "product-tile__description", product.description));
    if (product.price) {
      const price = element("div", "product-tile__price-group");
      if (product.fromPrice && product.price !== "Consultar") price.append(element("p", "product-tile__price-label", "Desde"));
      price.append(element("p", "product-tile__price", product.price));
      body.append(price);
    }
    const action = element("a", "btn btn--primary", product.action);
    action.href = product.channel === "whatsapp" ? contactHref(product) : product.href;
    if (product.channel === "whatsapp") {
      action.setAttribute("aria-label", "Consultar esta caja de cuatro fotos por WhatsApp");
      action.target = "_blank";
      action.rel = "noopener noreferrer";
    }
    body.append(action);
    article.append(media, body);
    return article;
  }

  function renderTakaraProducts() {
    grid.replaceChildren(...cards.filter(product => filter === "todos" || product.category === filter).map(productCard));
    grid.dataset.takaraProductsRendered = "true";
    grid.dataset.takaraCurrentFilter = filter;
    for (const button of buttons) {
      const active = button.dataset.filter === filter;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
      button.dataset.takaraFilterActive = String(active);
    }
  }

  for (const button of buttons) {
    button.addEventListener("click", () => {
      filter = button.dataset.filter;
      renderTakaraProducts();
    });
  }
  renderTakaraProducts();
  window.TAKARA_CATALOGO_CORE_V1.loadCatalog().then(catalog => {
    cards = products.map(product => {
      const canonical = window.TAKARA_CATALOGO_CORE_V1.getProduct(catalog, product.productCode);
      if (product.category === "cajas" && (canonical.pedido.canal !== "formulario_web" || canonical.pedido.configurador_disponible !== true)) {
        throw new Error("Revisa el canal de pedido de la caja antes de publicarla.");
      }
      const pricing = window.TAKARA_PRICING_V1.calculate({
        catalog, product_code: product.productCode, variant_code: product.variantCode, extra_codes: [], quantity: 1
      });
      return { ...product, title: pricing.variante_nombre,
        measure: product.measurePrefix + pricing.medida.replace(/ x /g, " × "), price: pricing.precio_visible,
        image: canonical.imagenes[product.variantCode] || canonical.imagenes.principal,
        description: product.channel === "whatsapp" ? canonical.descripcion_corta : product.description };
    });
    renderTakaraProducts();
  }).catch(error => {
    console.error("[Takara productos] No se pudo cargar el catálogo.", error);
    cards = products.map(product => ({ ...product, price: "Consultar", ...(product.category === "cajas" ? { channel: "whatsapp", action: "Consultar esta caja" } : {}) }));
    renderTakaraProducts();
  });
}());
