# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tienda: Somos-Cosmos

Tema Shopify para la tienda `7ve3de-yc.myshopify.com`. Repo GitHub: `Breitner96/cosmos-template`.

## Comandos Shopify CLI

```bash
# Ejecutar desde la raíz del tema (cosmos-template/)
shopify theme push        # sube cambios al tema activo en Shopify
shopify theme dev         # preview en desarrollo con hot reload
shopify theme pull        # trae cambios del admin al repo
```

## Arquitectura del tema

### Flujo de renderizado

```
layout/theme.liquid          ← wrapper HTML principal (head, fonts, CSS vars, scripts globales)
  └── sections/{nombre}.liquid ← secciones de contenido por página
        └── snippets/{nombre}.liquid ← fragmentos reutilizables vía {% render %}
```

`templates/*.json` definen qué secciones se cargan en cada página. Son **auto-generados por el editor Shopify** — el contenido HTML/CSS personalizado se inyecta como bloques `custom_liquid` dentro del JSON; editar directamente puede ser sobreescrito desde el admin.

### Plantillas de producto activas

Cada `product.*.json` es una landing page independiente para una campaña:

| Archivo | Campaña |
|---------|---------|
| `product.json` | Plantilla base |
| `product.caramela-beauty.json` / `product.caramela-v2.json` | Caramela Beauty |
| `product.Producto-USA.json` | Mercado USA |
| `product.product-10x.json` | Campaña 10x |
| `product.zapatos-50.json` | Zapatos 50% descuento |
| `product.zapatos-2x1.json` / `product.zapatos-2x1-timberland-ar.json` | Zapatos 2x1 |

### Secciones clave

- `sections/main-product.liquid` — núcleo de todas las páginas de producto; contiene lógica de variantes, galería, botones de compra y bloques extensibles
- `sections/cart-drawer.liquid` — carrito lateral con upsells (`snippets/cart-first-upsell.liquid`, `snippets/cart-second-upsell.liquid`)
- `sections/header.liquid` / `sections/footer.liquid` — cabecera y pie globales (configurados vía `header-group.json` / `footer-group.json`)
- `sections/custom-liquid.liquid` — bloque para insertar HTML/CSS/JS arbitrario desde el admin

### Assets (CSS/JS)

Organizados por componente en `assets/`:
- `base.css` — estilos base globales
- `component-*.css` / `section-*.css` — estilos por componente o sección
- `constants.js`, `global.js`, `pubsub.js`, `custom.js` — framework JS del tema
- `cart-*.js` / `product-*.js` — lógica de carrito y producto

### Snippets importantes

- `card-product.liquid` — tarjeta de producto usada en colecciones y búsqueda
- `product-variant-picker.liquid` — selector de variantes (talla, color)
- `price.liquid` — muestra precio con lógica de descuentos
- `buy-buttons.liquid` — botones "Agregar al carrito" / "Comprar ahora"
- `meta-tags.liquid` — inyección de SEO meta tags

### Configuración del tema

- `config/settings_schema.json` — define todas las opciones personalizables del tema (colores, tipografía, layout, carrito, insignias)
- `config/settings_data.json` — valores actuales de esas opciones

### Internacionalización

`locales/` contiene 26+ idiomas. El idioma principal es `en.default.json`; las claves de schema están en `*.schema.json`.

## Patrón de personalización

El patrón principal para customizar páginas de producto es:
1. Crear/editar un bloque `custom_liquid` dentro de `sections/main-product.liquid` vía el admin de Shopify, o
2. Editar directamente el HTML/CSS/JS embebido en el bloque `custom_liquid` del archivo `templates/product.*.json`.

Los archivos `.json` de templates tienen la forma:
```json
{
  "sections": {
    "main": {
      "type": "main-product",
      "blocks": {
        "custom_liquid_id": {
          "type": "custom_liquid",
          "settings": { "custom_liquid": "<html>...</html>" }
        }
      }
    }
  }
}
```
