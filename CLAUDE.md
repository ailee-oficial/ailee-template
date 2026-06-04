# CLAUDE.md — ailee-template

Tema Shopify para la tienda `ailee-6717.myshopify.com`. Repo GitHub: `Breitner96/ailee-template`.

## Comandos Shopify CLI

```bash
# Ejecutar desde la raíz del tema (ailee-template/)
shopify theme push        # sube cambios al tema activo en Shopify
shopify theme dev         # preview en desarrollo con hot reload
shopify theme pull        # trae cambios del admin al repo
```

## Identidad visual AILÉE

| Elemento | Valor |
|----------|-------|
| Color principal | CAMEL NUDE `#C4A882` |
| Color secundario | BLUSH NUDE `#E8D5C8` |
| Fondo web | BLANCO CÁLIDO `#FAF7F4` |
| Acento | DORADO NUDE `#C9A96E` |
| Texto | NEGRO SUAVE `#1C1C1C` |
| Texto muted | GRIS NEUTRO `#7A7A7A` |
| Fuente headings | Cormorant Garamond / EB Garamond |
| Fuente titulares | Josefin Sans / Raleway Light |
| Fuente body | DM Sans / Inter |

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
| `product.zapatos-2x1.json` | Zapatos 2x1 |
| `product.zapatos-single.json` | Zapatos individual |
| `product.zapatos-ofertas.json` | Zapatos ofertas |
| `product.maletin-ailee.json` | Maletín AILÉE |
| `product.Producto-USA.json` | Mercado USA |
| `product.product-10x.json` | Campaña 10x |

### Assets clave

- `assets/ailee-design.css` — Design System de AILÉE: paleta nude, tipografía, componentes

### Configuración del tema

- `config/settings_schema.json` — opciones personalizables (colores, tipografía, layout)
- `config/settings_data.json` — valores actuales

## Patrón de personalización

El patrón principal para customizar páginas de producto es editar el HTML/CSS embebido en bloques `custom_liquid` dentro de `templates/product.*.json`.

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
