import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { getEntityTypes, getSummaryStatistics, getMostActiveEntities } from '../api/client';

interface EntityType {
  id: string;
  name: string;
}

interface SummaryStats {
  entityTypeName: string;
  totalInstances: number;
  totalEvents: number;
  eventsByType: Record<string, number>;
  lastEventTime: string | null;
  averageEventsPerInstance: number;
}

const COLORS = ['#4fc3f7', '#81c784', '#ffb74d', '#e57373', '#ba68c8', '#64b5f6'];

const Analytics: React.FC = () => {
  const [entityTypes, setEntityTypes] = useState<EntityType[]>([]);
  const [selectedType, setSelectedType] = useState<string>('');
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [mostActive, setMostActive] = useState<
    Array<{ entityInstanceId: string; eventCount: number }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEntityTypes = async () => {
      try {
        const response = await getEntityTypes();
        setEntityTypes(response.data);
        if (response.data.length > 0) {
          setSelectedType(response.data[0].name);
        }
      } catch (err) {
        setError('Failed to load entity types');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchEntityTypes();
  }, []);

  useEffect(() => {
    if (!selectedType) return;

    const fetchAnalytics = async () => {
      try {
        const [summaryResponse, activeResponse] = await Promise.all([
          getSummaryStatistics(selectedType),
          getMostActiveEntities(selectedType, 10),
        ]);
        setSummary(summaryResponse.data);
        setMostActive(activeResponse.data);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      }
    };

    fetchAnalytics();
  }, [selectedType]);

  if (loading) {
    return <div className="loading">Loading analytics...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  const eventTypeData = summary
    ? Object.entries(summary.eventsByType).map(([type, count]) => ({
        name: type,
        value: count,
      }))
    : [];

  return (
    <div>
      <div className="page-header">
        <h2>Analytics</h2>
      </div>

      {/* Entity Type Selector */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Select Entity Type</h3>
        </div>
        <select
          className="form-control"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
        >
          {entityTypes.map((type) => (
            <option key={type.id} value={type.name}>
              {type.name}
            </option>
          ))}
        </select>
      </div>

      {summary && (
        <>
          {/* Summary Statistics */}
          <div className="grid grid-3">
            <div className="card stats-card">
              <div className="stats-value">{summary.totalInstances}</div>
              <div className="stats-label">Total Instances</div>
            </div>
            <div className="card stats-card">
              <div className="stats-value">{summary.totalEvents}</div>
              <div className="stats-label">Total Events</div>
            </div>
            <div className="card stats-card">
              <div className="stats-value">
                {summary.averageEventsPerInstance.toFixed(2)}
              </div>
              <div className="stats-label">Avg Events/Instance</div>
            </div>
          </div>

          {/* Event Type Distribution */}
          <div className="grid grid-2">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Event Type Distribution</h3>
              </div>
              {eventTypeData.length > 0 ? (
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={eventTypeData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) =>
                          `${name} (${(percent * 100).toFixed(0)}%)`
                        }
                      >
                        {eventTypeData.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p>No events recorded yet</p>
              )}
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Event Types</h3>
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Event Type</th>
                    <th>Count</th>
                    <th>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {eventTypeData.map((item) => (
                    <tr key={item.name}>
                      <td>{item.name}</td>
                      <td>{item.value}</td>
                      <td>
                        {((item.value / summary.totalEvents) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Most Active Entities */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Most Active Entities</h3>
            </div>
            {mostActive.length > 0 ? (
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mostActive}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="entityInstanceId"
                      tick={false}
                      label={{ value: 'Entity Instance', position: 'bottom' }}
                    />
                    <YAxis
                      label={{
                        value: 'Event Count',
                        angle: -90,
                        position: 'insideLeft',
                      }}
                    />
                    <Tooltip
                      formatter={(value) => [value, 'Events']}
                      labelFormatter={(id) => `Instance: ${id.substring(0, 8)}...`}
                    />
                    <Bar dataKey="eventCount" fill="#4fc3f7" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p>No entity activity recorded yet</p>
            )}
          </div>

          {/* Last Event Time */}
          {summary.lastEventTime && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Last Activity</h3>
              </div>
              <p>
                Last event recorded:{' '}
                <strong>
                  {new Date(summary.lastEventTime).toLocaleString()}
                </strong>
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Analytics;
