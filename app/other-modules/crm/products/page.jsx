"use client";

import React, { useState } from 'react';
import { useCrm } from '../context/CrmContext';
import { useToast } from '../context/ToastContext';
import MOCK_DATA from '../data/mockData.json';
import ExcelImportButton from '../components/ExcelImportButton';
import GenericEditModal from '../components/GenericEditModal';

export default function ProductsPage() {
  const { currentUser } = useCrm();
  const { toast } = useToast();
  const [products, setProducts] = useState(MOCK_DATA.products);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Sales and Viewers are read-only for Products
  const canEditProducts = ["admin", "manager"].includes(currentUser.role);

  const handleEdit = (product) => {
    if (!canEditProducts) {
      toast.error("Permission Denied: Only Admins and Managers can edit products.");
      return;
    }
    setEditingProduct(product);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (updatedProduct) => {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  };

  const handleImport = (importedData) => {
    const mappedProducts = importedData.map((row, index) => ({
      id: row.ProductID || row.id || `P-${Date.now()}-${index}`,
      name: row.Name || row.name || 'Unknown Product',
      category: row.Category || row.category || 'Service',
      pricing: row.Price ? `$${row.Price}` : (row.pricing || '$0'),
      availability: row.Status || row.availability || 'Active'
    }));
    setProducts(prev => [...mappedProducts, ...prev]);
  };

  const handleAddProduct = () => {
    const newProduct = {
      id: Math.floor(Math.random() * 1000) + 500,
      name: "New Custom Service " + Math.floor(Math.random() * 100),
      category: "Service",
      pricing: "$1,500/mo",
      availability: "Active"
    };
    setProducts([newProduct, ...products]);
  };

  return (
    <div className="p-8 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold dark:text-white">Products & Services</h1>
        <div className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 px-4 py-2 rounded-lg font-medium shadow-sm transition border border-transparent dark:border-blue-900">
          Welcome, {currentUser.name} ({currentUser.role})
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors duration-300">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Total Products</h3>
          <p className="text-3xl font-bold text-slate-800 dark:text-white">{products.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors duration-300">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Active Services</h3>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{products.filter(p => p.availability === 'Active').length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors duration-300">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Waitlisted Items</h3>
          <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{products.filter(p => p.availability === 'Waitlisted').length}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 overflow-x-auto transition-colors duration-300">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold dark:text-white">Catalog</h2>
          {canEditProducts && (
             <div className="flex gap-2">
               <ExcelImportButton onImport={handleImport} />
               <button onClick={handleAddProduct} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition shadow-sm text-sm">
                 + Add Product
               </button>
             </div>
          )}
        </div>
        
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="py-3 px-4 font-semibold text-sm text-slate-600 dark:text-slate-400">Item Name</th>
              <th className="py-3 px-4 font-semibold text-sm text-slate-600 dark:text-slate-400">Category</th>
              <th className="py-3 px-4 font-semibold text-sm text-slate-600 dark:text-slate-400">Pricing</th>
              <th className="py-3 px-4 font-semibold text-sm text-slate-600 dark:text-slate-400">Availability</th>
              <th className="py-3 px-4 font-semibold text-sm text-slate-600 dark:text-slate-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => {
              const isActive = product.availability === "Active";

              return (
                <tr key={product.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="py-3 px-4 font-bold dark:text-slate-200">{product.name}</td>
                  <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
                    <span className="bg-slate-100 dark:bg-slate-700 font-medium px-2 py-1 rounded text-xs">{product.category}</span>
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">{product.pricing}</td>
                  <td className="py-3 px-4 text-sm">
                    <span className={`px-2 py-1 rounded font-medium text-xs ${
                      isActive 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' 
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400'
                    }`}>
                      {product.availability}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                     {canEditProducts ? (
                       <button 
                         onClick={() => handleEdit(product)}
                         className="text-sm px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 rounded font-medium transition"
                       >
                         Edit Pricing
                       </button>
                     ) : (
                       <span className="text-xs text-slate-400 dark:text-slate-500 italic">Read-Only</span>
                     )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <GenericEditModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        itemData={editingProduct}
        onSave={handleSaveEdit}
        title="Edit Product"
        fields={[
          { key: 'name', label: 'Item Name', type: 'text' },
          { key: 'category', label: 'Category', type: 'text' },
          { key: 'pricing', label: 'Pricing', type: 'text' },
          { key: 'availability', label: 'Availability', type: 'select', options: ['Active', 'Sunset coming', 'Waitlisted'] }
        ]}
      />
    </div>
  );
}
