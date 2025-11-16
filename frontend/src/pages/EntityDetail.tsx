import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  getEntityInstance,
  getEventHistory,
  applyEvent,
  compareVersions,
  getFieldTimeline,
} from '../api/client';

interface Event {
  id: string;
  eventType: string;
  version: number;
  payload: Record<string, unknown>;
  previousState: Record<string, unknown>;
  newState: Record<string, unknown>;
  timestamp: string;
}

interface EntityInstance {
  id: string;
  externalId: string;
  currentState: Record<string, unknown>;
  version: number;
  entityType: {
    id: string;
    name: string;
  };
}

const EntityDetail: React.FC = () => {
  const { instanceId } = useParams<{ instanceId: string }>();
  const [instance, setInstance] = useState<EntityInstance | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'state' | 'timeline' | 'compare' | 'chart'>('state');
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventForm, setEventForm] = useState({
    eventType: '',
    payload: '{}',
  });
  const [compareVersions, setCompareVersions] = useState({
    version1: 1,
    version2: 2,
  });
  const [comparison, setComparison] = useState<unknown>(null);
  const [selectedField, setSelectedField] = useState('');
  const [timeline, setTimeline] = useState<Array<{ timestamp: Date; version: number; value: unknown }>>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!instanceId) return;
    try {
      setLoading(true);
      const [instanceResponse, eventsResponse] = await Promise.all([
        getEntityInstance(instanceId),
        getEventHistory(instanceId),
      ]);
      setInstance(instanceResponse.data);
      setEvents(eventsResponse.data.events);
    } catch (err) {
      setError('Failed to load entity data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [instanceId]);

  const handleApplyEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instanceId) return;
    try {
      const payloadObj = JSON.parse(eventForm.payload);
      await applyEvent(instanceId, {
        eventType: eventForm.eventType,
        payload: payloadObj,
      });
      setShowEventModal(false);
      setEventForm({ eventType: '', payload: '{}' });
      fetchData();
    } catch (err: unknown) {
      if (err instanceof SyntaxError) {
        setError('Invalid JSON payload');
      } else {
        setError('Failed to apply event');
      }
      console.error(err);
    }
  };

  const handleCompare = async () => {
    if (!instanceId) return;
    try {
      const response = await compareVersions(
        instanceId,
        compareVersions.version1,
        compareVersions.version2
      );
      setComparison(response.data);
    } catch (err) {
      setError('Failed to compare versions');
      console.error(err);
    }
  };

  const handleGetTimeline = async () => {
    if (!instanceId || !selectedField) return;
    try {
      const response = await getFieldTimeline(instanceId, selectedField);
      setTimeline(response.data);
    } catch (err) {
      setError('Failed to get timeline');
      console.error(err);
    }
  };

  if (loading) {
    return <div className="loading">Loading entity details...</div>;
  }

  if (!instance) {
    return <div className="error">Entity not found</div>;
  }

  const stateFields = Object.keys(instance.currentState);

  return (
    <div>
      <div className="page-header">
        <h2>
          Entity: {instance.externalId}
          <span className="badge badge-info" style={{ marginLeft: '1rem' }}>
            v{instance.version}
          </span>
        </h2>
      </div>

      {error && <div className="error">{error}</div>}

      {/* Info Card */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Entity Information</h3>
          <button
            className="btn btn-primary"
            onClick={() => setShowEventModal(true)}
          >
            Apply Event
          </button>
        </div>
        <div className="grid grid-3">
          <div>
            <strong>Entity Type:</strong> {instance.entityType.name}
          </div>
          <div>
            <strong>External ID:</strong> {instance.externalId}
          </div>
          <div>
            <strong>Current Version:</strong> {instance.version}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'state' ? 'active' : ''}`}
          onClick={() => setActiveTab('state')}
        >
          Current State
        </button>
        <button
          className={`tab ${activeTab === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          Event Timeline
        </button>
        <button
          className={`tab ${activeTab === 'compare' ? 'active' : ''}`}
          onClick={() => setActiveTab('compare')}
        >
          Compare Versions
        </button>
        <button
          className={`tab ${activeTab === 'chart' ? 'active' : ''}`}
          onClick={() => setActiveTab('chart')}
        >
          Field Chart
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'state' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Current State</h3>
          </div>
          <div className="json-viewer">
            <pre>{JSON.stringify(instance.currentState, null, 2)}</pre>
          </div>
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Event Timeline ({events.length} events)</h3>
          </div>
          <div className="timeline">
            {events.map((event) => (
              <div key={event.id} className="timeline-item">
                <div className="timeline-time">
                  {new Date(event.timestamp).toLocaleString()} - Version {event.version}
                </div>
                <div className="timeline-content">
                  <strong>{event.eventType}</strong>
                  <div style={{ marginTop: '0.5rem' }}>
                    <small>Payload:</small>
                    <pre style={{ margin: '0.25rem 0', fontSize: '0.8rem' }}>
                      {JSON.stringify(event.payload, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'compare' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Compare Versions</h3>
          </div>
          <div className="form-group">
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <input
                type="number"
                className="form-control"
                style={{ width: '100px' }}
                value={compareVersions.version1}
                onChange={(e) =>
                  setCompareVersions({
                    ...compareVersions,
                    version1: parseInt(e.target.value),
                  })
                }
                min={1}
                max={instance.version}
              />
              <span>vs</span>
              <input
                type="number"
                className="form-control"
                style={{ width: '100px' }}
                value={compareVersions.version2}
                onChange={(e) =>
                  setCompareVersions({
                    ...compareVersions,
                    version2: parseInt(e.target.value),
                  })
                }
                min={1}
                max={instance.version}
              />
              <button className="btn btn-primary" onClick={handleCompare}>
                Compare
              </button>
            </div>
          </div>
          {comparison && (
            <div style={{ marginTop: '1rem' }}>
              <h4>Changes:</h4>
              <div className="json-viewer">
                <pre>{JSON.stringify(comparison, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'chart' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Field Timeline Chart</h3>
          </div>
          <div className="form-group">
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <select
                className="form-control"
                style={{ width: '200px' }}
                value={selectedField}
                onChange={(e) => setSelectedField(e.target.value)}
              >
                <option value="">Select a field</option>
                {stateFields.map((field) => (
                  <option key={field} value={field}>
                    {field}
                  </option>
                ))}
              </select>
              <button
                className="btn btn-primary"
                onClick={handleGetTimeline}
                disabled={!selectedField}
              >
                Load Timeline
              </button>
            </div>
          </div>
          {timeline.length > 0 && (
            <div style={{ marginTop: '1rem', height: '400px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeline}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="version"
                    label={{ value: 'Version', position: 'bottom' }}
                  />
                  <YAxis
                    label={{
                      value: selectedField,
                      angle: -90,
                      position: 'insideLeft',
                    }}
                  />
                  <Tooltip
                    formatter={(value, name) => [value, selectedField]}
                    labelFormatter={(version) => `Version ${version}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#4fc3f7"
                    strokeWidth={2}
                    dot={{ fill: '#4fc3f7' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Apply Event Modal */}
      {showEventModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Apply Event</h3>
              <button
                className="modal-close"
                onClick={() => setShowEventModal(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleApplyEvent}>
              <div className="form-group">
                <label>Event Type</label>
                <input
                  type="text"
                  className="form-control"
                  value={eventForm.eventType}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, eventType: e.target.value })
                  }
                  placeholder="e.g., ScoreUpdated"
                  required
                />
              </div>
              <div className="form-group">
                <label>Payload (JSON - will be merged into state)</label>
                <textarea
                  className="form-control"
                  value={eventForm.payload}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, payload: e.target.value })
                  }
                  rows={10}
                  required
                />
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEventModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Apply Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EntityDetail;
