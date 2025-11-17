'use client'

import { useEffect, useState } from 'react'

interface MetabaseDashboardProps {
  dashboardId: number
  height?: string
}

export default function MetabaseDashboard({
  dashboardId,
  height = '600px',
}: MetabaseDashboardProps) {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchEmbedUrl = async () => {
      try {
        const response = await fetch(`/api/metabase-sso?type=dashboard&id=${dashboardId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch embed URL')
        }
        const data = await response.json()
        setEmbedUrl(data.embedUrl)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    fetchEmbedUrl()
  }, [dashboardId])

  if (isLoading) {
    return <div className="metabase-embed__loading">Loading dashboard...</div>
  }

  if (error) {
    return <div className="metabase-embed__error">Error: {error}</div>
  }

  if (!embedUrl) {
    return <div className="metabase-embed__error">No embed URL available</div>
  }

  return (
    <iframe
      src={embedUrl}
      frameBorder="0"
      width="100%"
      height={height}
      // @ts-expect-error - React requires lowercase for custom DOM attributes
      allowtransparency="true"
      title={`Metabase Dashboard ${dashboardId}`}
      className="metabase-embed__iframe"
    />
  )
}
