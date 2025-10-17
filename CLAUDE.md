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

Required variables (see `.env.example`):

- `DATABASE_URI` - PostgreSQL connection string
- `PAYLOAD_SECRET` - Secret key for Payload
- `NEXT_PUBLIC_SERVER_URL` - Public URL of the application
- `STRIPE_SECRET_KEY` - Stripe secret key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `STRIPE_WEBHOOKS_SIGNING_SECRET` - Stripe webhook secret

### Stripe Integration

- Adapter configured in `src/plugins/index.ts`
- Webhooks endpoint: `/api/stripe/webhooks`
- Test locally: Use `pnpm stripe-webhooks` to forward webhooks from Stripe CLI
- Supports payment intents and captures transaction/order data

### Seeding Database

- Access admin panel and use "seed database" feature
- **WARNING**: Seeding is destructive and drops existing data
- Creates demo customer: `customer@example.com` / `password`

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
