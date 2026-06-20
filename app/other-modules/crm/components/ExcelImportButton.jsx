"use client";

import React, { useRef } from 'react';
import * as xlsx from 'xlsx';
import { Upload } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function ExcelImportButton({ onImport }) {
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const workbook = xlsx.read(bstr, { type: 'binary' });
        
        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = xlsx.utils.sheet_to_json(worksheet);
        
        if (jsonData && jsonData.length > 0) {
          onImport(jsonData);
        } else {
          toast.warning("The Excel sheet appears to be empty.");
        }
      } catch (error) {
        console.error("Error reading Excel file:", error);
        toast.error("Failed to parse the file. Please ensure it's a valid Excel or CSV file.");
      }
      
      // Reset input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div>
      <input 
        type="file" 
        accept=".xlsx, .xls, .csv" 
        style={{ display: 'none' }} 
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      <button 
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 px-4 py-2 rounded-md font-medium transition shadow-sm text-sm"
      >
        <Upload className="w-4 h-4" />
        Import Excel
      </button>
    </div>
  );
}
