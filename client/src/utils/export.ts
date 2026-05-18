import html2canvas from 'html2canvas';

/**
 * Export a DOM element as PNG image download
 */
export async function exportAsImage(element: HTMLElement, filename: string): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/**
 * Export a DOM element as PDF download (using simple canvas-to-PDF)
 */
export async function exportAsPDF(element: HTMLElement, filename: string): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  // Simple PDF: canvas image in an HTML page, then print
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('请允许弹出窗口以导出 PDF');
    return;
  }

  const imgData = canvas.toDataURL('image/png');
  const widthPx = canvas.width;
  const heightPx = canvas.height;
  const widthMm = (widthPx / 2) * 0.2646; // 2x scale -> divide by 2, then px->mm
  const heightMm = (heightPx / 2) * 0.2646;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head><title>${filename}</title>
    <style>
      @page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }
      body { margin: 0; padding: 0; }
      img { width: 100%; height: auto; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style>
    </head>
    <body><img src="${imgData}" /></body>
    </html>
  `);
  printWindow.document.close();

  // Wait for content to render, then trigger print
  setTimeout(() => {
    printWindow.print();
  }, 500);
}
