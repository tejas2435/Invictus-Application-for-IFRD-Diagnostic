import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { questionnaireData } from '../data/questionnaire.js';

const PADDING = 15;
const LINE_HEIGHT = 7;
const PAGE_HEIGHT = 297; // A4
const PAGE_WIDTH = 210;

import { Chart, RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';

Chart.register(RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const formatExportAnswer = (answer) => {
  if (answer === null || answer === undefined) return '— No Response —';
  if (typeof answer === 'string' || typeof answer === 'number' || typeof answer === 'boolean') {
    return answer.toString();
  } else if (answer.items) {
    let display = answer.items.join(', ');
    if (answer.other) display += ` (Other: ${answer.other})`;
    return display;
  } else if (answer.main) {
    let display = answer.main;
    if (answer.other) display += ` (Other: ${answer.other})`;
    return display;
  }
  try { return typeof answer === 'object' ? JSON.stringify(answer) : String(answer); }
  catch { return String(answer); }
};

function checkPageBreak(doc, currentY, requiredSpace = LINE_HEIGHT) {
  if (currentY + requiredSpace > PAGE_HEIGHT - PADDING) {
    doc.addPage();
    return PADDING + 10;
  }
  return currentY;
}

export async function generatePDF(evaluation, domainScores, overallBand) {
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const pName = evaluation.profiles?.full_name || 'Participant';
  
  // PAGE 1: Cover Page
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(28);
  doc.text('Invictus Future Readiness Diagnostic™', PAGE_WIDTH / 2, 80, { align: 'center' });
  
  doc.setFontSize(18);
  doc.setTextColor(80, 80, 80);
  doc.text('Comprehensive Assessment Report', PAGE_WIDTH / 2, 95, { align: 'center' });

  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  let startY = 140;
  doc.text(`Participant: ${pName} ${evaluation.profiles?.preferred_name ? '('+evaluation.profiles.preferred_name+')' : ''}`, PADDING, startY); startY += LINE_HEIGHT;
  doc.text(`Email: ${evaluation.profiles?.email || 'N/A'}`, PADDING, startY); startY += LINE_HEIGHT;
  const orgNameFull = formatExportAnswer(evaluation.responses?.s1_partB?.B1);
  const indNameFull = formatExportAnswer(evaluation.responses?.s1_partB?.B5);
  doc.text(`Organisation: ${orgNameFull === '— No Response —' ? 'N/A' : orgNameFull}`, PADDING, startY); startY += LINE_HEIGHT;
  doc.text(`Industry: ${indNameFull === '— No Response —' ? 'N/A' : indNameFull}`, PADDING, startY); startY += LINE_HEIGHT;
  doc.text(`Reference No: ${evaluation.reference_number || 'N/A'}`, PADDING, startY); startY += LINE_HEIGHT;
  doc.text(`Date: ${new Date(evaluation.created_at || Date.now()).toLocaleDateString()}`, PADDING, startY);
  
  // Render Chart Off-Screen
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 600;
  canvas.style.position = 'fixed';
  canvas.style.top = '-9999px';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const chartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: domainScores.map(d => d.name),
      datasets: [{
        label: pName,
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
      responsive: false,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        r: {
          min: 0, max: 5,
          ticks: { stepSize: 1, color: '#666', backdropColor: 'transparent', font: { size: 11 } },
          grid: { color: 'rgba(0,0,0,0.1)' },
          angleLines: { color: 'rgba(0,0,0,0.1)' },
          pointLabels: { color: '#333', font: { size: 11, weight: '500' } }
        }
      },
      plugins: {
        legend: { labels: { color: '#333', font: { size: 12 } }, onClick: null }
      }
    }
  });

  const chartImage = chartInstance.toBase64Image();
  chartInstance.destroy();
  document.body.removeChild(canvas);

  // PAGE 2: CRI Page & Scores
  doc.addPage();
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(20);
  doc.text('Domain Scores & Reliability', PADDING, 20);
  
  const overallAvg = parseFloat((domainScores.reduce((s, d) => s + d.avg, 0) / domainScores.length).toFixed(2));
  const overallCri = parseFloat((domainScores.reduce((s, d) => s + d.cri, 0) / domainScores.length).toFixed(2));
  
  doc.setFontSize(14);
  doc.text(`Overall Future Readiness Index (FRI): ${overallAvg} / 5.00  (${overallBand.label})`, PADDING, 35);
  doc.text(`Overall Confidence Reliability Index (CRI): ${overallCri} / 5.00`, PADDING, 42);
  
  // Sorted domains
  const sortedByFri = [...domainScores].sort((a,b) => b.fri - a.fri);
  const strengths = sortedByFri.slice(0, 5);
  const blindspots = sortedByFri.slice(-5).reverse();
  
  doc.setFontSize(14);
  doc.text('Top 5 Strengths:', PADDING, 55);
  doc.setFontSize(12);
  doc.setTextColor(0, 150, 50);
  strengths.forEach((s, i) => {
    doc.text(`${i+1}. ${s.name} - ${s.fri}`, PADDING + 5, 63 + i * 7);
  });
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.text('Top 5 Blind Spots:', PAGE_WIDTH / 2, 55);
  doc.setFontSize(12);
  doc.setTextColor(200, 50, 50);
  blindspots.forEach((s, i) => {
    doc.text(`${i+1}. ${s.name} - ${s.fri}`, PAGE_WIDTH / 2 + 5, 63 + i * 7);
  });

  doc.setTextColor(0, 0, 0);
  // Add Chart Image
  doc.addImage(chartImage, 'PNG', PADDING, 105, 140, 140);

  // PAGE 3+: Full Responses
  doc.addPage();
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');
  doc.setTextColor(0, 0, 0);
  
  doc.setFontSize(20);
  doc.text('Full Assessment Responses', PADDING, 20);
  
  let y = 35;
  doc.setFontSize(10);
  
  questionnaireData.forEach(section => {
    const sectionResponses = evaluation.responses?.[section.id] || {};
    // skip if empty
    if (Object.keys(sectionResponses).length === 0) return;
    
    y = checkPageBreak(doc, y, 15);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(section.title, PADDING, y);
    y += 10;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    section.questions.forEach(q => {
      let rawAnswer = sectionResponses[q.id];
      if (rawAnswer) {
        let questionText = q.text;
        // Basic wraparound for long questions
        let splitText = doc.splitTextToSize(`Q: ${questionText}`, PAGE_WIDTH - 2 * PADDING);
        y = checkPageBreak(doc, y, splitText.length * LINE_HEIGHT + LINE_HEIGHT);
        doc.text(splitText, PADDING, y);
        y += splitText.length * 6;
        
        let answer = formatExportAnswer(rawAnswer);
        let ansText = `A: ${answer}`;
        let splitAns = doc.splitTextToSize(ansText, PAGE_WIDTH - 2 * PADDING - 10);
        doc.setTextColor(30, 30, 150);
        doc.text(splitAns, PADDING + 5, y);
        y += splitAns.length * 6 + 4;
        doc.setTextColor(0, 0, 0);
      }
    });
    y += 5;
  });
  
  doc.save(`IFRD_Report_${pName.replace(/\s+/g,'_')}_${new Date().toISOString().split('T')[0]}.pdf`);
}

