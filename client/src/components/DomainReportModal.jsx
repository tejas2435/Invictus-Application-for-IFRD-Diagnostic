import React, { useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import {
  Chart, RadarController, RadialLinearScale,
  PointElement, LineElement, Filler, Tooltip, Legend
} from 'chart.js';

Chart.register(RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

// Map LIKERT text → numeric score 1–5
const LIKERT_SCORE = {
  'Strongly Disagree': 1,
  'Disagree': 2,
  'Neutral / Unsure': 3,
  'Agree': 4,
  'Strongly Agree': 5
};

// The 12 domains with their section-part id and the 11 scored question IDs
const DOMAIN_CONFIG = [
  {
    partId: 's2_domain1', name: 'Strategic Readiness',
    qIds: ['D1_Q1','D1_Q2','D1_Q3','D1_Q4','D1_Q5','D1_Q6','D1_Q7','D1_Q8','D1_Q9','D1_Q10','D1_Q11']
  },
  {
    partId: 's2_domain2', name: 'Leadership Readiness',
    qIds: ['D2_Q12','D2_Q13','D2_Q14','D2_Q15','D2_Q16','D2_Q17','D2_Q18','D2_Q19','D2_Q20','D2_Q21','D2_Q22']
  },
  {
    partId: 's2_domain3', name: 'Signal Readiness',
    qIds: ['D3_Q23','D3_Q24','D3_Q25','D3_Q26','D3_Q27','D3_Q28','D3_Q29','D3_Q30','D3_Q31','D3_Q32','D3_Q33']
  },
  {
    partId: 's2_domain4', name: 'Decision Intelligence',
    qIds: ['D4_Q34','D4_Q35','D4_Q36','D4_Q37','D4_Q38','D4_Q39','D4_Q40','D4_Q41','D4_Q42','D4_Q43','D4_Q44']
  },
  {
    partId: 's2_domain5', name: 'Problem Framing',
    qIds: ['D5_Q45','D5_Q46','D5_Q47','D5_Q48','D5_Q49','D5_Q50','D5_Q51','D5_Q52','D5_Q53','D5_Q54','D5_Q55']
  },
  {
    partId: 's2_domain6', name: 'Governance Readiness',
    qIds: ['D6_Q56','D6_Q57','D6_Q58','D6_Q59','D6_Q60','D6_Q61','D6_Q62','D6_Q63','D6_Q64','D6_Q65','D6_Q66']
  },
  {
    partId: 's2_domain7', name: 'AI Governance',
    qIds: ['D7_Q67','D7_Q68','D7_Q69','D7_Q70','D7_Q71','D7_Q72','D7_Q73','D7_Q74','D7_Q75','D7_Q76','D7_Q77']
  },
  {
    partId: 's2_domain8', name: 'Workforce Readiness',
    qIds: ['D8_Q78','D8_Q79','D8_Q80','D8_Q81','D8_Q82','D8_Q83','D8_Q84','D8_Q85','D8_Q86','D8_Q87','D8_Q88']
  },
  {
    partId: 's2_domain9', name: 'Learning Velocity',
    qIds: ['D9_Q89','D9_Q90','D9_Q91','D9_Q92','D9_Q93','D9_Q94','D9_Q95','D9_Q96','D9_Q97','D9_Q98','D9_Q99']
  },
  {
    partId: 's2_domain10', name: 'Adaptive Capacity',
    qIds: ['D10_Q100','D10_Q101','D10_Q102','D10_Q103','D10_Q104','D10_Q105','D10_Q106','D10_Q107','D10_Q108','D10_Q109','D10_Q110']
  },
  {
    partId: 's2_domain11', name: 'Ecosystem Readiness',
    qIds: ['D11_Q111','D11_Q112','D11_Q113','D11_Q114','D11_Q115','D11_Q116','D11_Q117','D11_Q118','D11_Q119','D11_Q120','D11_Q121']
  },
  {
    partId: 's2_domain12', name: 'Strategic Integrity',
    qIds: ['D12_Q122','D12_Q123','D12_Q124','D12_Q125','D12_Q126','D12_Q127','D12_Q128','D12_Q129','D12_Q130','D12_Q131','D12_Q132']
  }
];

function computeDomainScores(responses) {
  return DOMAIN_CONFIG.map(domain => {
    const partResponses = responses?.[domain.partId] || {};
    const scores = domain.qIds
      .map(qId => LIKERT_SCORE[partResponses[qId]] || null)
      .filter(s => s !== null);

    const avg = scores.length > 0
      ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2))
      : 0;

    return { name: domain.name, avg, answered: scores.length, total: domain.qIds.length };
  });
}

export default function DomainReportModal({ evaluation, onClose }) {
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

  const scoreToBand = (score) => {
    if (score >= 4.5) return { label: 'Highly Ready', color: '#00e676' };
    if (score >= 3.5) return { label: 'Ready', color: '#69f0ae' };
    if (score >= 2.5) return { label: 'Developing', color: '#ffc800' };
    if (score >= 1.5) return { label: 'At Risk', color: '#ff9800' };
    return { label: 'Critical Gap', color: '#ff1744' };
  };

  const overall = scoreToBand(overallAvg);

  const exportElement = async (elementRef, filename) => {
    if (!elementRef.current) return;
    try {
      const canvas = await html2canvas(elementRef.current, { backgroundColor: '#0f0f0f' });
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
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'flex-start',
      justifyContent: 'center', zIndex: 2000, overflowY: 'auto', padding: '40px 20px'
    }}>
      <div style={{ maxWidth: '900px', width: '100%' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
          <div>
            <h2 style={{ margin: 0, color: '#fff', fontSize: '1.5rem' }}>
              Domain Report Summary
            </h2>
            <div style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.9rem' }}>
              {evaluation.profiles?.full_name}
              {evaluation.profiles?.preferred_name ? ` (${evaluation.profiles.preferred_name})` : ''} — ID: {evaluation.profiles?.custom_id}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: '#fff',
            fontSize: '1.5rem', cursor: 'pointer', borderRadius: '6px', width: '40px', height: '40px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>×</button>
        </div>

        {/* ── EXPORT 1: banner + radar ── */}
        <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
          <div style={{
            background: 'rgba(255,255,255,0.04)', border: `1px solid ${overall.color}40`,
            borderLeft: `4px solid ${overall.color}`, borderRadius: '8px',
            padding: '20px 25px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '30px'
          }}>
            <div>
              <div style={{ fontSize: '3rem', fontWeight: 800, color: overall.color, lineHeight: 1 }}>{overallAvg}</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginTop: '4px' }}>Overall / 5.00</div>
            </div>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: overall.color }}>{overall.label}</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginTop: '2px' }}>
                Invictus Future Readiness Index™ — Based on 12 domains, 132 questions
              </div>
            </div>
          </div>

          {/* Radar Chart */}
          <canvas ref={chartRef} style={{ maxHeight: '480px' }} />
        </div>

        {/* ── EXPORT 2: banner + breakdown + legend ── */}
        <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
          <div style={{
            background: 'rgba(255,255,255,0.04)', border: `1px solid ${overall.color}40`,
            borderLeft: `4px solid ${overall.color}`, borderRadius: '8px',
            padding: '20px 25px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '30px'
          }}>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
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
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
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
