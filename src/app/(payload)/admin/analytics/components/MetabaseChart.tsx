'use client'

import { useEffect, useState } from 'react'

interface MetabaseChartProps {
  questionId: number
  height?: string
}

export default function MetabaseChart({ questionId, height = '400px' }: MetabaseChartProps) {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchEmbedUrl = async () => {
      try {
        const response = await fetch(`/api/metabase-sso?type=question&id=${questionId}`)
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
  }, [questionId])

  if (isLoading) {
    return <div className="metabase-embed__loading">Loading chart...</div>
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
      title={`Metabase Question ${questionId}`}
      className="metabase-embed__iframe"
    />
  )
}
