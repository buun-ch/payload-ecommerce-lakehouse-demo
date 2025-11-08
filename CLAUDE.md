# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a **demonstration project** that integrates a Next.js ecommerce application with an open-source lakehouse architecture.

### Application Layer

- Payload CMS-based ecommerce application built with Next.js 15
- Full-featured online shop with products, variants, carts, orders, and Stripe payment integration
- Built with TypeScript, React 19, TailwindCSS, and PostgreSQL
- Based on Payload CMS ecommerce template (see [README-payload.md](./README-payload.md))

### Data Layer

- **Data Ingestion**: dlt (data load tool) extracts data from Payload CMS API to Iceberg
- **Data Transformation**: dbt transforms raw data into analytics-ready star schema using Trino
- **Lakehouse Storage**: Apache Iceberg tables via Lakekeeper REST Catalog
- **Query Engine**: Trino for distributed SQL queries
- **BI & Analytics**: Metabase dashboards with sample queries

For the complete overview, see [README.md](./README.md).

## Commands

This project uses two command runners:

- **pnpm**: For Next.js/Payload CMS application commands
- **just**: For task automation across the entire stack (app, dlt, dbt)

### Just Command Runner

[just](https://github.com/casey/just) is a command runner that manages tasks across all components of the stack.

```bash
# List all available recipes
just

# Execute recipes using module syntax
just dbt::op-test              # Run dbt tests
just dlt::op-run               # Run dlt ingestion
just payload::op-seed          # Seed Payload database
```

**Key features:**

- **Module-based organization**: Recipes are organized by component (`payload::`, `dbt::`, `dlt::`)
- **Self-documenting**: Running `just` without arguments shows all available recipes with descriptions
- **1Password integration**: Recipes prefixed with `op-` use `op run --env-file=.env.local` for secure environment variable handling

### Development

```bash
pnpm dev                  # Start development server on http://localhost:3000
pnpm build               # Build for production
pnpm start               # Start production server
pnpm dev:prod            # Clean build and start production mode
```

### Testing

```bash
pnpm test                # Run all tests (integration + e2e)
pnpm test:int            # Run integration tests with Vitest
pnpm test:e2e            # Run e2e tests with Playwright
```

### Code Quality

```bash
pnpm lint                # Run ESLint
pnpm lint:fix            # Fix ESLint issues automatically
```

### Payload CMS

```bash
pnpm payload             # Access Payload CLI commands
pnpm generate:types      # Generate TypeScript types from Payload schema
pnpm generate:importmap  # Generate import map for Payload
```

### Database (PostgreSQL)

```bash
pnpm payload migrate:create  # Create a new database migration
pnpm payload migrate         # Run pending migrations
```

### Stripe Integration

```bash
pnpm stripe-webhooks     # Forward Stripe webhooks to localhost:3000/api/stripe/webhooks
```

## Architecture

### Application Structure

This is a **monolithic Next.js application** that combines both the Payload CMS admin panel and the public-facing ecommerce website in a single deployment:

- **Payload Admin Panel**: `/admin` - Backend CMS for managing products, pages, orders, users
- **Public Website**: `/` - Customer-facing ecommerce storefront

### Key Architectural Patterns

1. **Next.js App Router**: Uses the app directory structure with server and client components
2. **Route Groups**:
   - `(app)` - Public-facing website routes
   - `(payload)` - Admin panel routes
   - `(account)` - Customer account pages
3. **Server-Side Rendering**: Primary rendering strategy, with dynamic routes for products/pages
4. **Payload Collections as Data Layer**: All content and commerce data managed through Payload CMS

### Core Collections

- **Products**: Main product catalog with support for variants, pricing per currency (default: USD), and inventory management. Located in `src/collections/Products/index.ts`
- **Variants**: Product variants (added by ecommerce plugin)
- **VariantOptions**: Variant option definitions like color, size (added by ecommerce plugin)
- **VariantTypes**: Variant type categories (added by ecommerce plugin)
- **Users**: Auth-enabled collection with two roles:
    - `admin` - Full access to admin panel and content management
    - `customer` - Frontend access only, can manage their own orders/addresses
- **Pages**: Layout builder-enabled pages with draft/live preview support
- **Categories**: Product taxonomy for grouping products
- **Media**: Upload collection for images and assets with pre-configured sizes and focal point support
- **Carts**: Track user and guest shopping carts (added by ecommerce plugin)
- **Addresses**: Save customer shipping/billing addresses (added by ecommerce plugin)
- **Orders**: Created after successful transaction completion (added by ecommerce plugin)
- **Transactions**: Track payment flow from initiation to completion (added by ecommerce plugin)

### Global Configuration

- **Header**: Navigation links and header configuration
- **Footer**: Footer links and content

### Plugins

The application uses several Payload plugins configured in `src/plugins/index.ts`:

1. **Ecommerce Plugin** (`@payloadcms/plugin-ecommerce`):
   - Provides Products, Variants, Carts, Orders, Transactions collections
   - Stripe payment adapter integration
   - Customer accounts linked to Users collection

2. **SEO Plugin** (`@payloadcms/plugin-seo`):
   - Meta fields for products and pages
   - Title and description generation

3. **Form Builder Plugin** (`@payloadcms/plugin-form-builder`):
   - Dynamic form creation capability

### Layout Builder System

Pages and Products use a **block-based layout builder** for flexible content composition:

- **Blocks** (in `src/blocks/`):
    - `CallToAction` - CTA sections
    - `Content` - Rich text content
    - `MediaBlock` - Image/video blocks
    - `Archive` - Product listings

- **Heros** (in `src/heros/`): Configurable hero sections for pages
- **RenderBlocks** (`src/blocks/RenderBlocks.tsx`): Dynamically renders blocks on frontend

### Access Control

Implements role-based access control in `src/access/`:

- `adminOnly.ts` - Restricts to admin users
- `adminOrPublishedStatus.ts` - Public can see published content, admins see all
- `adminOrSelf.ts` - Users can access their own data, admins access all
- `adminOrCustomerOwner.ts` - Customers can access their own resources
- `publicAccess.ts` - Unrestricted access
- Field-level access: `adminOnlyFieldAccess.ts`, `customerOnlyFieldAccess.ts`

### Rich Text Editor

Uses **Lexical editor** (`@payloadcms/richtext-lexical`) with features:

- Bold, Italic, Underline
- Ordered/Unordered lists
- Links (with internal page references)
- Tables (experimental)
- Headings, Horizontal rules (in specific contexts)

### Preview & Revalidation

- **Draft Preview**: Preview unpublished content before publishing
- **Live Preview**: Real-time preview while editing in admin panel
- **On-demand Revalidation**: Automatically revalidates Next.js cache when content changes
- Preview path generation: `src/utilities/generatePreviewPath.ts`

### Database

- **PostgreSQL** with `@payloadcms/db-postgres` adapter
- Connection via `DATABASE_URI` environment variable
- **Migrations required for production** - Always run `pnpm payload migrate` before starting production
- **Local development**: Uses `push: true` by default (auto-sync schema without migrations)

### Testing

- **Integration Tests**: Located in `tests/int/`, run with Vitest in jsdom environment
- **E2E Tests**: Located in `tests/e2e/`, run with Playwright (uses Chromium)
- Test environment variables in `test.env`

## Development Workflow

### Working with the Schema

When modifying Payload collections/fields:

1. Make changes to collection config files in `src/collections/`
2. Run `pnpm generate:types` to update TypeScript types
3. For production (with PostgreSQL):
   - Run `pnpm payload migrate:create` to create migration
   - Commit migration files with your schema changes
   - Deploy and run `pnpm payload migrate` on server

### Working with Products

- Product configuration: `src/collections/Products/index.ts`
- Products support optional variants (e.g., size, color)
- Each product has:
    - Title, slug, description (Lexical rich text)
    - Gallery (images with optional variant associations)
    - Pricing per currency (default USD, configurable in plugin)
    - Inventory tracking
    - Categories relationship
    - Layout blocks for custom content sections
    - SEO meta fields
    - Related products

### Frontend Components

- **Product Components**: `src/components/product/` - Gallery, VariantSelector, ProductDescription, StockIndicator
- **Cart Components**: `src/components/Cart/` - AddToCart, CartModal, EditItemQuantityButton
- **Checkout**: `src/components/checkout/` - CheckoutPage, CheckoutAddresses, ConfirmOrder
- **Account**: `src/components/AccountNav/`, `src/components/OrderStatus/`
- **UI Primitives**: Uses shadcn/ui components via Radix UI

### Environment Variables

Environment variables are stored in separate `.env.local` files for each component:

- **Payload CMS App**: `.env.local` (project root)
- **dbt Transformation**: `data/transformation/.env.local`
- **dlt Ingestion**: `data/ingestion/.env.local`

**Important**: All `.env.local` files contain **1Password references** for secure credential management. Commands must be executed using the 1Password CLI:

```bash
# Correct: Use 1Password CLI to inject secrets
op run --env-file=.env.local -- pnpm dev
op run --env-file=data/transformation/.env.local -- dbt test
op run --env-file=data/ingestion/.env.local -- python pipeline.py

# Just recipes with `op-` prefix handle this automatically
just dbt::op-test           # Internally runs: op run --env-file=.env.local -- dbt test
just payload::op-seed       # Internally runs: op run --env-file=.env.local -- node script
```

**Required variables for Payload CMS** (see `.env.example`):

- `DATABASE_URI` - PostgreSQL connection string
- `PAYLOAD_SECRET` - Secret key for Payload
- `NEXT_PUBLIC_SERVER_URL` - Public URL of the application
- `STRIPE_SECRET_KEY` - Stripe secret key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `STRIPE_WEBHOOKS_SIGNING_SECRET` - Stripe webhook secret

**Required variables for dbt** (see `data/transformation/env.local.example`):

- `TRINO_SERVER` - Trino server hostname
- `TRINO_USER` - Trino username for authentication
- `ICEBERG_CATALOG` - Iceberg catalog name

**Required variables for dlt** (see `data/ingestion/env.local.example`):

- `PAYLOAD_API_URL` - Payload CMS API endpoint
- `ICEBERG_CATALOG_URI` - Iceberg REST catalog URI
- `ICEBERG_WAREHOUSE` - S3/MinIO warehouse location

### Stripe Integration

- Adapter configured in `src/plugins/index.ts`
- Webhooks endpoint: `/api/stripe/webhooks`
- Test locally: Use `pnpm stripe-webhooks` to forward webhooks from Stripe CLI
- Supports payment intents and captures transaction/order data

### Seeding Database

- Access admin panel and use "seed database" feature
- **WARNING**: Seeding is destructive and drops existing data
- Creates demo customer: `customer@example.com` / `password`

### Querying Data with Trino MCP

Use **mcp-trino** to execute SQL queries directly against the Trino query engine from Claude. This is useful for:

- Data verification and validation
- Ad-hoc analysis and exploration
- Troubleshooting data pipeline issues
- Quick schema inspection without opening BI tools

**Available Operations:**

- `list_catalogs`: Show all available Trino catalogs
- `list_schemas`: List schemas within a catalog
- `list_tables`: Show tables in a schema
- `get_table_schema`: Inspect table structure and column types
- `execute_query`: Run SELECT queries to retrieve data
- `explain_query`: Analyze query execution plans for optimization

**Available Data:**

- **Catalog**: `iceberg` (Iceberg REST Catalog via Lakekeeper)
- **Schemas**:
    - `ecommerce_marts`: dbt-transformed star schema (fact/dim tables)
    - `ecommerce_staging`: Intermediate staging tables from dbt
    - `ecommerce`: Raw data ingested by dlt from Payload CMS

**Example Usage:**

```sql
-- List all schemas
list_schemas(catalog: "iceberg")

-- Check table structure
get_table_schema(table: "fact_orders", schema: "ecommerce_marts", catalog: "iceberg")

-- Query data
execute_query(query: "SELECT order_date, SUM(amount_usd) as revenue
                      FROM iceberg.ecommerce_marts.fact_orders
                      WHERE status = 'completed'
                      GROUP BY 1
                      ORDER BY 1 DESC
                      LIMIT 10")
```

**When to Use:**

- Use **mcp-trino** for data exploration and validation
- Use **Metabase/Superset** (via Playwright MCP) for creating reusable dashboards and sharing with non-technical users

### Working with BI Tools (Playwright MCP)

This project uses Metabase and Superset as external BI tools for analytics. When interacting with these tools, use **Playwright MCP** for browser automation.

**Why Playwright MCP:**

- Full support for React/SPA applications (Metabase and Superset use React)
- JavaScript execution capability via `browser_evaluate` tool
- Automatic browser launching (no manual connection required)
- Reliable UI interactions: tabs, dropdowns, buttons, and forms all work correctly

**Key Features:**

- **Interactive UI Operations**: Click buttons, fill forms, select dropdowns
- **Page Navigation**: Direct URL navigation and link clicking both supported
- **Screenshots**: Take screenshots for debugging or documentation
- **Console Logs**: Access browser console for debugging React applications

**Data Sources:**

Both Metabase and Superset connect to the Trino query engine, which provides access to:

- Iceberg tables transformed by dbt
- Star schema with fact and dimension tables
- Raw data ingested by dlt

For detailed guidance on creating Questions in Metabase and working with the visual query builder, see [`docs/metabase.md`](./docs/metabase.md).

## Important Notes

- **TypeScript**: Payload generates types in `src/payload-types.ts` - regenerate after schema changes
- **Images**: Configure Next.js image remotePatterns in `next.config.js` for external images
- **Caching**: Next.js caching disabled by default (for Payload Cloud CDN compatibility) - uses `export const dynamic = 'force-dynamic'` in pages
- **Jobs Queue**: Scheduled publishing uses Payload jobs queue (cron-based)
- **Migrations**: Required when deploying with PostgreSQL - never skip migration step
- **Guest Checkout**: Supported - guests can create orders and access them via order ID + email

## Code Style

- Respect eslint and prettier rules
- Follow existing style patterns
- Only write code comments when necessary, as the code should be self-explanatory
  (Avoid trivial comment for each code block)
- Write output messages and code comments in English
