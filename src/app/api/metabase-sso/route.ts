import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import invariant from 'tiny-invariant'

interface EmbedPayload {
  resource: { dashboard?: number; question?: number }
  params: Record<string, unknown>
  exp?: number
}

export async function GET(request: NextRequest) {
  const METABASE_EMBEDDING_SECRET_KEY = process.env.METABASE_EMBEDDING_SECRET_KEY
  invariant(METABASE_EMBEDDING_SECRET_KEY, 'METABASE_EMBEDDING_SECRET_KEY is not set')

  const METABASE_INSTANCE_URL = process.env.NEXT_PUBLIC_METABASE_URL
  invariant(METABASE_INSTANCE_URL, 'NEXT_PUBLIC_METABASE_URL is not set')

  const searchParams = request.nextUrl.searchParams
  const type = searchParams.get('type') || 'dashboard'
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 })
  }

  const resourceId = parseInt(id, 10)
  if (isNaN(resourceId)) {
    return NextResponse.json({ error: 'Invalid id parameter' }, { status: 400 })
  }

  const payload: EmbedPayload = {
    resource: type === 'question' ? { question: resourceId } : { dashboard: resourceId },
    params: {},
    exp: Math.round(Date.now() / 1000) + 10 * 60, // Expires in 10 minutes
  }

  const token = jwt.sign(payload, METABASE_EMBEDDING_SECRET_KEY)

  const embedUrl = `${METABASE_INSTANCE_URL}/embed/${type}/${token}#bordered=true&titled=true`

  return NextResponse.json({ embedUrl, token })
}
