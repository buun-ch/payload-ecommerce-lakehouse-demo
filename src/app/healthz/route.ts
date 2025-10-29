import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Basic health check
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    }

    // Optional: Check database connection
    if (process.env.DATABASE_URI) {
      try {
        const payload = await getPayload({ config: configPromise })
        // Simple query to verify database connectivity
        await payload.find({
          collection: 'users',
          limit: 0,
          pagination: false,
        })
        health.database = 'connected'
      } catch (dbError) {
        // Database check failed, but don't fail the health check
        // This allows the pod to stay alive but marked as not ready
        health.database = 'error'
        console.error('Database health check failed:', dbError)
      }
    }

    return NextResponse.json(health, { status: 200 })
  } catch (error) {
    console.error('Health check failed:', error)
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 },
    )
  }
}
