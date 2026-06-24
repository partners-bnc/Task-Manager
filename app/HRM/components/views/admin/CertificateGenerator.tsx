'use client';

import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import { pdf } from '@react-pdf/renderer';
import CertificatePDF, { CERTIFICATE_CONFIG } from './CertificatePDF';

// Inject Google Fonts and raw custom TrueType/OpenType font faces for the live preview to match the styling
const injectFonts = () => {
  if (typeof window === 'undefined') return;
  const id = 'certificate-generator-fonts';
  if (document.getElementById(id)) return;

  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Caveat&display=swap';
  document.head.appendChild(link);

  const style = document.createElement('style');
  style.id = 'certificate-custom-font-faces';
  style.innerHTML = `
    @font-face {
      font-family: 'TaylorGothic';
      src: url('/assets/TaylorGothic.ttf') format('truetype');
    }
    @font-face {
      font-family: '001SansSerifDemo';
      src: url('/assets/001SansSerifDemo.otf') format('opentype');
    }
    @font-face {
      font-family: 'DecemberCalligraphy';
      src: url('/assets/DecemberCalligraphy.ttf') format('truetype');
    }
  `;
  document.head.appendChild(style);
};

export default function CertificateGenerator() {
  // Mode toggle: 'directory' vs 'manual'
  const [mode, setMode] = useState<'directory' | 'manual'>('directory');

  // Form fields
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmployeeId, setRecipientEmployeeId] = useState('');
  const [designation, setDesignation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Search & directory states
  const [employees, setEmployees] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Issued certificates state
  const [issuedCertificates, setIssuedCertificates] = useState<any[]>([]);
  const [loadingCertificates, setLoadingCertificates] = useState(true);
  const [certificatesSearch, setCertificatesSearch] = useState('');
  const [migrationNeeded, setMigrationNeeded] = useState(false);

  // General state
  const [generating, setGenerating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // For QR code dynamic generation in the preview
  const [previewQrCodeUrl, setPreviewQrCodeUrl] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    injectFonts();
    loadEmployees();
    loadCertificates();
  }, []);

  // Update preview QR code in real-time
  useEffect(() => {
    if (!isClient) return;
    const dummyUrl = `${window.location.origin}/verify/certificate/BNC-INT-YYYYMM-XXXX`;
    QRCode.toDataURL(dummyUrl, { color: { dark: '#FFFFFF', light: '#00000000' }, margin: 1 })
      .then(setPreviewQrCodeUrl)
      .catch((err) => console.error('Error generating preview QR:', err));
  }, [isClient]);

  // Load existing employees for directory mode
  async function loadEmployees() {
    try {
      setLoadingEmployees(true);
      const response = await fetch('/HRM/api/employees?includeMeta=1');
      const result = await response.json();
      if (response.ok) {
        setEmployees(result.employees || []);
      }
    } catch (err) {
      console.error('Failed to load employees for certificate generation search:', err);
    } finally {
      setLoadingEmployees(false);
    }
  }

  // Load previously generated certificates
  async function loadCertificates(searchQuery = '') {
    try {
      setLoadingCertificates(true);
      const url = searchQuery
        ? `/HRM/api/admin/certificates?search=${encodeURIComponent(searchQuery)}`
        : '/HRM/api/admin/certificates';
      const response = await fetch(url);
      const result = await response.json();

      if (response.ok) {
        setIssuedCertificates(result.certificates || []);
        setMigrationNeeded(false);
      } else if (result.error === 'database_migration_needed') {
        setMigrationNeeded(true);
      } else {
        setErrorMsg(result.error || 'Failed to load issued certificates');
      }
    } catch (err) {
      console.error('Error loading certificates list:', err);
      setErrorMsg('Failed to load issued certificates');
    } finally {
      setLoadingCertificates(false);
    }
  }

  // Filter employees for directory dropdown search
  const filteredEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return [];
    return employees.filter(emp =>
      emp.name?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      emp.employee_id?.toLowerCase().includes(employeeSearch.toLowerCase())
    );
  }, [employees, employeeSearch]);

  const handleSelectEmployee = (emp: any) => {
    setSelectedEmployee(emp);
    setRecipientName(emp.name || '');
    setRecipientEmployeeId(emp.employee_id || '');
    setDesignation(emp.designation_title || emp.directory_designation || '');
    setStartDate(emp.date_of_joining || '');
    setEmployeeSearch(`${emp.name} (${emp.employee_id})`);
    setShowDropdown(false);
  };

  const handleClearForm = () => {
    setSelectedEmployee(null);
    setRecipientName('');
    setRecipientEmployeeId('');
    setDesignation('');
    setStartDate('');
    setEndDate('');
    setEmployeeSearch('');
  };

  // Submit and create certificate in DB
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName || !recipientEmployeeId || !designation || !startDate || !endDate) {
      setErrorMsg('Please fill in all fields before generating.');
      return;
    }

    try {
      setGenerating(true);
      setErrorMsg('');
      setSuccessMsg('');

      const response = await fetch('/HRM/api/admin/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: selectedEmployee?.id || null,
          recipient_name: recipientName,
          recipient_employee_id: recipientEmployeeId,
          designation,
          start_date: startDate,
          end_date: endDate,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate certificate');
      }

      setSuccessMsg(`Successfully generated Certificate ${result.certificate.certificate_id}!`);
      handleClearForm();
      loadCertificates();

      // Automatically download the generated PDF
      await downloadPdf(result.certificate);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred during generation');
    } finally {
      setGenerating(false);
    }
  };

  // Generate on-the-fly PDF and trigger client browser download
  const downloadPdf = async (cert: any) => {
    try {
      const verificationUrl = `${window.location.origin}/verify/certificate/${cert.certificate_id}`;
      const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, { color: { dark: '#FFFFFF', light: '#00000000' }, margin: 1 });

      const doc = (
        <CertificatePDF
          recipientName={cert.recipient_name}
          recipientEmployeeId={cert.recipient_employee_id}
          designation={cert.designation}
          startDate={cert.start_date}
          endDate={cert.end_date}
          certificateId={cert.certificate_id}
          issuedAt={cert.issued_at}
          qrCodeDataUrl={qrCodeDataUrl}
        />
      );

      const blob = await pdf(doc).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Certificate_${cert.recipient_name.replace(/\s+/g, '_')}_${cert.certificate_id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download PDF:', err);
      alert('Failed to compile and download PDF certificate.');
    }
  };

  const handleCopyLink = (certificateId: string) => {
    const link = `${window.location.origin}/verify/certificate/${certificateId}`;
    navigator.clipboard.writeText(link);
    alert('Verification link copied to clipboard!');
  };

  // Format YYYY-MM-DD to DD-MM-YYYY
  const formatInputDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  const displayDesignation = (designation || 'Designation / Stream').replace(/[\[\]]/g, '');

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Alert Banners */}
      {migrationNeeded && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-sm">
          <span className="font-bold">Database Configuration Required:</span> The certificates database table has not been created yet. Please apply the migration files (`20260624000000_create_hr_certificates.sql`) to enable certificate saving.
        </div>
      )}
      {errorMsg && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-sm">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-sm">
          {successMsg}
        </div>
      )}

      {/* Main Grid: Form Left, Preview Right */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">

        {/* Left Form: lg:col-span-5 */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Certificate Generation</h2>

            {/* Mode selection button group */}
            <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
              <button
                type="button"
                onClick={() => { setMode('directory'); handleClearForm(); }}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${mode === 'directory'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
                  }`}
              >
                Search Directory
              </button>
              <button
                type="button"
                onClick={() => { setMode('manual'); handleClearForm(); }}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${mode === 'manual'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
                  }`}
              >
                Manual Entry
              </button>
            </div>

            <form onSubmit={handleGenerate} className="flex flex-col gap-4">

              {/* Directory search input */}
              {mode === 'directory' && (
                <div className="relative">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Search Employee Directory
                  </label>
                  <input
                    type="text"
                    value={employeeSearch}
                    onChange={(e) => {
                      setEmployeeSearch(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Type name or Employee ID..."
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                  />

                  {/* Dropdown list */}
                  {showDropdown && filteredEmployees.length > 0 && (
                    <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                      {filteredEmployees.map((emp) => (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => handleSelectEmployee(emp)}
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 transition"
                        >
                          <span className="font-semibold text-slate-800">{emp.name}</span>
                          <span className="ml-2 text-xs text-slate-500">({emp.employee_id})</span>
                          <span className="block text-xs text-slate-400">
                            {emp.designation_title || 'Designation not set'}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {showDropdown && employeeSearch.trim() && filteredEmployees.length === 0 && (
                    <div className="absolute left-0 right-0 z-50 mt-1 rounded-xl border border-slate-200 bg-white p-4 text-center text-xs text-slate-400 shadow-lg">
                      No matching employees found.
                    </div>
                  )}
                </div>
              )}

              {/* Recipient Name */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Recipient Full Name
                </label>
                <input
                  type="text"
                  required
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  disabled={mode === 'directory'}
                  placeholder="e.g. Anshu Prasad"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm disabled:bg-slate-50 focus:border-primary focus:outline-none"
                />
              </div>

              {/* Employee ID */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Employee ID
                </label>
                <input
                  type="text"
                  required
                  value={recipientEmployeeId}
                  onChange={(e) => setRecipientEmployeeId(e.target.value)}
                  disabled={mode === 'directory'}
                  placeholder="e.g. BNC-001"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm disabled:bg-slate-50 focus:border-primary focus:outline-none"
                />
              </div>

              {/* Designation */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Designation / Stream
                </label>
                <input
                  type="text"
                  required
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Data Science & Analytics"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={handleClearForm}
                  className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Clear Fields
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="flex-1 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition disabled:opacity-50"
                >
                  {generating ? 'Generating...' : 'Generate & Download'}
                </button>
              </div>

            </form>
          </div>
        </div>

        {/* Right Preview: lg:col-span-7 */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Live Certificate Preview</h3>
            <span className="text-xs text-slate-400 italic">Matches exact PDF print template layout</span>
          </div>

          {/* Landscape container matching A4 ratio aspect-[1.414] */}
          <div className="relative w-full aspect-[1.414] rounded-xl border border-slate-200 bg-white overflow-hidden shadow-md flex select-none">

            {/* Left Column */}
            <div
              className="flex flex-col justify-between items-center text-white z-10"
              style={{
                width: CERTIFICATE_CONFIG.leftColumn.width,
                backgroundColor: CERTIFICATE_CONFIG.leftColumn.backgroundColor,
                paddingTop: CERTIFICATE_CONFIG.leftColumn.paddingTop,
                paddingBottom: CERTIFICATE_CONFIG.leftColumn.paddingBottom,
                paddingLeft: CERTIFICATE_CONFIG.leftColumn.paddingLeft,
                paddingRight: CERTIFICATE_CONFIG.leftColumn.paddingRight,
              }}
            >
              {/* Top Wreath Badge - spans edge-to-edge and scales slightly wider */}
              <div
                className="w-full"
                style={{
                  marginTop: CERTIFICATE_CONFIG.leftColumn.seal.marginTop,
                  marginBottom: CERTIFICATE_CONFIG.leftColumn.seal.marginBottom,
                  marginLeft: CERTIFICATE_CONFIG.leftColumn.seal.marginLeft,
                  marginRight: CERTIFICATE_CONFIG.leftColumn.seal.marginRight,
                }}
              >
                <img
                  src="/assets/—Pngtree—seal gold certificate_7931463.png"
                  alt="Gold Seal"
                  style={{
                    width: CERTIFICATE_CONFIG.leftColumn.seal.width,
                    height: CERTIFICATE_CONFIG.leftColumn.seal.height,
                    transform: `scale(${CERTIFICATE_CONFIG.leftColumn.seal.scale})`,
                    transformOrigin: 'top center'
                  }}
                  className="object-contain mx-auto"
                />
              </div>

              {/* Bottom QR and ID */}
              <div className="flex flex-col items-center w-full -mb-1 px-1">
                <span
                  className="font-bold text-slate-300 text-center"
                  style={{
                    fontFamily: 'Inter',
                    fontSize: CERTIFICATE_CONFIG.leftColumn.idText.fontSize - 1.3,
                    marginTop: CERTIFICATE_CONFIG.leftColumn.idText.marginTop,
                    marginBottom: CERTIFICATE_CONFIG.leftColumn.idText.marginBottom,
                  }}
                >
                  ID: BNC-INT-YYYYMM-XXXX
                </span>
                <div
                  className="p-0 flex items-center justify-center"
                  style={{
                    width: CERTIFICATE_CONFIG.leftColumn.qrCode.width / 1.3,
                    height: CERTIFICATE_CONFIG.leftColumn.qrCode.height / 1.3,
                    marginTop: CERTIFICATE_CONFIG.leftColumn.qrCode.marginTop / 4,
                    marginBottom: CERTIFICATE_CONFIG.leftColumn.qrCode.marginBottom / 4,
                    marginLeft: CERTIFICATE_CONFIG.leftColumn.qrCode.marginLeft / 4,
                    marginRight: CERTIFICATE_CONFIG.leftColumn.qrCode.marginRight / 4,
                  }}
                >
                  {previewQrCodeUrl ? (
                    <img src={previewQrCodeUrl} alt="Preview QR" className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full bg-slate-300/20 animate-pulse rounded" />
                  )}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div
              className="flex flex-col justify-between relative"
              style={{
                width: CERTIFICATE_CONFIG.rightColumn.width,
                backgroundColor: CERTIFICATE_CONFIG.rightColumn.backgroundColor,
                paddingTop: CERTIFICATE_CONFIG.rightColumn.paddingTop,
                paddingBottom: CERTIFICATE_CONFIG.rightColumn.paddingBottom,
                paddingLeft: CERTIFICATE_CONFIG.rightColumn.paddingLeft,
                paddingRight: CERTIFICATE_CONFIG.rightColumn.paddingRight,
              }}
            >
              {/* Background Image */}
              <img
                src={CERTIFICATE_CONFIG.rightColumn.background.src}
                alt="Background"
                style={{
                  position: 'absolute',
                  top: CERTIFICATE_CONFIG.rightColumn.background.top,
                  left: CERTIFICATE_CONFIG.rightColumn.background.left,
                  right: CERTIFICATE_CONFIG.rightColumn.background.right,
                  bottom: CERTIFICATE_CONFIG.rightColumn.background.bottom,
                  width: CERTIFICATE_CONFIG.rightColumn.background.width,
                  height: CERTIFICATE_CONFIG.rightColumn.background.height,
                  objectFit: CERTIFICATE_CONFIG.rightColumn.background.objectFit,
                }}
              />

              {/* Issue Date */}
              <div
                className="text-right text-slate-700 z-10 font-bold"
                style={{
                  fontFamily: 'Inter',
                  fontSize: CERTIFICATE_CONFIG.rightColumn.issueDate.fontSize - 2.5,
                  marginTop: CERTIFICATE_CONFIG.rightColumn.issueDate.marginTop,
                  marginRight: CERTIFICATE_CONFIG.rightColumn.issueDate.marginRight,
                  marginBottom: CERTIFICATE_CONFIG.rightColumn.issueDate.marginBottom,
                }}
              >
                Issue Date: {formatInputDate(new Date().toISOString().split('T')[0])}
              </div>

              {/* Company Logo (increased size 3x & centered) */}
              <div
                className="flex justify-center z-10"
                style={{
                  marginTop: CERTIFICATE_CONFIG.rightColumn.logo.marginTop / 2,
                  marginBottom: CERTIFICATE_CONFIG.rightColumn.logo.marginBottom / 2,
                  marginLeft: CERTIFICATE_CONFIG.rightColumn.logo.marginLeft,
                  marginRight: CERTIFICATE_CONFIG.rightColumn.logo.marginRight,
                }}
              >
                <img
                  src="/assets/bnc consultech high.png"
                  alt="BnC Consultech Logo"
                  style={{
                    width: CERTIFICATE_CONFIG.rightColumn.logo.width - 150,
                    height: CERTIFICATE_CONFIG.rightColumn.logo.height - 30
                  }}
                  className="object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>

              {/* Certificate Titles */}
              <div className="text-center z-10">
                <h1
                  className="text-[#0C2D58] font-bold"
                  style={{
                    fontFamily: 'TaylorGothic',
                    fontSize: CERTIFICATE_CONFIG.rightColumn.title.fontSize - 12,
                    letterSpacing: CERTIFICATE_CONFIG.rightColumn.title.letterSpacing,
                    marginTop: CERTIFICATE_CONFIG.rightColumn.title.marginTop,
                    marginBottom: CERTIFICATE_CONFIG.rightColumn.title.marginBottom,
                  }}
                >
                  {CERTIFICATE_CONFIG.rightColumn.title.text}
                </h1>
                <p
                  className="text-slate-500 font-bold uppercase mt-0.5"
                  style={{
                    fontFamily: '001SansSerifDemo',
                    fontSize: CERTIFICATE_CONFIG.rightColumn.subtitle.fontSize - 5.5,
                    letterSpacing: CERTIFICATE_CONFIG.rightColumn.subtitle.letterSpacing - 2,
                    marginTop: CERTIFICATE_CONFIG.rightColumn.subtitle.marginTop,
                    marginBottom: CERTIFICATE_CONFIG.rightColumn.subtitle.marginBottom,
                  }}
                >
                  {CERTIFICATE_CONFIG.rightColumn.subtitle.text}
                </p>
              </div>

              {/* Award Content */}
              <div className="text-center z-10 flex flex-col items-center">
                <p
                  className="text-slate-500 font-bold"
                  style={{
                    fontFamily: 'Inter',
                    fontSize: CERTIFICATE_CONFIG.rightColumn.awardDeclaration.fontSize - 5.5,
                    marginTop: CERTIFICATE_CONFIG.rightColumn.awardDeclaration.marginTop,
                    marginBottom: CERTIFICATE_CONFIG.rightColumn.awardDeclaration.marginBottom,
                  }}
                >
                  {CERTIFICATE_CONFIG.rightColumn.awardDeclaration.text}
                </p>
                <h2
                  className="text-[#D32F2F] my-1"
                  style={{
                    fontFamily: 'DecemberCalligraphy',
                    fontSize: CERTIFICATE_CONFIG.rightColumn.recipientName.fontSize - 2,
                    lineHeight: 1.1,
                    marginTop: CERTIFICATE_CONFIG.rightColumn.recipientName.marginTop,
                    marginBottom: CERTIFICATE_CONFIG.rightColumn.recipientName.marginBottom,
                  }}
                >
                  {recipientName || 'Recipient Full Name'}
                </h2>

                {/* Horizontal Divider Line */}
                <div
                  className="my-1"
                  style={{
                    width: CERTIFICATE_CONFIG.rightColumn.divider.width - 80,
                    height: 6,
                    marginTop: CERTIFICATE_CONFIG.rightColumn.divider.marginTop,
                    marginBottom: CERTIFICATE_CONFIG.rightColumn.divider.marginBottom,
                  }}
                >
                  <svg viewBox="0 0 200 6" className="w-full h-full">
                    <path d="M10 3 L190 3" stroke="#0C2D58" strokeWidth="0.8" />
                    <circle cx="10" cy="3" r="1.5" fill="#0C2D58" />
                    <circle cx="190" cy="3" r="1.5" fill="#0C2D58" />
                  </svg>
                </div>

                <div
                  className="leading-relaxed text-slate-700 max-w-md mt-1 text-center"
                  style={{
                    fontFamily: 'Inter',
                    fontSize: CERTIFICATE_CONFIG.rightColumn.description.fontSize - 5.5,
                    marginTop: CERTIFICATE_CONFIG.rightColumn.description.marginTop,
                    marginBottom: CERTIFICATE_CONFIG.rightColumn.description.marginBottom,
                  }}
                >
                  <div>
                    has successfully completed{' '}
                    <span
                      className="underline"
                      style={{
                        fontFamily: CERTIFICATE_CONFIG.rightColumn.description.courseFont,
                        fontSize: CERTIFICATE_CONFIG.rightColumn.description.courseFontSize - 6,
                        color: CERTIFICATE_CONFIG.rightColumn.description.courseColor,
                        fontWeight: 'normal'
                      }}
                    >
                      {displayDesignation}
                    </span>{' '}
                    internship program, offered by
                  </div>
                  <div className="mt-1">
                    BnC Consultech from{' '}
                    <span
                      className="underline font-bold"
                      style={{ fontFamily: 'Inter', fontWeight: 'bold' }}
                    >
                      {formatInputDate(startDate) || 'DD-MM-YYYY'}
                    </span> to{' '}
                    <span
                      className="underline font-bold"
                      style={{ fontFamily: 'Inter', fontWeight: 'bold' }}
                    >
                      {formatInputDate(endDate) || 'DD-MM-YYYY'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div
                className="flex justify-around items-end px-6 z-10"
                style={{
                  marginTop: CERTIFICATE_CONFIG.rightColumn.signatures.marginTop,
                  marginBottom: CERTIFICATE_CONFIG.rightColumn.signatures.marginBottom,
                }}
              >
                {/* CEO Signature */}
                <div className="flex flex-col items-center w-28">
                  <span
                    className="font-serif text-slate-800 italic"
                    style={{
                      fontFamily: 'Caveat',
                      fontSize: CERTIFICATE_CONFIG.rightColumn.signatures.ceoTextSize - 4,
                      color: CERTIFICATE_CONFIG.rightColumn.signatures.ceoColor,
                      height: CERTIFICATE_CONFIG.rightColumn.signatures.ceoHeight - 10,
                    }}
                  >
                    {CERTIFICATE_CONFIG.rightColumn.signatures.ceoSignText}
                  </span>
                  {CERTIFICATE_CONFIG.rightColumn.signatures.showLine && (
                    <div className="w-full mt-0.5" style={{ height: 6 }}>
                      <svg viewBox="0 0 100 6" className="w-full h-full">
                        <path d="M4 3 L96 3" stroke={CERTIFICATE_CONFIG.rightColumn.signatures.lineColor} strokeWidth="0.8" />
                        <circle cx="4" cy="3" r="1.2" fill={CERTIFICATE_CONFIG.rightColumn.signatures.lineColor} />
                        <circle cx="96" cy="3" r="1.2" fill={CERTIFICATE_CONFIG.rightColumn.signatures.lineColor} />
                      </svg>
                    </div>
                  )}
                  <span
                    className="text-slate-500 mt-1 font-bold"
                    style={{
                      fontFamily: 'Inter',
                      fontSize: CERTIFICATE_CONFIG.rightColumn.signatures.labelSize - 3.5,
                      color: CERTIFICATE_CONFIG.rightColumn.signatures.labelColor
                    }}
                  >
                    {CERTIFICATE_CONFIG.rightColumn.signatures.ceoLabel}
                  </span>
                </div>

                {/* HR Signature */}
                <div className="flex flex-col items-center w-28">
                  <span
                    className="font-serif text-slate-800 italic"
                    style={{
                      fontFamily: 'Caveat',
                      fontSize: CERTIFICATE_CONFIG.rightColumn.signatures.hrTextSize - 4,
                      color: CERTIFICATE_CONFIG.rightColumn.signatures.hrColor,
                      height: CERTIFICATE_CONFIG.rightColumn.signatures.hrHeight - 10,
                    }}
                  >
                    {CERTIFICATE_CONFIG.rightColumn.signatures.hrSignText}
                  </span>
                  {CERTIFICATE_CONFIG.rightColumn.signatures.showLine && (
                    <div className="w-full mt-0.5" style={{ height: 6 }}>
                      <svg viewBox="0 0 100 6" className="w-full h-full">
                        <path d="M4 3 L96 3" stroke={CERTIFICATE_CONFIG.rightColumn.signatures.lineColor} strokeWidth="0.8" />
                        <circle cx="4" cy="3" r="1.2" fill={CERTIFICATE_CONFIG.rightColumn.signatures.lineColor} />
                        <circle cx="96" cy="3" r="1.2" fill={CERTIFICATE_CONFIG.rightColumn.signatures.lineColor} />
                      </svg>
                    </div>
                  )}
                  <span
                    className="text-slate-500 mt-1 font-bold"
                    style={{
                      fontFamily: 'Inter',
                      fontSize: CERTIFICATE_CONFIG.rightColumn.signatures.labelSize - 3.5,
                      color: CERTIFICATE_CONFIG.rightColumn.signatures.labelColor
                    }}
                  >
                    {CERTIFICATE_CONFIG.rightColumn.signatures.hrLabel}
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div
                className="flex justify-between items-center px-1 z-10"
                style={{
                  borderTopWidth: CERTIFICATE_CONFIG.rightColumn.footer.borderTopWidth,
                  borderTopStyle: CERTIFICATE_CONFIG.rightColumn.footer.borderTopWidth > 0 ? 'solid' : 'none',
                  borderTopColor: CERTIFICATE_CONFIG.rightColumn.footer.borderTopColor,
                  paddingTop: CERTIFICATE_CONFIG.rightColumn.footer.paddingTop,
                  marginTop: CERTIFICATE_CONFIG.rightColumn.footer.marginTop,
                  marginBottom: CERTIFICATE_CONFIG.rightColumn.footer.marginBottom,
                }}
              >
                {/* Left Badge: Gold Wax Seal */}
                <img
                  src="/assets/—Pngtree—gold wax seal icon for_20921944.png"
                  alt="Gold Wax Seal"
                  style={{
                    width: CERTIFICATE_CONFIG.rightColumn.footer.waxSealWidth - 20,
                    height: CERTIFICATE_CONFIG.rightColumn.footer.waxSealHeight - 20
                  }}
                  className="object-contain"
                />

                {/* Center Contact Info */}
                <div className="flex flex-col items-center" style={{ position: 'relative', top: -25 }}>
                  <img
                    src="/assets/bnc consultech high.png"
                    alt="Logo"
                    style={{
                      width: CERTIFICATE_CONFIG.rightColumn.footer.centerLogoWidth - 150,
                      height: CERTIFICATE_CONFIG.rightColumn.footer.centerLogoHeight - 30,
                      marginTop: (CERTIFICATE_CONFIG.rightColumn.footer.centerLogoMarginTop || 0) / 2,
                      marginBottom: (CERTIFICATE_CONFIG.rightColumn.footer.centerLogoMarginBottom || 0) / 2
                    }}
                    className="object-contain"
                  />
                  <p
                    className="text-slate-500 font-bold tracking-wider"
                    style={{
                      fontFamily: 'Inter',
                      fontSize: CERTIFICATE_CONFIG.rightColumn.footer.mailTextSize / 1.15,
                      color: CERTIFICATE_CONFIG.rightColumn.footer.mailTextColor,
                      marginBottom: CERTIFICATE_CONFIG.rightColumn.footer.mailTextMarginBottom,
                    }}
                  >
                    For More Information Mail Us:{' '}
                    <span style={{ color: '#FF5722', fontFamily: 'Inter' }}>support@bncglobal.in</span>
                  </p>
                  <div
                    className="flex items-center mt-1"
                    style={{ gap: CERTIFICATE_CONFIG.rightColumn.footer.contactGap / 1.15 }}
                  >
                    <span
                      className="text-slate-600 font-bold flex items-center gap-1"
                      style={{
                        fontFamily: 'Inter',
                        fontSize: CERTIFICATE_CONFIG.rightColumn.footer.contactTextSize / 1.15,
                        color: CERTIFICATE_CONFIG.rightColumn.footer.contactTextColor
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width={CERTIFICATE_CONFIG.rightColumn.footer.contactIconSize / 1.15}
                        height={CERTIFICATE_CONFIG.rightColumn.footer.contactIconSize / 1.15}
                        className="inline-block fill-[#0C2D58] mr-0.5"
                      >
                        <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.27c1.12.37 2.33.57 3.57.57a1 1 0 01-1 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.28 1.11l-2.17 2.2z" />
                      </svg>
                      +91-9810575613
                    </span>
                    <span
                      className="text-slate-600 font-bold flex items-center gap-1"
                      style={{
                        fontFamily: 'Inter',
                        fontSize: CERTIFICATE_CONFIG.rightColumn.footer.contactTextSize / 1.15,
                        color: CERTIFICATE_CONFIG.rightColumn.footer.contactTextColor
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width={CERTIFICATE_CONFIG.rightColumn.footer.contactIconSize / 1.15}
                        height={CERTIFICATE_CONFIG.rightColumn.footer.contactIconSize / 1.15}
                        className="inline-block fill-none stroke-[#0C2D58] stroke-[1.5] mr-0.5"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" className="stroke-[1.2]" />
                        <path d="M2 12h20" className="stroke-[1.2]" />
                      </svg>
                      www.bncglobal.in
                    </span>
                    <span
                      className="text-slate-600 font-bold flex items-center gap-1"
                      style={{
                        fontFamily: 'Inter',
                        fontSize: CERTIFICATE_CONFIG.rightColumn.footer.contactTextSize / 1.15,
                        color: CERTIFICATE_CONFIG.rightColumn.footer.contactTextColor
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width={CERTIFICATE_CONFIG.rightColumn.footer.contactIconSize / 1.15}
                        height={CERTIFICATE_CONFIG.rightColumn.footer.contactIconSize / 1.15}
                        className="inline-block fill-[#0C2D58] mr-0.5"
                      >
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
                      </svg>
                      Gurugram and Saudi Arabia
                    </span>
                  </div>
                </div>

                {/* Right Badge: Favicon */}
                <img
                  src="/assets/bnc consultech icon high.png"
                  alt="Favicon"
                  style={{
                    width: CERTIFICATE_CONFIG.rightColumn.footer.faviconWidth - 20,
                    height: CERTIFICATE_CONFIG.rightColumn.footer.faviconHeight - 20
                  }}
                  className="object-contain"
                />
              </div>

            </div>

          </div>
        </div>

      </div>

      {/* Log of Issued Certificates */}
      <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Issued Certificates Log</h3>
            <p className="text-xs text-slate-400">Total generated internship certificates</p>
          </div>

          <input
            type="text"
            value={certificatesSearch}
            onChange={(e) => {
              setCertificatesSearch(e.target.value);
              loadCertificates(e.target.value);
            }}
            placeholder="Search log by name, ID, code..."
            className="w-full max-w-sm rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>

        {loadingCertificates ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800 mb-2" />
            <span className="text-xs">Loading certificate logs...</span>
          </div>
        ) : issuedCertificates.length === 0 ? (
          <div className="text-center py-12 text-sm text-slate-400 border border-dashed border-slate-200 rounded-xl">
            No issued certificates found matching the search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Certificate ID</th>
                  <th className="py-3 px-4">Recipient Name</th>
                  <th className="py-3 px-4">Emp ID</th>
                  <th className="py-3 px-4">Designation</th>
                  <th className="py-3 px-4">Internship Dates</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm text-slate-600">
                {issuedCertificates.map((cert) => (
                  <tr key={cert.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4 font-mono text-xs font-bold text-slate-900">
                      {cert.certificate_id}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{cert.recipient_name}</td>
                    <td className="py-3 px-4">{cert.recipient_employee_id}</td>
                    <td className="py-3 px-4 italic">{cert.designation}</td>
                    <td className="py-3 px-4 text-xs">
                      {formatInputDate(cert.start_date)} to {formatInputDate(cert.end_date)}
                    </td>
                    <td className="py-3 px-4 text-right flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyLink(cert.certificate_id)}
                        className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-600 transition"
                        title="Copy Verification Link"
                      >
                        <span className="material-symbols-outlined text-[18px]">link</span>
                      </button>
                      <a
                        href={`/verify/certificate/${cert.certificate_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-600 transition inline-flex items-center"
                        title="View Verification Page"
                      >
                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => downloadPdf(cert)}
                        className="rounded-lg bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">download</span>
                        PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
