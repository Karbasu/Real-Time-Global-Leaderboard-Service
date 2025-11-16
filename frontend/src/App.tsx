import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import EntityTypes from './pages/EntityTypes';
import EntityInstances from './pages/EntityInstances';
import EntityDetail from './pages/EntityDetail';
import Analytics from './pages/Analytics';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <div className="navbar-brand">
            <h1>Temporal State Engine</h1>
          </div>
          <ul className="navbar-nav">
            <li><Link to="/">Dashboard</Link></li>
            <li><Link to="/entity-types">Entity Types</Link></li>
            <li><Link to="/analytics">Analytics</Link></li>
          </ul>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/entity-types" element={<EntityTypes />} />
            <Route path="/entity-types/:typeId/instances" element={<EntityInstances />} />
            <Route path="/entities/:instanceId" element={<EntityDetail />} />
            <Route path="/analytics" element={<Analytics />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
