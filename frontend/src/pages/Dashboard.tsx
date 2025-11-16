import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEntityTypes, getHealth } from '../api/client';

interface EntityType {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

interface HealthStatus {
  status: string;
  service: string;
  version: string;
  environment: string;
}

const Dashboard: React.FC = () => {
  const [entityTypes, setEntityTypes] = useState<EntityType[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [typesResponse, healthResponse] = await Promise.all([
          getEntityTypes(),
          getHealth(),
        ]);
        setEntityTypes(typesResponse.data);
        setHealth(healthResponse.data);
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
      </div>

      {/* System Status */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">System Status</h3>
        </div>
        {health && (
          <div className="grid grid-3">
            <div className="stats-card">
              <div className="stats-value">
                <span className="badge badge-success">{health.status}</span>
              </div>
              <div className="stats-label">Status</div>
            </div>
            <div className="stats-card">
              <div className="stats-value">{health.version}</div>
              <div className="stats-label">Version</div>
            </div>
            <div className="stats-card">
              <div className="stats-value">{health.environment}</div>
              <div className="stats-label">Environment</div>
            </div>
          </div>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-3">
        <div className="card stats-card">
          <div className="stats-value">{entityTypes.length}</div>
          <div className="stats-label">Entity Types</div>
        </div>
      </div>

      {/* Recent Entity Types */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Entity Types</h3>
          <Link to="/entity-types" className="btn btn-primary">
            View All
          </Link>
        </div>
        {entityTypes.length === 0 ? (
          <p>No entity types created yet. Create one to get started!</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entityTypes.slice(0, 5).map((type) => (
                <tr key={type.id}>
                  <td>
                    <strong>{type.name}</strong>
                  </td>
                  <td>{type.description || 'No description'}</td>
                  <td>{new Date(type.createdAt).toLocaleDateString()}</td>
                  <td>
                    <Link
                      to={`/entity-types/${type.id}/instances`}
                      className="btn btn-secondary"
                    >
                      View Instances
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
