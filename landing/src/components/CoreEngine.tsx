import React from 'react';
import { Activity, ScanLine, Layers, Maximize, Cpu } from 'lucide-react';
import './CoreEngine.css';

const CoreEngine: React.FC = () => {
  return (
    <section className="engine-section section-padding">
      <div className="container">
        
        <div className="engine-header text-center">
          <h2 className="section-title">Cognitive Spatial Engine</h2>
          <p className="section-description mx-auto">
            Our proprietary architecture interprets multi-dimensional spatial data, translating visual inputs into quantifiable commercial and aesthetic metrics.
          </p>
        </div>

        <div className="engine-interface glass-panel">
          
          <div className="interface-sidebar">
            <div className="sidebar-module active">
              <ScanLine size={18} className="module-icon" />
              <span>Spatial Scanning</span>
            </div>
            <div className="sidebar-module">
              <Layers size={18} className="module-icon" />
              <span>Material Continuity</span>
            </div>
            <div className="sidebar-module">
              <Maximize size={18} className="module-icon" />
              <span>Perceived Volume</span>
            </div>
            <div className="sidebar-module">
              <Cpu size={18} className="module-icon" />
              <span>Friction Analysis</span>
            </div>
          </div>

          <div className="interface-main">
            
            <div className="main-viewport">
              <div className="viewport-grid"></div>
              <div className="blueprint-overlay">
                <div className="blueprint-room"></div>
                <div className="blueprint-room small"></div>
                <div className="blueprint-path"></div>
                
                <div className="scanner-line"></div>
                
                <div className="data-node n1">
                  <span className="node-pulse"></span>
                  <div className="node-tooltip">Light reflection: Optimal</div>
                </div>
                <div className="data-node n2">
                  <span className="node-pulse"></span>
                  <div className="node-tooltip">Joint alignment: 98%</div>
                </div>
              </div>
            </div>

            <div className="main-diagnostics">
              <div className="diagnostic-card">
                <div className="card-top">
                  <span className="d-label">Luxury Indicator</span>
                  <Activity size={16} className="d-icon" />
                </div>
                <div className="d-value">A+</div>
                <div className="d-bar-container">
                  <div className="d-bar" style={{ width: '92%' }}></div>
                </div>
              </div>

              <div className="diagnostic-card">
                <div className="card-top">
                  <span className="d-label">Spatial Coherence</span>
                  <Activity size={16} className="d-icon" />
                </div>
                <div className="d-value">8.9/10</div>
                <div className="d-bar-container">
                  <div className="d-bar" style={{ width: '89%' }}></div>
                </div>
              </div>

              <div className="diagnostic-card outline">
                <span className="d-label highlight">Commercial Opportunity</span>
                <p className="d-text">Upgrade to 120x120 format would increase perceived property value by ~4.2% based on local luxury comparables.</p>
              </div>
            </div>
            
          </div>
        </div>

      </div>
    </section>
  );
};

export default CoreEngine;