export function generateExcel(evaluation, domainScores, overallBand) {
  const pName = evaluation.profiles?.full_name || 'Participant';
  const wb = XLSX.utils.book_new();

  // Sheet 1: Summary
  const overallAvg = parseFloat((domainScores.reduce((s, d) => s + d.avg, 0) / domainScores.length).toFixed(2));
  const overallCri = parseFloat((domainScores.reduce((s, d) => s + d.cri, 0) / domainScores.length).toFixed(2));

  const summaryData = [
    ['Participant Name', pName],
    ['Email', evaluation.profiles?.email || 'N/A'],
    ['Organisation', formatExportAnswer(evaluation.responses?.s1_partB?.B1) === '— No Response —' ? 'N/A' : formatExportAnswer(evaluation.responses?.s1_partB?.B1)],
    ['Reference Number', evaluation.reference_number || 'N/A'],
    ['Date Completed', new Date(evaluation.created_at || Date.now()).toLocaleDateString()],
    [''],
    ['Overall FRI', overallAvg],
    ['Overall FRI Band', overallBand.label],
    ['Overall CRI', overallCri]
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  // Sheet 2: Domain Scores
  const domainData = [['Domain', 'FRI Score', 'CRI Score', 'Questions Answered', 'Total Questions']];
  domainScores.forEach(d => {
    domainData.push([d.name, d.fri, d.cri, d.answered, d.total]);
  });
  const domainSheet = XLSX.utils.aoa_to_sheet(domainData);
  XLSX.utils.book_append_sheet(wb, domainSheet, 'Domain Scores');

  // Sheet 3: Full Responses
  const responseData = [['Section', 'Question ID', 'Question', 'Answer']];
  questionnaireData.forEach(section => {
    const sectionResponses = evaluation.responses?.[section.id] || {};
    section.questions.forEach(q => {
      let rawAnswer = sectionResponses[q.id];
      if (rawAnswer) {
        responseData.push([section.title, q.id, q.text, formatExportAnswer(rawAnswer)]);
      }
    });
  });
  const responseSheet = XLSX.utils.aoa_to_sheet(responseData);
  XLSX.utils.book_append_sheet(wb, responseSheet, 'Full Responses');

  XLSX.writeFile(wb, `IFRD_Data_${pName.replace(/\s+/g,'_')}.xlsx`);
}

export function generateCSV(evaluation) {
  const pName = evaluation.profiles?.full_name || 'Participant';
  let csv = 'Section,Question ID,Question,Answer\n';
  
  questionnaireData.forEach(section => {
    const sectionResponses = evaluation.responses?.[section.id] || {};
    section.questions.forEach(q => {
      let rawAnswer = sectionResponses[q.id];
      if (rawAnswer) {
        const qText = q.text.replace(/"/g, '""');
        const ansText = formatExportAnswer(rawAnswer).replace(/"/g, '""');
        csv += `"${section.title}","${q.id}","${qText}","${ansText}"\n`;
      }
    });
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `IFRD_Responses_${pName.replace(/\s+/g,'_')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
