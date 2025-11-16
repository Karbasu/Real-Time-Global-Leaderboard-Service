import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getEntityType,
  getEntityInstances,
  createEntityInstance,
} from '../api/client';

interface EntityType {
  id: string;
  name: string;
  description: string;
  schema: Record<string, unknown>;
}

interface EntityInstance {
  id: string;
  externalId: string;
  currentState: Record<string, unknown>;
  version: number;
  createdAt: string;
  updatedAt: string;
}

const EntityInstances: React.FC = () => {
  const { typeId } = useParams<{ typeId: string }>();
  const [entityType, setEntityType] = useState<EntityType | null>(null);
  const [instances, setInstances] = useState<EntityInstance[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    externalId: '',
    initialState: '{}',
  });
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!typeId) return;
    try {
      setLoading(true);
      const [typeResponse, instancesResponse] = await Promise.all([
        getEntityType(typeId),
        getEntityInstances(typeId),
      ]);
      setEntityType(typeResponse.data);
      setInstances(instancesResponse.data.instances);
      setTotal(instancesResponse.data.total);
    } catch (err) {
      setError('Failed to load entity data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [typeId]);

  const handleCreateInstance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeId) return;
    try {
      const stateObj = JSON.parse(formData.initialState);
      await createEntityInstance(typeId, {
        externalId: formData.externalId,
        initialState: stateObj,
      });
      setShowModal(false);
      setFormData({ externalId: '', initialState: '{}' });
      fetchData();
    } catch (err: unknown) {
      if (err instanceof SyntaxError) {
        setError('Invalid JSON for initial state');
      } else {
        setError('Failed to create entity instance');
      }
      console.error(err);
    }
  };

  if (loading) {
    return <div className="loading">Loading instances...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h2>
          {entityType?.name || 'Entity'} Instances
          <span style={{ fontSize: '1rem', color: '#666', marginLeft: '1rem' }}>
            ({total} total)
          </span>
        </h2>
      </div>

      {error && <div className="error">{error}</div>}

      {entityType && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Type Information</h3>
          </div>
          <p>
            <strong>Description:</strong>{' '}
            {entityType.description || 'No description'}
          </p>
          <div className="json-viewer">
            <pre>{JSON.stringify(entityType.schema, null, 2)}</pre>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Instances</h3>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            Create Instance
          </button>
        </div>

        {instances.length === 0 ? (
          <p>No instances yet. Create your first instance!</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>External ID</th>
                <th>Version</th>
                <th>Current State (Preview)</th>
                <th>Last Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {instances.map((instance) => (
                <tr key={instance.id}>
                  <td>
                    <strong>{instance.externalId}</strong>
                  </td>
                  <td>
                    <span className="badge badge-info">v{instance.version}</span>
                  </td>
                  <td>
                    <code>
                      {JSON.stringify(instance.currentState).substring(0, 50)}
                      {JSON.stringify(instance.currentState).length > 50
                        ? '...'
                        : ''}
                    </code>
                  </td>
                  <td>{new Date(instance.updatedAt).toLocaleString()}</td>
                  <td>
                    <Link
                      to={`/entities/${instance.id}`}
                      className="btn btn-primary"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Create Entity Instance</h3>
              <button
                className="modal-close"
                onClick={() => setShowModal(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateInstance}>
              <div className="form-group">
                <label>External ID</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.externalId}
                  onChange={(e) =>
                    setFormData({ ...formData, externalId: e.target.value })
                  }
                  placeholder="e.g., user-123"
                  required
                />
              </div>
              <div className="form-group">
                <label>Initial State (JSON)</label>
                <textarea
                  className="form-control"
                  value={formData.initialState}
                  onChange={(e) =>
                    setFormData({ ...formData, initialState: e.target.value })
                  }
                  rows={10}
                  required
                />
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EntityInstances;
