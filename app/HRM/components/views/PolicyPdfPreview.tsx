'use client';

import React, { useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

type PolicyPdfPreviewProps = {
  fileUrl: string;
  width?: number;
  onError?: (message: string, error?: unknown) => void;
};

export default function PolicyPdfPreview({
  fileUrl,
  width = 980,
  onError,
}: PolicyPdfPreviewProps) {
  const [pageCount, setPageCount] = useState(0);
  const lastErrorRef = useRef('');

  const handleError = (error: unknown) => {
    const message =
      typeof error === 'object' &&
      error &&
      'message' in error &&
      typeof error.message === 'string' &&
      error.message.trim()
        ? error.message
        : 'Failed to render PDF document.';

    if (lastErrorRef.current === message) return;
    lastErrorRef.current = message;
    onError?.(message, error);
  };

  return (
    <Document
      key={fileUrl}
      file={fileUrl}
      loading={null}
      onLoadSuccess={({ numPages }) => setPageCount(numPages)}
      onLoadError={handleError}
      onSourceError={handleError}
    >
      <div className="space-y-4">
        {Array.from({ length: pageCount }, (_, index) => (
          <div
            key={`pdf-page-${index + 1}`}
            className="overflow-hidden rounded-[0.8rem] border border-slate-200 bg-white"
          >
            <Page
              pageNumber={index + 1}
              width={width}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="bg-white"
            />
          </div>
        ))}
      </div>
    </Document>
  );
}
