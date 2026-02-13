/**
 * Prometheus Tech Scout – PDF Report Generation (SCOUT-002)
 * Lightweight wrapper for jsPDF + html2canvas PDF export.
 * NOTE: Requires external deps. Provides a CDN-based loader.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PDF Generator
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let jsPDFLoaded = false;
let html2canvasLoaded = false;

/**
 * Dynamically load jsPDF from CDN.
 */
async function loadJsPDF() {
    if (jsPDFLoaded || typeof window.jspdf !== 'undefined') return;

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js';
        script.onload = () => { jsPDFLoaded = true; resolve(); };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

/**
 * Dynamically load html2canvas from CDN.
 */
async function loadHtml2Canvas() {
    if (html2canvasLoaded || typeof window.html2canvas !== 'undefined') return;

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.onload = () => { html2canvasLoaded = true; resolve(); };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

/**
 * Generate a PDF report from HTML content.
 * @param {object} options
 * @param {string} options.title - Report title
 * @param {HTMLElement} options.contentElement - Element to capture
 * @param {string} [options.filename='report.pdf']
 * @param {string} [options.orientation='portrait'] - 'portrait' | 'landscape'
 * @returns {Promise<void>}
 */
export async function generatePDFReport(options) {
    const { title, contentElement, filename = 'prometheus-report.pdf', orientation = 'portrait' } = options;

    await Promise.all([loadJsPDF(), loadHtml2Canvas()]);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation,
        unit: 'mm',
        format: 'a4',
    });

    // Header
    doc.setFontSize(20);
    doc.setTextColor(6, 182, 212); // cyan
    doc.text(title || 'Prometheus Report', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, 14, 28);
    doc.line(14, 30, 196, 30);

    // Capture content as image
    if (contentElement) {
        const canvas = await window.html2canvas(contentElement, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#0f0f1a',
        });

        const imgData = canvas.toDataURL('image/png');
        const pageWidth = doc.internal.pageSize.getWidth() - 28;
        const pageHeight = doc.internal.pageSize.getHeight() - 40;
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
        const scaledWidth = imgWidth * ratio;
        const scaledHeight = imgHeight * ratio;

        doc.addImage(imgData, 'PNG', 14, 35, scaledWidth, scaledHeight);
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(`Prometheus Market Simulator – Página ${i}/${pageCount}`, 14, doc.internal.pageSize.getHeight() - 10);
    }

    doc.save(filename);
}

/**
 * Generate a simple text-based PDF (no html2canvas needed).
 * @param {object} data
 * @param {string} [filename]
 */
export async function generateTextPDF(data, filename = 'prometheus-summary.pdf') {
    await loadJsPDF();

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setTextColor(6, 182, 212);
    doc.text(data.title || 'Resumen Ejecutivo', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    let y = 35;

    if (data.sections) {
        for (const section of data.sections) {
            doc.setFontSize(12);
            doc.setTextColor(40, 40, 40);
            doc.text(section.heading, 14, y);
            y += 7;

            doc.setFontSize(10);
            doc.setTextColor(80, 80, 80);
            const lines = doc.splitTextToSize(section.body, 180);
            doc.text(lines, 14, y);
            y += lines.length * 5 + 5;

            if (y > 270) {
                doc.addPage();
                y = 20;
            }
        }
    }

    doc.save(filename);
}

/**
 * Check if PDF dependencies are available.
 */
export function isPDFReady() {
    return {
        jsPDF: typeof window.jspdf !== 'undefined',
        html2canvas: typeof window.html2canvas !== 'undefined',
    };
}
