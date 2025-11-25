# Metabase Embedding

This guide shows how to embed Metabase dashboards and charts into the payload-ecommerce-lakehouse-demo Next.js application using Metabase Static Embedding.

## Overview

This project uses **Metabase Static Embedding** (iframe-based), which is available in the OSS version of Metabase. Dashboards and questions are embedded using signed JWT tokens and rendered in iframes.

## Configuration

### 1. Enable Embedding in Metabase

In your Metabase instance:

1. Go to **Settings** > **Admin settings** > **Embedding**
2. Toggle **Enabled** button of Static embedding
3. Copy the **Embedding secret key**

### 2. Store Secret in HashiCorp Vault

Store the Metabase embedding secret key in HashiCorp Vault:

**Vault Path**: `ecommerce/metabase`
**Key**: `embedding_secret_key`
**Value**: Your Metabase embedding secret key

This secret will be automatically synced to Kubernetes via External Secrets Operator.

### 3. Environment Variables

The application uses the following environment variables for Metabase embedding:

- `NEXT_PUBLIC_METABASE_URL` - Your Metabase instance URL (e.g., `https://metabase.example.com`)
- `METABASE_EMBEDDING_SECRET_KEY` - Metabase embedding secret key (managed by External Secrets)
- `NEXT_PUBLIC_METABASE_DASHBOARD_ID` - Default dashboard ID to embed
- `NEXT_PUBLIC_METABASE_CHART_IDS` - Comma-separated list of chart IDs (e.g., `1,2,3`)

## Implementation

The application already includes a complete implementation of Metabase Static Embedding. Here's an overview of the key components:

### JWT Token Generation Endpoint

**File: `src/app/api/metabase-auth/route.ts`**

The API route generates signed JWT tokens and embed URLs for Metabase resources:

**Key features:**

1. **Validates environment variables**:
   - `NEXT_PUBLIC_METABASE_URL` - Metabase instance URL
   - `METABASE_EMBEDDING_SECRET_KEY` - Secret key for JWT signing

2. **Accepts query parameters**:
   - `type` - Resource type (`dashboard` or `question`)
   - `id` - Resource ID (dashboard ID or question ID)

3. **Generates JWT token** with payload:

   ```typescript
   {
     resource: { dashboard: 1 },  // or { question: 1 }
     params: {},                   // Optional parameters for filtering
     exp: 1234567890               // Token expiration (10 minutes)
   }
   ```

4. **Returns embed URL**:

   ```plain
   https://metabase.example.com/embed/dashboard/{signed-jwt}#bordered=true&titled=true
   ```

**Example request:**

```
GET /api/metabase-auth?type=dashboard&id=1
```

**Example response:**

```json
{
  "embedUrl": "https://metabase.example.com/embed/dashboard/{signed-jwt}#bordered=true&titled=true",
  "token": "{signed-jwt}"
}
```

### Dashboard Component

**File: `src/app/(payload)/admin/analytics/components/MetabaseDashboard.tsx`**

Client-side component that embeds Metabase dashboards via iframe:

**How it works:**

1. Fetches embed URL from `/api/metabase-auth` with dashboard ID
2. Renders an iframe with the signed embed URL
3. Handles loading and error states

**Props:**

- `dashboardId: number` - Metabase dashboard ID
- `height?: string` - iframe height (default: `600px`)

### Chart Component

**File: `src/app/(payload)/admin/analytics/components/MetabaseChart.tsx`**

Client-side component that embeds Metabase questions (charts) via iframe:

**How it works:**

1. Fetches embed URL from `/api/metabase-auth` with question ID
2. Renders an iframe with the signed embed URL
3. Handles loading and error states

**Props:**

- `questionId: number` - Metabase question ID
- `height?: string` - iframe height (default: `400px`)

### Analytics Page

**File: `src/app/(payload)/admin/analytics/page.tsx`**

The analytics page provides a complete interface for viewing embedded Metabase content:

- Reads dashboard and chart IDs from environment variables
- Embeds dashboards when `NEXT_PUBLIC_METABASE_DASHBOARD_ID` is configured
- Embeds individual charts when `NEXT_PUBLIC_METABASE_CHART_IDS` is configured
- Shows helpful configuration instructions if environment variables are not set

**Environment variables used:**

- `NEXT_PUBLIC_METABASE_DASHBOARD_ID` - Single dashboard ID
- `NEXT_PUBLIC_METABASE_CHART_IDS` - Comma-separated list of question IDs (e.g., `1,2,3`)

## Deployment

### Local Development

For local development, configure environment variables in `.env` or `.env.local`:

**File: `.env`**

```bash
# Metabase Configuration
NEXT_PUBLIC_METABASE_URL=https://metabase.example.com
NEXT_PUBLIC_METABASE_DASHBOARD_ID=5
NEXT_PUBLIC_METABASE_CHART_IDS=29,30,31
```

**Start the development server:**

```bash
tilt up --metabase-embedding
```

Run `telepresence connect` to connect to the server from your local machine.

Navigate to `http://payload-ecommerce-lakehouse-demo.default:3000/admin/analytics`.

#### Prerequisites

- [buun-stack](https://github.com/buun-ch/buun-stack) with enabled Vault and External Secrets Operator
