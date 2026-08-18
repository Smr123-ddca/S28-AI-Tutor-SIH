import { useState, useEffect } from 'react'

function TeacherDashboard() {
    const [misconceptions, setMisconceptions] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/misconceptions')
                if (!response.ok) throw new Error('API fetch failed')
                const data = await response.json()
                setMisconceptions(data.misconceptions || [])
            } catch (err) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    if (loading) return <div style={{ color: 'var(--text-secondary)' }}>Loading dashboard data...</div>
    if (error) return <div style={{ color: 'var(--red)' }}>Error: {error}</div>

    if (misconceptions.length === 0) {
        return <div style={{ color: 'var(--text-secondary)' }}>No class data available yet. Please interact with the student chat using different IDs to populate data.</div>
    }

    // Already sorted descending by default mostly by API, but we can ensure it here
    const sorted = [...misconceptions].sort((a, b) => b.incorrect_rate - a.incorrect_rate)

    return (
        <div>
            <h2 style={{ color: 'var(--blue)', marginTop: 0 }}>Class Misconceptions</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                Overview of topics where students struggle. Rows exceeding 40% fail rate are highlighted.
            </p>

            <table>
                <thead>
                    <tr>
                        <th>Topic</th>
                        <th>Incorrect Rate</th>
                        <th>Attempts</th>
                        <th>Most Common Root Cause</th>
                    </tr>
                </thead>
                <tbody>
                    {sorted.map(item => {
                        const isHigh = item.incorrect_rate > 0.4

                        return (
                            <tr key={item.chunk_id} className={isHigh ? 'row-alert' : ''}>
                                <td>{item.section_label}</td>
                                <td>
                                    <strong style={{ color: isHigh ? 'var(--red)' : 'inherited' }}>
                                        {(item.incorrect_rate * 100).toFixed(1)}%
                                    </strong>
                                </td>
                                <td>{item.total_attempts}</td>
                                <td>
                                    {item.most_common_gap ? (
                                        <div>
                                            {item.most_common_gap.section_label}
                                            <small style={{ marginLeft: '0.5rem', color: isHigh ? 'var(--red)' : 'var(--text-secondary)' }}>
                                                ({item.most_common_gap.frequency}x)
                                            </small>
                                        </div>
                                    ) : (
                                        '—'
                                    )}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}

export default TeacherDashboard
