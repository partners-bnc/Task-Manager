'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import HrmEmptyState from '../ui/HrmEmptyState';
import { LoadingPanel } from '../ui/Skeleton';
import { useHrmFeedback } from '../ui/HrmFeedback';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

type PolicyDocument = {
  id: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  viewUrl: string;
  downloadUrl: string;
};

type PolicyItem = {
  id: string;
  title: string;
  summary: string;
  updatedAt: string | null;
  documentCount: number;
  documents: PolicyDocument[];
};

function formatDate(value?: string | null) {
  if (!value) return 'Recently updated';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently updated';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatFileSize(bytes?: number) {
  const size = Number(bytes || 0);
  if (!size) return 'Unknown size';
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
}

function getFileExtension(fileName = '') {
  const parts = String(fileName || '').split('.');
  return parts.length > 1 ? parts.pop()?.toUpperCase() || 'FILE' : 'FILE';
}

function isPdfDocument(document?: PolicyDocument | null) {
  return Boolean(document?.mimeType?.toLowerCase().includes('pdf') || document?.fileName?.toLowerCase().endsWith('.pdf'));
}

function isImageDocument(document?: PolicyDocument | null) {
  return Boolean(document?.mimeType?.startsWith('image/'));
}

function getPolicyIcon(index: number) {
  if (index % 3 === 0) return 'calendar_month';
  if (index % 3 === 1) return 'badge';
  return 'apartment';
}

async function downloadFile(url: string, fileName: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to download document.');
  }

  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName || 'document';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
}

