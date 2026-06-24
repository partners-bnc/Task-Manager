'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { pdf } from '@react-pdf/renderer';
import CertificatePDF from '@/app/HRM/components/views/admin/CertificatePDF';

interface VerificationClientProps {
  certificate: {
    id: string;
    certificate_id: string;
    recipient_name: string;
    recipient_employee_id: string;
    designation: string;
    start_date: string;
    end_date: string;
    issued_at: string;
  };
}

export default function VerificationClient({ certificate }: VerificationClientProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    // Generate QR Code data URL for the PDF generator
    const url = `${window.location.origin}/verify/certificate/${certificate.certificate_id}`;
    QRCode.toDataURL(url, { color: { dark: '#FFFFFF', light: '#00000000' }, margin: 1 })
      .then(setQrCodeDataUrl)
      .catch((err) => console.error('Failed to generate verification QR:', err));
  }, [certificate]);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const doc = (
        <CertificatePDF
          recipientName={certificate.recipient_name}
          recipientEmployeeId={certificate.recipient_employee_id}
          designation={certificate.designation}
          startDate={certificate.start_date}
          endDate={certificate.end_date}
          certificateId={certificate.certificate_id}
          issuedAt={certificate.issued_at}
          qrCodeDataUrl={qrCodeDataUrl}
        />
      );

      const blob = await pdf(doc).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Certificate_${certificate.recipient_name.replace(/\s+/g, '_')}_${certificate.certificate_id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to compile and download PDF:', err);
      alert('Error occurred while compiling the official PDF document.');
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Verification page link copied to clipboard!');
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-tr from-slate-50 to-blue-50/50 px-4 py-12 text-slate-800 overflow-hidden">

      {/* Decorative Blur Orbs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-blue-200/20 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-amber-200/10 blur-[100px] pointer-events-none" />

      {/* Main Glassmorphic Container */}
      <div className="relative z-10 w-full max-w-2xl rounded-3xl border border-slate-200/80 bg-white/80 p-8 md:p-10 backdrop-blur-xl shadow-2xl">

        {/* Certificate Seal Badge */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-4 ring-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
            <span className="material-symbols-outlined text-[44px]">verified</span>
          </div>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full tracking-[2px] uppercase">
            Verified Authenticity
          </span>
          <h1 className="text-xl md:text-2xl font-bold mt-3 text-slate-800 tracking-wide">
            Internship Certificate Verification
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            BnC Consultech Verification Registry
          </p>
        </div>

        {/* Certificate Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-y border-slate-100 py-8 mb-8">
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Recipient Name
            </span>
            <span className="text-base font-bold text-slate-800">
              {certificate.recipient_name}
            </span>
          </div>

          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Employee ID
            </span>
            <span className="text-base font-semibold text-slate-700">
              {certificate.recipient_employee_id}
            </span>
          </div>

          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Designation
            </span>
            <span className="text-base font-semibold text-slate-700 italic">
              {certificate.designation}
            </span>
          </div>

          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Duration of Internship
            </span>
            <span className="text-base font-semibold text-slate-700">
              {formatDate(certificate.start_date)} to {formatDate(certificate.end_date)}
            </span>
          </div>

          <div className="md:col-span-2">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Certificate Reference ID
            </span>
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono font-bold text-[#b48f1b] bg-[#D4AF37]/5 px-3 py-1.5 rounded-lg border border-[#D4AF37]/20">
                {certificate.certificate_id}
              </span>
              <button
                onClick={handleCopyLink}
                className="rounded-lg p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                title="Copy Link"
              >
                <span className="material-symbols-outlined text-[16px]">content_copy</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Details and Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/assets/bnc consultech icon high.png"
              alt="Icon"
              className="h-9 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div>
              <span className="block text-[9px] text-slate-400 uppercase tracking-wider">
                Issued By
              </span>
              <span className="text-xs font-semibold text-slate-700">
                BnC Consultech Group
              </span>
            </div>
          </div>

          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={handleCopyLink}
              className="flex-1 sm:flex-initial rounded-xl border border-slate-200 hover:bg-slate-50 px-6 py-3 text-xs font-bold text-slate-600 transition"
            >
              Copy Verification Link
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex-1 sm:flex-initial rounded-xl bg-[#0C2D58] hover:bg-[#08203E] text-white px-6 py-3 text-xs font-black shadow-md transition disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {downloading ? (
                <>
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Compiling...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[14px]">download</span>
                  Download Official PDF
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
