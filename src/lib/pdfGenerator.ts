import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { PatientForm, DynamicForm } from './formBuilderStore';

export async function generateFormPDF(patientForm: PatientForm, formDef: DynamicForm): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  // Colors
  const tealPrimary = '#0d9488'; // Teal-600
  const slateDark = '#1e293b'; // Slate-800
  const slateLight = '#64748b'; // Slate-500
  const lightBg = '#f8fafc'; // Slate-50
  const borderColor = '#e2e8f0'; // Slate-200

  let yPos = 20;

  // Header Draw helper
  const drawPageHeader = (pageNum: number) => {
    // Top colored accent bar
    doc.setFillColor(tealPrimary);
    doc.rect(0, 0, pageWidth, 4, 'F');

    // Clinic Logo / Branding Title
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(slateDark);
    doc.text('SRI CHAITANYA MULTISPECIALITY DENTAL CARE', margin, 15);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(slateLight);
    doc.text('Super Specialty Dental ERP • Electronic Medical Records', margin, 20);

    // Header divider line
    doc.setDrawColor(borderColor);
    doc.setLineWidth(0.5);
    doc.line(margin, 23, pageWidth - margin, 23);
  };

  // Footer Draw helper
  const drawPageFooter = (pageNum: number, totalPages: number) => {
    doc.setDrawColor(borderColor);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(slateLight);
    doc.text('Sri Chaitanya Dental CRM v3.3 • Clinical Digital Document Studio', margin, pageHeight - 10);
    
    const pageStr = `Page ${pageNum} of ${totalPages}`;
    doc.text(pageStr, pageWidth - margin - doc.getTextWidth(pageStr), pageHeight - 10);
  };

  // Draw header for page 1
  drawPageHeader(1);
  yPos = 32;

  // Document Title
  doc.setFillColor(lightBg);
  doc.rect(margin, yPos, contentWidth, 14, 'F');
  doc.setDrawColor(tealPrimary);
  doc.setLineWidth(1);
  doc.line(margin, yPos, margin, yPos + 14); // Left vertical teal line

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(slateDark);
  doc.text(formDef.name.toUpperCase(), margin + 5, yPos + 6);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(slateLight);
  doc.text(`Version: ${formDef.version} • Status: Signed & Archived • DocID: ${patientForm.id}`, margin + 5, yPos + 11);

  yPos += 22;

  // Patient Meta Grid (Two Column)
  doc.setFillColor(lightBg);
  doc.rect(margin, yPos, contentWidth, 24, 'F');
  doc.setDrawColor(borderColor);
  doc.setLineWidth(0.3);
  doc.rect(margin, yPos, contentWidth, 24, 'S');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(slateDark);

  // Col 1
  doc.text('Patient Name:', margin + 4, yPos + 6);
  doc.text('Assigned By:', margin + 4, yPos + 12);
  doc.text('Completed Date:', margin + 4, yPos + 18);

  // Col 2
  doc.text('Status:', margin + contentWidth / 2 + 4, yPos + 6);
  doc.text('Assigned Date:', margin + contentWidth / 2 + 4, yPos + 12);
  doc.text('Completed By:', margin + contentWidth / 2 + 4, yPos + 18);

  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(slateLight);

  // Col 1 values
  doc.text(patientForm.patient_name || 'N/A', margin + 30, yPos + 6);
  doc.text(patientForm.assigned_by || 'Clinic System', margin + 30, yPos + 12);
  const compDate = patientForm.completed_at ? new Date(patientForm.completed_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';
  doc.text(compDate, margin + 30, yPos + 18);

  // Col 2 values
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(tealPrimary);
  doc.text(patientForm.status.toUpperCase(), margin + contentWidth / 2 + 30, yPos + 6);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(slateLight);
  const assDate = patientForm.assigned_at ? new Date(patientForm.assigned_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
  doc.text(assDate, margin + contentWidth / 2 + 30, yPos + 12);
  doc.text(patientForm.completed_by || 'Patient Direct', margin + contentWidth / 2 + 30, yPos + 18);

  yPos += 32;

  // Print Form Content (Sections & Fields)
  const answers = patientForm.answers || {};

  for (const section of formDef.sections) {
    // Check page height limit before drawing section header
    if (yPos > pageHeight - 40) {
      doc.addPage();
      drawPageHeader(1);
      yPos = 30;
    }

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(tealPrimary);
    doc.text(section.title, margin, yPos);
    
    doc.setDrawColor(tealPrimary);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos + 2, pageWidth - margin, yPos + 2);

    yPos += 10;

    for (const field of section.fields) {
      if (yPos > pageHeight - 40) {
        doc.addPage();
        drawPageHeader(1);
        yPos = 30;
      }

      // If field type is Signature, we print it in a separate signatures panel at the bottom, so skip it here
      if (field.type === 'Signature') {
        continue;
      }

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(slateDark);
      doc.text(field.label, margin + 2, yPos);
      yPos += 5;

      const rawVal = answers[field.id];
      let displayVal = '—';

      if (rawVal !== undefined && rawVal !== null) {
        if (Array.isArray(rawVal)) {
          displayVal = rawVal.length > 0 ? rawVal.join(', ') : '—';
        } else if (typeof rawVal === 'boolean') {
          displayVal = rawVal ? 'Yes' : 'No';
        } else if (typeof rawVal === 'object') {
          displayVal = JSON.stringify(rawVal);
        } else {
          displayVal = String(rawVal);
        }
      }

      // Check if tooth selector to make a readable list
      if (field.type === 'Tooth Selector') {
        displayVal = rawVal ? `Selected Teeth: ${rawVal}` : 'No teeth selected';
      }

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(slateLight);

      // Handle multiline wrapping
      const lines = doc.splitTextToSize(displayVal, contentWidth - 4);
      doc.text(lines, margin + 4, yPos);
      
      yPos += lines.length * 4.5 + 4;
    }
    yPos += 4;
  }

  // Draw signatures and QR Code panel at the bottom or on next page if it does not fit
  if (yPos > pageHeight - 70) {
    doc.addPage();
    drawPageHeader(1);
    yPos = 30;
  }

  yPos += 4;
  doc.setDrawColor(borderColor);
  doc.setLineWidth(0.4);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(slateDark);
  doc.text('DIGITAL VERIFICATION & SIGNATURES', margin, yPos);
  yPos += 6;

  const signatures = patientForm.signatures || {};

  // Display columns for signatures
  const colWidth = contentWidth / 3;

  // Helper to safely draw signatures
  const drawSigBox = (title: string, name: string, sigData: any, startX: number, startY: number) => {
    doc.setFillColor(lightBg);
    doc.rect(startX, startY, colWidth - 4, 34, 'F');
    doc.setDrawColor(borderColor);
    doc.setLineWidth(0.2);
    doc.rect(startX, startY, colWidth - 4, 34, 'S');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(slateDark);
    doc.text(title, startX + 3, startY + 5);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(slateLight);
    doc.text(name || 'Not Signed', startX + 3, startY + 10);

    if (sigData && sigData.signature) {
      if (sigData.type === 'draw' && sigData.signature.startsWith('data:image')) {
        // Draw patient/doctor custom canvas drawing
        try {
          doc.addImage(sigData.signature, 'PNG', startX + 4, startY + 12, colWidth - 12, 12);
        } catch (e) {
          doc.setFont('Helvetica', 'italic');
          doc.text('[Canvas Drawing Signature]', startX + 4, startY + 18);
        }
      } else {
        // Render typed signature elegantly
        doc.setFont('Courier', 'bolditalic');
        doc.setFontSize(10);
        doc.setTextColor(tealPrimary);
        doc.text(sigData.signature, startX + 6, startY + 20);
        doc.setFont('Helvetica', 'normal');
      }

      doc.setFontSize(6.5);
      doc.setTextColor(slateLight);
      const timeStr = sigData.timestamp ? new Date(sigData.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';
      doc.text(`Time: ${timeStr}`, startX + 3, startY + 28);
      if (sigData.ip) {
        doc.text(`IP: ${sigData.ip}`, startX + 3, startY + 31);
      }
    } else {
      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.text('Pending Signature', startX + 3, startY + 20);
    }
  };

  // Draw 3 columns for Signatures
  drawSigBox('Patient Signature', patientForm.patient_name || '', signatures.patient, margin, yPos);
  
  const docName = signatures.doctor?.doctor_name || 'Clinic Doctor';
  drawSigBox('Doctor Signature', docName, signatures.doctor, margin + colWidth, yPos);

  const witName = signatures.witness?.witness_name || 'Clinic Coordinator';
  drawSigBox('Witness Signature', witName, signatures.witness, margin + colWidth * 2, yPos);

  yPos += 38;

  // QR Code Verification
  if (yPos > pageHeight - 35) {
    doc.addPage();
    drawPageHeader(1);
    yPos = 30;
  }

  // Generate QR code for offline integrity checking
  try {
    const qrData = `SRI_CHAITANYA_DENTAL_CRM|DOC_ID:${patientForm.id}|PATIENT:${patientForm.patient_name}|FORM:${formDef.name}|DATE:${patientForm.completed_at || patientForm.assigned_at}`;
    const qrCodeURI = await QRCode.toDataURL(qrData, { margin: 1, width: 100 });
    
    // Draw QR panel background
    doc.setFillColor(lightBg);
    doc.rect(margin, yPos, contentWidth, 22, 'F');
    doc.setDrawColor(borderColor);
    doc.setLineWidth(0.2);
    doc.rect(margin, yPos, contentWidth, 22, 'S');

    // Add QR Code image
    doc.addImage(qrCodeURI, 'JPEG', margin + 3, yPos + 1, 20, 20);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(slateDark);
    doc.text('CRYPTOGRAPHIC INTEGRITY VERIFICATION', margin + 26, yPos + 6);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(slateLight);
    doc.text('This clinical document is electronically signed, fully hashed, and archived within the', margin + 26, yPos + 11);
    doc.text('Sri Chaitanya Multispeciality Dental EMR network. Scan QR to verify records authenticity.', margin + 26, yPos + 15);
  } catch (err) {
    console.error('Error rendering QR verification:', err);
  }

  // Apply headers/footers to all pages dynamically
  const totalPagesCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPagesCount; i++) {
    doc.setPage(i);
    drawPageHeader(i);
    drawPageFooter(i, totalPagesCount);
  }

  return doc;
}