export default function PolicyManual() {
  const { showFeedback } = useHrmFeedback();
  const pdfContainerRef = useRef<HTMLDivElement | null>(null);
  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPolicyId, setSelectedPolicyId] = useState('');
  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [pdfWidth, setPdfWidth] = useState(980);
  const [pdfObjectUrl, setPdfObjectUrl] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadPolicies() {
      setLoading(true);
      try {
        const response = await fetch('/HRM/api/policies', { method: 'GET' });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Failed to load policy manual.');
        }

        if (active) {
          setPolicies(result.policies || []);
        }
      } catch (error) {
        if (active) {
          showFeedback({
            type: 'error',
            title: 'Policy Manual Not Loaded',
            message: error instanceof Error ? error.message : 'Failed to load policies.',
          });
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadPolicies();
    return () => {
      active = false;
    };
  }, [showFeedback]);

  const selectedPolicy = useMemo(
    () => policies.find((policy) => policy.id === selectedPolicyId) || null,
    [policies, selectedPolicyId]
  );

  const filteredPolicies = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return policies;
    return policies.filter((policy) =>
      `${policy.title} ${policy.summary}`.toLowerCase().includes(query)
    );
  }, [policies, search]);

  const selectedDocument = useMemo(
    () => selectedPolicy?.documents.find((document) => document.id === selectedDocumentId) || null,
    [selectedPolicy, selectedDocumentId]
  );

  useEffect(() => {
    if (!selectedPolicy) return;
    if (selectedPolicy.documents.some((document) => document.id === selectedDocumentId)) return;
    setSelectedDocumentId(selectedPolicy.documents[0]?.id || '');
  }, [selectedPolicy, selectedDocumentId]);

  useEffect(() => {
    if (!selectedDocument || !isPdfDocument(selectedDocument)) return;

    const updateWidth = () => {
      const nextWidth = pdfContainerRef.current?.clientWidth || 980;
      setPdfWidth(Math.max(320, nextWidth - 24));
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [selectedDocument]);

  useEffect(() => {
    let cancelled = false;
    let nextObjectUrl = '';

    async function loadPdfData() {
      if (!selectedDocument || !isPdfDocument(selectedDocument)) {
        setPdfObjectUrl('');
        setPdfPageCount(0);
        setPdfError('');
        setPdfLoading(false);
        return;
      }

      setPdfLoading(true);
      setPdfError('');
      setPdfPageCount(0);

      try {
        const response = await fetch(selectedDocument.viewUrl);
        if (!response.ok) {
          throw new Error('Failed to load PDF file.');
        }

        const blob = await response.blob();
        nextObjectUrl = URL.createObjectURL(blob);
        if (!cancelled) {
          setPdfObjectUrl(nextObjectUrl);
        }
      } catch (error) {
        if (!cancelled) {
          setPdfObjectUrl('');
          setPdfError(error instanceof Error ? error.message : 'Failed to load PDF file.');
        }
      } finally {
        if (!cancelled) {
          setPdfLoading(false);
        }
      }
    }

    loadPdfData();
    return () => {
      cancelled = true;
      if (nextObjectUrl) {
        URL.revokeObjectURL(nextObjectUrl);
      }
    };
  }, [selectedDocument]);

  const handleOpenPolicy = (policy: PolicyItem) => {
    setSelectedPolicyId(policy.id);
    setSelectedDocumentId(policy.documents[0]?.id || '');
  };

  const handleDownloadCurrent = async () => {
    if (!selectedDocument?.downloadUrl) return;
    try {
      await downloadFile(selectedDocument.downloadUrl, selectedDocument.fileName);
    } catch (error) {
      showFeedback({
        type: 'error',
        title: 'Download Failed',
        message: error instanceof Error ? error.message : 'Unable to download the document right now.',
      });
    }
  };

  const handlePrintCurrent = () => {
    if (!selectedDocument?.viewUrl || !isPdfDocument(selectedDocument)) return;
    const printWindow = window.open(selectedDocument.viewUrl, '_blank', 'noopener,noreferrer');
    if (!printWindow) {
      showFeedback({
        type: 'warning',
        title: 'Popup Blocked',
        message: 'Allow popups for printing this document.',
      });
      return;
    }

    printWindow.addEventListener('load', () => {
      printWindow.focus();
      printWindow.print();
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-headline font-bold text-on-background">Policy Manual</h1>
          <p className="mt-2 text-sm text-on-surface-variant">Review official company guidelines and procedures.</p>
        </div>
        <LoadingPanel title="Loading policy manual" message="Preparing published policies and documents for your workspace." />
      </div>
    );
  }

  if (!selectedPolicy) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                <span className="material-symbols-outlined text-[24px]">menu_book</span>
              </div>
              <h1 className="text-3xl font-headline font-bold text-on-background">Policy Manual</h1>
            </div>
            <p className="pl-[3.75rem] text-sm text-on-surface-variant">Review official company guidelines and procedures.</p>
          </div>
          <label className="relative block w-full max-w-md lg:mt-1">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">
              search
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search policies..."
              className="w-full rounded-full border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
            />
          </label>
        </div>

        {filteredPolicies.length === 0 ? (
          <HrmEmptyState
            icon="policy"
            title={search ? 'No matching policies found' : 'No policies are available yet'}
            message={
              search
                ? 'Try a different keyword to find another policy.'
                : 'Published policies will appear here once HR uploads them.'
            }
          />
        ) : (
          <section className="grid grid-cols-1 gap-5 lg:pl-[3.75rem] md:grid-cols-2 xl:grid-cols-3">
            {filteredPolicies.map((policy, index) => (
              <article
                key={policy.id}
                className="group rounded-[1.55rem] border border-slate-100 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-1 hover:border-violet-200 hover:shadow-[0_22px_42px_rgba(109,40,217,0.14)]"
              >
                <div className="flex min-h-[142px] items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 transition-colors duration-200 group-hover:bg-violet-700 group-hover:text-white">
                    <span className="material-symbols-outlined text-[21px]">{getPolicyIcon(index)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[1.28rem] font-headline font-bold tracking-tight text-slate-900">{policy.title}</h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{policy.summary}</p>
                    <div className="mt-5 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => handleOpenPolicy(policy)}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-violet-700 transition group-hover:text-violet-800"
                      >
                        View Policy
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </button>
                      <p className="text-xs text-slate-400">{formatDate(policy.updatedAt)}</p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <button
            type="button"
            onClick={() => {
              setSelectedPolicyId('');
              setSelectedDocumentId('');
            }}
            className="inline-flex items-center gap-2 text-sm font-semibold text-violet-700 transition hover:text-violet-800"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to All Policies
          </button>
          <span className="hidden h-6 w-px bg-slate-300 sm:block" />
          <h1 className="truncate text-[1.55rem] font-headline font-bold tracking-tight text-slate-900">{selectedPolicy.title}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadCurrent}
            disabled={!selectedDocument}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-800 shadow-sm transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Download
          </button>
          <button
            type="button"
            onClick={handlePrintCurrent}
            disabled={!selectedDocument || !isPdfDocument(selectedDocument)}
            className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-6 py-3 text-sm font-bold text-white shadow-[0_16px_28px_rgba(124,58,237,0.18)] transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-violet-300"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            Print
          </button>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="rounded-[1.8rem] bg-white p-6 shadow-[0_18px_46px_rgba(15,23,42,0.05)] xl:self-start">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">On This Policy</p>

          {selectedPolicy.documents.length === 0 ? (
            <div className="mt-5">
              <HrmEmptyState
                compact
                icon="draft"
                title="No documents uploaded"
                message="HR has published the policy entry, but no document file is attached yet."
              />
            </div>
          ) : (
            <div className="mt-5 space-y-2">
              {selectedPolicy.documents.map((document, index) => {
                const isActive = document.id === selectedDocumentId;
                return (
                  <button
                    key={document.id}
                    type="button"
                    onClick={() => setSelectedDocumentId(document.id)}
                    className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                      isActive
                        ? 'border-violet-200 bg-violet-50 text-violet-800'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-[0.83rem] font-medium leading-5">{index + 1}. {document.fileName}</p>
                      <p className={`shrink-0 text-[11px] ${isActive ? 'text-violet-700/85' : 'text-slate-500'}`}>
                        {formatFileSize(document.fileSizeBytes)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-8 border-t border-slate-200 pt-6">
            <p className="text-sm font-bold text-slate-800">Last Updated</p>
            <p className="mt-2 text-sm text-slate-500">{formatDate(selectedPolicy.updatedAt)}</p>
          </div>
        </aside>

        <div className="rounded-[1.35rem] bg-white p-4 shadow-[0_18px_46px_rgba(15,23,42,0.05)] sm:p-5">
          {!selectedDocument ? (
            <HrmEmptyState
              icon="docs"
              title="Select a document"
              message="Choose one of the attached policy documents from the left to review it here."
            />
          ) : (
            <div className="space-y-6">
              {isPdfDocument(selectedDocument) ? (
                <div
                  ref={pdfContainerRef}
                  className="w-full rounded-[0.8rem] bg-white"
                >
                  {pdfLoading ? (
                    <div className="flex min-h-[420px] items-center justify-center rounded-[0.8rem] border border-slate-200 bg-white text-sm text-slate-500">
                      Loading PDF preview...
                    </div>
                  ) : pdfError ? (
                    <div className="flex min-h-[420px] items-center justify-center rounded-[0.8rem] border border-slate-200 bg-white px-6 text-center text-sm text-slate-500">
                      {pdfError || 'This PDF preview could not be rendered here. Please use Download to open it directly.'}
                    </div>
                  ) : pdfObjectUrl ? (
                    <Document
                      file={pdfObjectUrl}
                      loading={null}
                      error={
                        <div className="flex min-h-[420px] items-center justify-center rounded-[0.8rem] border border-slate-200 bg-white px-6 text-center text-sm text-slate-500">
                          {pdfError || 'This PDF preview could not be rendered here. Please use Download to open it directly.'}
                        </div>
                      }
                      onLoadSuccess={({ numPages }) => setPdfPageCount(numPages)}
                      onLoadError={(error) => {
                        const message =
                          typeof error?.message === 'string' && error.message.trim()
                            ? error.message
                            : String(error || 'Failed to render PDF document.');
                        setPdfError(message);
                        console.error('Policy PDF render error:', error);
                      }}
                    >
                      <div className="space-y-4">
                        {Array.from({ length: pdfPageCount }, (_, index) => (
                          <div
                            key={`pdf-page-${index + 1}`}
                            className="overflow-hidden rounded-[0.8rem] border border-slate-200 bg-white"
                          >
                            <Page
                              pageNumber={index + 1}
                              width={pdfWidth}
                              renderTextLayer={false}
                              renderAnnotationLayer={false}
                              className="bg-white"
                            />
                          </div>
                        ))}
                      </div>
                    </Document>
                  ) : null}
                </div>
              ) : isImageDocument(selectedDocument) ? (
                <div className="overflow-hidden rounded-[1rem] border border-slate-200 bg-white p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedDocument.viewUrl}
                    alt={selectedDocument.fileName}
                    className="max-h-[82vh] min-h-[860px] w-full rounded-[0.8rem] object-contain bg-white"
                  />
                </div>
              ) : (
                <div className="flex min-h-[60vh] items-center justify-center rounded-[1.75rem] border border-slate-200 bg-slate-50 p-8">
                  <div className="max-w-xl text-center">
                    <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-[1.4rem] bg-violet-100 text-violet-700">
                      <span className="material-symbols-outlined text-[30px]">description</span>
                    </div>
                    <h3 className="mt-5 text-[1.8rem] font-headline font-bold text-slate-900">{selectedDocument.fileName}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      This document type is available for download from this page.
                    </p>
                    <button
                      type="button"
                      onClick={handleDownloadCurrent}
                      className="mt-7 inline-flex items-center gap-2 rounded-full bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-[0_14px_24px_rgba(124,58,237,0.18)] transition hover:bg-violet-700"
                    >
                      <span className="material-symbols-outlined text-[18px]">download</span>
                      Download Document
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
