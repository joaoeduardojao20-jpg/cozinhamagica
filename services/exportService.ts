
// These are globally available from index.html
declare const html2canvas: any;
declare const jspdf: any;

const exportElement = async (elementId: string, fileName: string, format: 'png' | 'pdf') => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found.`);
    return;
  }
  
  // Temporarily add a class for export styling
  element.classList.add('exporting');
  
  await new Promise(resolve => setTimeout(resolve, 100)); // allow styles to apply

  try {
    const canvas = await html2canvas(element, {
      scale: 2, // Higher scale for better quality
      useCORS: true,
      backgroundColor: '#F6ECDC', // Match the page background
    });

    if (format === 'png') {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${fileName}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (format === 'pdf') {
      const { jsPDF } = jspdf;
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${fileName}.pdf`);
    }
  } catch (error) {
    console.error(`Error exporting to ${format}:`, error);
  } finally {
    // Clean up the class
    element.classList.remove('exporting');
  }
};

export const exportToPng = (elementId: string, fileName: string) => {
  exportElement(elementId, fileName, 'png');
};

export const exportToPdf = (elementId: string, fileName: string) => {
  exportElement(elementId, fileName, 'pdf');
};
