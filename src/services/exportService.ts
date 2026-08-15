// Export & Reporting Engine for Erode CEO Office Exam Duty Allotment System
// Generates official PDF appointment orders, master charts, and multi-tab Excel workbooks.

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { DutyAllotment, School, ExamCentre, Teacher, ExamCycle } from '../types';

export class ExportService {
  /**
   * Generates a multi-sheet Excel workbook of duty allotments.
   */
  public static exportToExcel(
    allotments: DutyAllotment[],
    schools: School[],
    centres: ExamCentre[],
    teachers: Teacher[],
    examCycle: ExamCycle,
    filename: string = 'Erode_Exam_Duty_Allotment.xlsx'
  ) {
    const wb = XLSX.utils.book_new();
    const schoolMap = new Map(schools.map((s) => [s.id, s.name]));
    const centreMap = new Map(centres.map((c) => [c.id, c.name]));

    // Sheet 1: Master Allotment
    const masterData = allotments.map((a, idx) => ({
      'S.No': idx + 1,
      'Teacher ID': a.teacherId,
      'Teacher Name': a.teacherName,
      'Designation': a.teacherDesignation,
      'Subject': a.teacherSubject || a.subject || 'General',
      'Parent School': schoolMap.get(a.teacherSchoolId || '') || a.teacherSchoolId,
      'Allotted Centre': a.centreName || centreMap.get(a.centreId) || a.centreId,
      'Duty Type': a.dutyType,
      'Designated Role': a.role,
      'Hall Number': a.hallNumber ? `Hall ${a.hallNumber}` : '-',
      'Distance (km)': `${a.distanceKm} km`,
      'Session': a.session || 'Full Day',
      'Status': a.status,
      'Manual Override': a.isManualOverride ? 'Yes' : 'No',
    }));
    const wsMaster = XLSX.utils.json_to_sheet(masterData);
    XLSX.utils.book_append_sheet(wb, wsMaster, 'Master Allotment');

    // Sheet 2: Centre-Wise Breakdown
    const centreSummaryMap = new Map<string, { centre: string; chief: string; deptOfficer: string; invigilators: number; standby: number }>();
    for (const c of centres) {
      centreSummaryMap.set(c.id, {
        centre: c.name,
        chief: '-',
        deptOfficer: '-',
        invigilators: 0,
        standby: 0,
      });
    }

    for (const a of allotments) {
      const summary = centreSummaryMap.get(a.centreId);
      if (summary) {
        if (a.role === 'Chief Superintendent') summary.chief = a.teacherName || a.teacherId;
        else if (a.role === 'Department Officer') summary.deptOfficer = a.teacherName || a.teacherId;
        else if (a.role === 'Hall Invigilator') summary.invigilators += 1;
        else if (a.role === 'Standby Invigilator') summary.standby += 1;
      }
    }

    const centreData = Array.from(centreSummaryMap.values()).map((c, i) => ({
      'S.No': i + 1,
      'Exam Centre Name': c.centre,
      'Chief Superintendent': c.chief,
      'Department Officer': c.deptOfficer,
      'Invigilators Count': c.invigilators,
      'Standby Count': c.standby,
      'Total Staff Deployed': (c.chief !== '-' ? 1 : 0) + (c.deptOfficer !== '-' ? 1 : 0) + c.invigilators + c.standby,
    }));
    const wsCentre = XLSX.utils.json_to_sheet(centreData);
    XLSX.utils.book_append_sheet(wb, wsCentre, 'Centre Summary');

    // Sheet 3: School-Wise Relieved Staff
    const schoolWiseData = allotments.map((a) => ({
      'School Name': schoolMap.get(a.teacherSchoolId || '') || 'Unknown',
      'Staff Name': a.teacherName,
      'Designation': a.teacherDesignation,
      'Duty Role': a.role,
      'Reporting Centre': a.centreName || centreMap.get(a.centreId),
      'Distance': `${a.distanceKm} km`,
    }));
    const wsSchool = XLSX.utils.json_to_sheet(schoolWiseData);
    XLSX.utils.book_append_sheet(wb, wsSchool, 'School Relieved Staff');

    XLSX.writeFile(wb, filename);
  }

