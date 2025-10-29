import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

export const dynamic = 'force-dynamic'

const disableHealthRequestLogs = process.env.DISABLE_HEALTH_REQUEST_LOGS === '1'

export async function GET() {
  const startTime = Date.now()

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
        if (!disableHealthRequestLogs) {
          console.error('Database health check failed:', dbError)
        }
      }
    }

    const duration = Date.now() - startTime
    if (!disableHealthRequestLogs) {
      console.log(`Health check successful in ${duration}ms`)
    }

    return NextResponse.json(health, { status: 200 })
  } catch (error) {
    const duration = Date.now() - startTime
    if (!disableHealthRequestLogs) {
      console.error(`Health check failed in ${duration}ms:`, error)
    }
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
