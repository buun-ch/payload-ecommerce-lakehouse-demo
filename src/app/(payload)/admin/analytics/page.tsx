import MetabaseDashboard from './components/MetabaseDashboard'
import MetabaseChart from './components/MetabaseChart'
import './analytics.scss'

const dashboardId = process.env.NEXT_PUBLIC_METABASE_DASHBOARD_ID
  ? parseInt(process.env.NEXT_PUBLIC_METABASE_DASHBOARD_ID, 10)
  : null

const chartIds = process.env.NEXT_PUBLIC_METABASE_CHART_IDS
  ? process.env.NEXT_PUBLIC_METABASE_CHART_IDS.split(',').map((id) => parseInt(id.trim(), 10))
  : []

export default function AnalyticsPage() {
  return (
    <div className="analytics-page">
      <header className="analytics-page__header">
        <h1>Analytics Dashboard</h1>
      </header>

      {dashboardId && (
        <section className="analytics-page__section">
          <div className="analytics-page__dashboard-container">
            <MetabaseDashboard dashboardId={dashboardId} />
          </div>
        </section>
      )}

      {chartIds.length > 0 && (
        <section className="analytics-page__section">
          <div className="analytics-page__grid">
            {chartIds.map((chartId) => (
              <div key={chartId} className="analytics-page__card">
                <MetabaseChart questionId={chartId} height="300px" />
              </div>
            ))}
          </div>
        </section>
      )}

      {!dashboardId && chartIds.length === 0 && (
        <section className="analytics-page__section">
          <div className="analytics-page__card">
            <p>
              No Metabase dashboard or charts configured. Please set the following environment
              variables:
            </p>
            <ul>
              <li>
                <code>NEXT_PUBLIC_METABASE_DASHBOARD_ID</code> - Dashboard ID to embed
              </li>
              <li>
                <code>NEXT_PUBLIC_METABASE_CHART_IDS</code> - Comma-separated list of chart IDs
              </li>
            </ul>
          </div>
        </section>
      )}
    </div>
  )
}