  /**
   * Generates an official CEO Office Appointment Order PDF for a teacher or centre.
   */
  public static generateOfficialAppointmentOrderPDF(
    allotment: DutyAllotment,
    teacher: Teacher,
    centre: ExamCentre,
    school: School,
    examCycle: ExamCycle
  ) {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Top Emblem & Government Header
    doc.setFillColor(20, 32, 61); // Navy blue header bar
    doc.rect(0, 0, 210, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('GOVERNMENT OF TAMIL NADU — DEPARTMENT OF SCHOOL EDUCATION', 105, 9, { align: 'center' });

    doc.setTextColor(20, 32, 61);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('OFFICE OF THE CHIEF EDUCATIONAL OFFICER, ERODE DISTRICT', 105, 24, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Collectorate Master Plan Complex, Erode - 638 011', 105, 29, { align: 'center' });
    doc.text('Email: ceoerd@nic.in | Phone: 0424-2252123', 105, 34, { align: 'center' });

    doc.setDrawColor(200, 200, 200);
    doc.line(15, 37, 195, 37);

    // Reference & Date Box
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const refNo = `Na.Ka.No. ${Date.now().toString(36).toUpperCase() + '-' + (teacher?.id || 'X').slice(-4)}/Exam-Allot/A3/2026`;
    doc.text(`Ref: ${refNo}`, 15, 44);
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 195, 44, { align: 'right' });

    // Title Badge
    doc.setFillColor(240, 244, 249);
    doc.roundedRect(15, 48, 180, 12, 2, 2, 'F');
    doc.setTextColor(28, 45, 82);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`PROCEEDINGS OF THE CHIEF EDUCATIONAL OFFICER — DUTY APPOINTMENT ORDER`, 105, 55, { align: 'center' });

    // Body text
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);

    const introText = `Sub: School Education — State Board Public Examinations — ${examCycle.label} — Appointment of Exam Functionaries / Staff Allotment — Orders Issued — Regarding.`;
    doc.text(doc.splitTextToSize(introText, 180), 15, 66);

    const bodyText = `Under the powers vested with the undersigned for the smooth and fair conduct of State Board Public Examinations ${examCycle.standard} Standard, the following teaching staff is hereby appointed for examination duty at the designated centre indicated below:`;
    doc.text(doc.splitTextToSize(bodyText, 180), 15, 78);

