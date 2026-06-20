"use strict";

async function loadProducts() {
  const grid = document.querySelector("[data-products-grid]");
  const filters = Array.from(document.querySelectorAll("[data-filter]"));

  if (!grid) return;

  try {
    const response = await fetch("data/productos.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const products = await response.json();

    function render(category = "todos") {
      const filtered = category === "todos"
        ? products
        : products.filter((product) => product.categoria === category);

      grid.innerHTML = filtered.map((product) => `
        <article class="card product-card" data-product-card="${product.id}">
          <div class="product-card__image">
            <img src="${product.imagen}" alt="${product.nombre}" loading="lazy">
          </div>
          <div class="product-card__body">
            <h3>${product.nombre}</h3>
            <p>${product.descripcion}</p>
            <ul class="clean-list">
              ${product.features.map((feature) => `<li>${feature}</li>`).join("")}
            </ul>
            <p class="price">Desde <strong>${product.precio}</strong></p>
            <a class="btn btn--primary btn--wide" href="pedido.html?producto=${encodeURIComponent(product.id)}">Ver detalle</a>
          </div>
        </article>
      `).join("");
    }

    filters.forEach((button) => {
      button.addEventListener("click", () => {
        filters.forEach((item) => item.classList.remove("is-active"));
        button.classList.add("is-active");
        render(button.dataset.filter || "todos");
      });
    });

    render("todos");
  } catch (error) {
    console.error("[Takara] Error cargando productos:", error);
    grid.innerHTML = `
      <div class="card info-panel">
        <h3>No se ha podido cargar el catálogo</h3>
        <p class="lead">Revisa que <code>data/productos.json</code> exista y que GitHub Pages lo esté sirviendo correctamente.</p>
      </div>
    `;
  }
}

document.addEventListener("DOMContentLoaded", loadProducts);
