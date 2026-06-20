"use client";

import React, { useState } from 'react';
import { useCrm } from '../context/CrmContext';
import { User, Bell, Shield, PaintBucket, Save } from 'lucide-react';

export default function SettingsPage() {
  const { currentUser, isDarkMode, toggleDarkMode, switchUser } = useCrm();
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="p-8 text-slate-800 dark:text-slate-100 transition-colors duration-300 h-full overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold dark:text-white mb-2">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400">Manage your account preferences and application settings.</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex overflow-hidden min-h-[600px] transition-colors">
        
        {/* Sidebar Tabs */}
        <div className="w-64 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4">
          <ul className="space-y-2">
            <li>
              <button 
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'profile' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
              >
                <User className="w-4 h-4 mr-3" /> Profile
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('appearance')}
                className={`w-full flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'appearance' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
              >
                <PaintBucket className="w-4 h-4 mr-3" /> Appearance
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('notifications')}
                className={`w-full flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'notifications' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
              >
                <Bell className="w-4 h-4 mr-3" /> Notifications
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('security')}
                className={`w-full flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'security' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
              >
                <Shield className="w-4 h-4 mr-3" /> Security
              </button>
            </li>
          </ul>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8">
          
          {activeTab === 'profile' && (
            <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-xl font-bold dark:text-white mb-6 border-b border-slate-200 dark:border-slate-700 pb-2">Profile Settings</h2>
              
              <div className="flex items-center mb-8">
                <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900 overflow-hidden rounded-full border-4 border-white dark:border-slate-800 shadow flex items-center justify-center">
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-300">{currentUser.name.substring(0,2).toUpperCase()}</span>
                </div>
                <div className="ml-6">
                  <button className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-4 py-2 rounded text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition">Change Avatar</button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                  <input type="text" defaultValue={currentUser.name} className="w-full max-w-md border border-slate-300 dark:border-slate-600 rounded-md p-2 bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                  <input type="email" defaultValue={`${currentUser.name.split(' ')[0].toLowerCase()}@taskflow.com`} className="w-full max-w-md border border-slate-300 dark:border-slate-600 rounded-md p-2 bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role (Read-only)</label>
                  <input type="text" readOnly value={currentUser.role} className="w-full max-w-md border border-slate-200 dark:border-slate-600 rounded-md p-2 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 capitalize cursor-not-allowed" />
                </div>
                <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md font-medium shadow transition flex items-center">
                    <Save className="w-4 h-4 mr-2" /> Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-xl font-bold dark:text-white mb-6 border-b border-slate-200 dark:border-slate-700 pb-2">Appearance Settings</h2>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200">Dark Mode</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Adjust the theme of the application to reduce eye strain.</p>
                  </div>
                  <button 
                    onClick={toggleDarkMode}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isDarkMode ? 'bg-blue-600' : 'bg-slate-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-xl font-bold dark:text-white mb-6 border-b border-slate-200 dark:border-slate-700 pb-2">Notification Preferences</h2>
              <div className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Choose what you want to be notified about.</p>
                {['Email Notifications', 'Push Notifications', 'Weekly Summary', 'New Lead Alerts'].map(item => (
                  <div key={item} className="flex items-center">
                    <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
                    <label className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-300">{item}</label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-xl font-bold dark:text-white mb-6 border-b border-slate-200 dark:border-slate-700 pb-2">Security Settings</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Change Password</h3>
                  <button className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-4 py-2 rounded text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition">Update Password...</button>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Two-Factor Authentication</h3>
                  <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Add an extra layer of security to your account.</p>
                      <p className="text-xs font-bold text-slate-500 uppercase mt-1">Status: Disabled</p>
                    </div>
                    <button className="bg-slate-800 dark:bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-slate-700 dark:hover:bg-blue-700 transition">Enable 2FA</button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}
