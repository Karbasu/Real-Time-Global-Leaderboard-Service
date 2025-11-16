import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEntityTypes, createEntityType } from '../api/client';

interface EntityType {
  id: string;
  name: string;
  description: string;
  schema: Record<string, unknown>;
  createdAt: string;
}

const EntityTypes: React.FC = () => {
  const [entityTypes, setEntityTypes] = useState<EntityType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    schema: '{\n  "type": "object",\n  "properties": {}\n}',
  });
  const [error, setError] = useState<string | null>(null);

  const fetchEntityTypes = async () => {
    try {
      setLoading(true);
      const response = await getEntityTypes();
      setEntityTypes(response.data);
    } catch (err) {
      setError('Failed to load entity types');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntityTypes();
  }, []);

  const handleCreateEntityType = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const schemaObj = JSON.parse(formData.schema);
      await createEntityType({
        name: formData.name,
        description: formData.description,
        schema: schemaObj,
      });
      setShowModal(false);
      setFormData({
        name: '',
        description: '',
        schema: '{\n  "type": "object",\n  "properties": {}\n}',
      });
      fetchEntityTypes();
    } catch (err: unknown) {
      if (err instanceof SyntaxError) {
        setError('Invalid JSON schema');
      } else {
        setError('Failed to create entity type');
      }
      console.error(err);
    }
  };

  if (loading) {
    return <div className="loading">Loading entity types...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h2>Entity Types</h2>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">All Entity Types</h3>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            Create Entity Type
          </button>
        </div>

        {entityTypes.length === 0 ? (
          <p>No entity types yet. Create your first entity type to get started!</p>
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
              {entityTypes.map((type) => (
                <tr key={type.id}>
                  <td>
                    <strong>{type.name}</strong>
                  </td>
                  <td>{type.description || 'No description'}</td>
                  <td>{new Date(type.createdAt).toLocaleString()}</td>
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

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Create Entity Type</h3>
              <button
                className="modal-close"
                onClick={() => setShowModal(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateEntityType}>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., user_profile"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Optional description"
                />
              </div>
              <div className="form-group">
                <label>Schema (JSON)</label>
                <textarea
                  className="form-control"
                  value={formData.schema}
                  onChange={(e) =>
                    setFormData({ ...formData, schema: e.target.value })
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

export default EntityTypes;