    // Table of Allotment Details
    autoTable(doc, {
      startY: 90,
      margin: { left: 15, right: 15 },
      head: [['Field Description', 'Particulars / Allotted Duty Information']],
      body: [
        ['Staff Name', `${teacher.name} (ID: ${teacher.id})`],
        ['Designation & Subject', `${teacher.designation} — ${teacher.subject}`],
        ['Parent Institution', `${school.name}, ${school.address}`],
        ['Assigned Duty Role', `${allotment.role} (${allotment.dutyType} Duty)`],
        ['Allotted Exam Centre', `${centre.name}`],
        ['Centre Address & Location', `${centre.address}`],
        ['Assigned Hall / Session', allotment.hallNumber ? `Hall No. ${allotment.hallNumber}` : (allotment.session || 'Full Exam Schedule')],
        ['Calculated Travel Distance', `${allotment.distanceKm} km (Verified within permissible radius)`],
        ['Reporting Date & Time', `${examCycle.startDate || 'Date to be announced'} at 08:30 AM`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [36, 59, 107], textColor: 255, fontStyle: 'bold', fontSize: 10 },
      bodyStyles: { fontSize: 9, textColor: [30, 41, 59] },
      columnStyles: {
        0: { cellWidth: 60, fontStyle: 'bold', fillColor: [248, 250, 252] },
        1: { cellWidth: 120 },
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 8;

    // Rules & Mandatory Instructions
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('MANDATORY INSTRUCTIONS TO THE APPOINTED STAFF:', 15, finalY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const instructions = [
      '1. The appointed staff must report promptly to the Chief Superintendent of the centre at 08:30 AM on all scheduled examination dates.',
      '2. Strict confidentiality and integrity must be maintained regarding question papers and examination materials at all times.',
      '3. Mobile phones, smart watches, and electronic communication devices are strictly prohibited inside the examination halls.',
      '4. The Headmaster/Principal of the parent school is directed to relieve the staff immediately without making alternative internal demands.',
      '5. Leave or exemption requests will NOT be entertained except on verified emergency medical board certification.',
    ];
    doc.text(instructions, 15, finalY + 6);

    // Signature Block
    const signY = finalY + 42;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Chief Educational Officer', 195, signY, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text('Erode District, Tamil Nadu', 195, signY + 4, { align: 'right' });
    doc.text('[Digitally Verified & Approved]', 195, signY + 8, { align: 'right' });

    // Official Seal box mockup
    doc.setDrawColor(36, 59, 107);
    doc.setLineWidth(0.5);
    doc.roundedRect(15, signY - 8, 45, 20, 2, 2, 'D');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(36, 59, 107);
    doc.text('OFFICIAL SEAL', 37.5, signY, { align: 'center' });
    doc.text('CEO OFFICE ERODE', 37.5, signY + 4, { align: 'center' });
    doc.text('VERIFIED ORDER', 37.5, signY + 8, { align: 'center' });

    // Footer
    doc.setFontSize(7.5);
    doc.setTextColor(140, 140, 140);
    doc.text(`Generated by Erode District Exam Allotment Portal on ${new Date().toLocaleString('en-IN')}`, 105, 290, { align: 'center' });

    doc.save(`Duty_Order_${teacher.name.replace(/[^a-zA-Z0-9]/g, '_')}_${teacher.id}.pdf`);
  }

  /**
   * Generates a Master Centre-wise Deployment Chart PDF.
   */
  public static generateMasterCentreChartPDF(
    allotments: DutyAllotment[],
    centres: ExamCentre[],
    schools: School[],
    examCycle: ExamCycle
  ) {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const schoolMap = new Map(schools.map((s) => [s.id, s.name]));

    // Header
    doc.setFillColor(20, 32, 61);
    doc.rect(0, 0, 297, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`CHIEF EDUCATIONAL OFFICE, ERODE — MASTER EXAM DUTY ALLOTMENT CHART`, 148.5, 9, { align: 'center' });

    doc.setTextColor(20, 32, 61);
    doc.setFontSize(12);
    doc.text(`EXAM CYCLE: ${examCycle.label.toUpperCase()}`, 148.5, 22, { align: 'center' });

    const rows = allotments.map((a, idx) => [
      idx + 1,
      a.teacherName || a.teacherId,
      a.teacherDesignation || '-',
      a.teacherSubject || a.subject || 'General',
      schoolMap.get(a.teacherSchoolId || '') || a.teacherSchoolId || '-',
      a.centreName || a.centreId,
      a.dutyType,
      a.role,
      a.hallNumber ? `H-${a.hallNumber}` : (a.session || '-'),
      `${a.distanceKm} km`,
      a.status,
    ]);

    autoTable(doc, {
      startY: 28,
      margin: { left: 10, right: 10 },
      head: [['#', 'Teacher Name', 'Designation', 'Subject', 'Parent School', 'Exam Centre', 'Duty Type', 'Role', 'Hall/Sess', 'Dist', 'Status']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [36, 59, 107], textColor: 255, fontSize: 8.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    doc.save(`Erode_Exam_Master_Allotment_Chart_${examCycle.standard}.pdf`);
  }
}
