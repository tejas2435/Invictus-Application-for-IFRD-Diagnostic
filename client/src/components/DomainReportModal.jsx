import React, { useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import {
  Chart, RadarController, RadialLinearScale,
  PointElement, LineElement, Filler, Tooltip, Legend
} from 'chart.js';

Chart.register(RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

import { computeDomainScores, scoreToBand } from '../utils/computeScores';
import { generatePDF, generateExcel, generateCSV } from '../utils/exportUtils';

export default function DomainReportModal({ evaluation, onClose, showExport = false }) {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const radarDivRef = useRef(null);
  const breakdownDivRef = useRef(null);

  const domainScores = computeDomainScores(evaluation.responses);
  const overallAvg = parseFloat(
    (domainScores.reduce((s, d) => s + d.avg, 0) / domainScores.length).toFixed(2)
  );

  useEffect(() => {
    if (!chartRef.current) return;

    // Destroy previous instance if exists
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    chartInstanceRef.current = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: domainScores.map(d => d.name),
        datasets: [{
          label: evaluation.profiles?.full_name || 'Participant',
          data: domainScores.map(d => d.avg),
          fill: true,
          backgroundColor: 'rgba(0, 230, 118, 0.15)',
          borderColor: '#00e676',
          pointBackgroundColor: '#00e676',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#00e676',
          pointRadius: 5,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          r: {
            min: 0,
            max: 5,
            ticks: {
              stepSize: 1,
              color: 'rgba(255,255,255,0.5)',
              backdropColor: 'transparent',
              font: { size: 11 }
            },
            grid: { color: 'rgba(255,255,255,0.1)' },
            angleLines: { color: 'rgba(255,255,255,0.15)' },
            pointLabels: {
              color: '#f0f0f0',
              font: { size: 11, weight: '500' }
            }
          }
        },
        plugins: {
          legend: {
            labels: { color: '#f0f0f0', font: { size: 12 } },
            onClick: null
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` Score: ${ctx.raw} / 5`
            }
          }
        }
      }
    });

    return () => {
      if (chartInstanceRef.current) chartInstanceRef.current.destroy();
    };
  }, [evaluation]);

  const overall = scoreToBand(overallAvg);

  // Export always renders at desktop width so the image looks great regardless of device
  const exportElement = async (elementRef, filename) => {
    if (!elementRef.current) return;
    try {
      const canvas = await html2canvas(elementRef.current, {
        backgroundColor: '#0f0f0f',
        scale: 2,
        windowWidth: 1200,
        useCORS: true
      });
      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export. Please try again.');
    }
  };

  const participantName = evaluation.profiles?.full_name || 'Participant';

  return (
    <div className="modal-overlay">
      <div className="modal-inner">
        {/* Header */}
        <div className="diag-header" style={{ marginBottom: '24px' }}>
          <div className="diag-header-left" style={{ flex: 1 }}>
            <h2 style={{ margin: 0, color: '#fff', fontSize: '1.2rem' }}>
              Domain Report
            </h2>
            <div style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.85rem' }}>
              {evaluation.profiles?.full_name}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: '#fff',
            fontSize: '1.5rem', cursor: 'pointer', borderRadius: '6px', width: '40px', height: '40px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>×</button>
        </div>

        {/* ── EXPORT 1: banner + radar ── */}
        <div className="modal-section-header">
          <h3 style={{ color: '#fff', margin: 0, fontSize: '1rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Radar — Future Readiness Profile™
          </h3>
          <button className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem' }}
            onClick={() => exportElement(radarDivRef, `${participantName}_Radar.jpg`)}>
            Export Graph to JPG
          </button>
        </div>

        <div ref={radarDivRef} style={{ background: '#111', padding: '24px', borderRadius: '12px', marginBottom: '30px' }}>
          {/* Overall Score Banner */}
          <div className="score-banner" style={{ border: `1px solid ${overall.color}40`, borderLeft: `4px solid ${overall.color}` }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className="score-value" style={{ fontSize: '3rem', fontWeight: 800, color: overall.color, lineHeight: 1 }}>{overallAvg}</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginTop: '4px' }}>Overall / 5.00</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: overall.color }}>{overall.label}</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginTop: '2px' }}>
                Invictus Future Readiness Index™
              </div>
            </div>
          </div>

          {/* Radar Chart */}
          <canvas ref={chartRef} style={{ maxHeight: '480px' }} />
        </div>

        {/* ── EXPORT 2: banner + breakdown + legend ── */}
        <div className="modal-section-header">
          <h3 style={{ color: '#fff', margin: 0, fontSize: '1rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Domain Breakdown
          </h3>
          <button className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem' }}
            onClick={() => exportElement(breakdownDivRef, `${participantName}_Breakdown.jpg`)}>
            Export Details to JPG
          </button>
        </div>

        <div ref={breakdownDivRef} style={{ background: '#111', padding: '24px', borderRadius: '12px', marginBottom: '30px' }}>
          {/* Overall Score Banner (repeated for context) */}
          <div className="score-banner" style={{ border: `1px solid ${overall.color}40`, borderLeft: `4px solid ${overall.color}` }}>
            <div>
              <div style={{ fontSize: '3rem', fontWeight: 800, color: overall.color, lineHeight: 1 }}>{overallAvg}</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginTop: '4px' }}>Overall / 5.00</div>
            </div>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: overall.color }}>{overall.label}</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginTop: '2px' }}>
                {participantName} — Invictus Future Readiness Index™
              </div>
            </div>
          </div>

          {/* Domain Breakdown bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            {domainScores.map((d, i) => {
              const band = scoreToBand(d.avg);
              const pct = (d.avg / 5) * 100;
              return (
                <div key={i}>
                  <div className="domain-row-meta">
                    <div style={{ fontSize: '0.9rem', color: '#f0f0f0' }}>
                      <span style={{ color: 'rgba(255,255,255,0.4)', marginRight: '8px', fontSize: '0.8rem' }}>D{i + 1}</span>
                      {d.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '0.75rem', color: band.color, background: `${band.color}18`, padding: '2px 8px', borderRadius: '99px' }}>
                        {band.label}
                      </span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: band.color, minWidth: '40px', textAlign: 'right' }}>
                        {d.avg}
                      </span>
                    </div>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: band.color, borderRadius: '3px' }} />
                  </div>
                  {d.answered < d.total && (
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,200,0,0.7)', marginTop: '3px' }}>
                      ⚠ {d.answered}/{d.total} questions answered
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Score Legend */}
          <div className="score-legend">
            {[
              { range: '4.5 – 5.0', label: 'Highly Ready', color: '#00e676' },
              { range: '3.5 – 4.4', label: 'Ready', color: '#69f0ae' },
              { range: '2.5 – 3.4', label: 'Developing', color: '#ffc800' },
              { range: '1.5 – 2.4', label: 'At Risk', color: '#ff9800' },
              { range: '1.0 – 1.4', label: 'Critical Gap', color: '#ff1744' }
            ].map(b => (
              <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: b.color, flexShrink: 0 }} />
                <span style={{ color: b.color }}>{b.label}</span>
                <span>{b.range}</span>
              </div>
            ))}
          </div>
        </div>
        <button onClick={onClose} style={{
          width: '100%', padding: '14px', background: 'transparent',
          border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.5)',
          borderRadius: '8px', cursor: 'pointer', fontSize: '0.95rem'
        }}>
          Close Report
        </button>
      </div>
    </div>
  );
}
