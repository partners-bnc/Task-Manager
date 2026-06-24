import React from 'react';
import { adminClient } from '@/utils/supabase/admin';
import VerificationClient from './VerificationClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return {
    title: `Certificate Verification - ${id}`,
    description: 'Verify the authenticity of internship certificates issued by BnC Consultech.',
    icons: {
      icon: '/assets/bnc consultech icon high.png',
      shortcut: '/assets/bnc consultech icon high.png',
      apple: '/assets/bnc consultech icon high.png',
    },
  };
}

export default async function VerifyCertificatePage({ params }: PageProps) {
  const { id } = await params;

  // Securely query database on the server
  const { data: certificate, error } = await adminClient
    .from('hrm_certificates')
    .select('*')
    .eq('certificate_id', id)
    .maybeSingle();

  if (error || !certificate) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-tr from-slate-50 to-blue-50/50 px-4 text-center">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-red-100/50 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-md rounded-2xl border border-red-100 bg-white p-8 shadow-2xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
            <span className="material-symbols-outlined text-[36px]">error</span>
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Invalid Certificate</h1>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            The certificate ID <span className="font-mono font-bold text-red-600">"{id}"</span> could not be verified in our records. It may be invalid or tempered.
          </p>
          <a
            href="/"
            className="inline-block rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition"
          >
            Go to Portal
          </a>
        </div>
      </div>
    );
  }

  // Pass plain data object to the client component
  return <VerificationClient certificate={certificate} />;
}
