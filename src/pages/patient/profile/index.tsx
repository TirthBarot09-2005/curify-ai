import { useState } from 'react';
import { User, Shield, HeartPulse, Stethoscope, Save, FileText, Lock, FileKey } from 'lucide-react';
import PersonalInfo from './PersonalInfo';
import HealthcareInfo from './HealthcareInfo';
import EmergencyInfo from './EmergencyInfo';
import Insurance from './Insurance';
import Preferences from './Preferences';
import SavedHospitals from './SavedHospitals';
import MedicalDocuments from './MedicalDocuments';
import Security from './Security';
import Privacy from './Privacy';

export default function PatientProfile() {
  const [activeTab, setActiveTab] = useState('personal');

  const tabs = [
    { id: 'personal', label: 'Personal Information', icon: User },
    { id: 'healthcare', label: 'Healthcare Profile', icon: HeartPulse },
    { id: 'emergency', label: 'Emergency Info', icon: Shield },
    { id: 'insurance', label: 'Insurance & Financing', icon: FileText },
    { id: 'preferences', label: 'Preferences', icon: Stethoscope },
    { id: 'saved', label: 'Saved Hospitals', icon: Save },
    { id: 'documents', label: 'Medical Documents', icon: FileText },
    { id: 'security', label: 'Account & Security', icon: FileKey },
    { id: 'privacy', label: 'Privacy & Data', icon: Lock },
  ];

  return (
    <div className="animate-fade-in max-w-7xl mx-auto flex flex-col md:flex-row gap-8">
      {/* Sidebar */}
      <div className="w-full md:w-64 flex-shrink-0">
        <h1 className="text-2xl font-bold text-navy-900 mb-6 px-3">Your Account</h1>
        <nav className="flex flex-col gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-teal-50 text-teal-900 border border-teal-100 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-navy-900'
              }`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-teal-600' : 'text-slate-400'}`} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 pb-12">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 min-h-[600px]">
          {activeTab === 'personal' && <PersonalInfo />}
          {activeTab === 'healthcare' && <HealthcareInfo />}
          {activeTab === 'emergency' && <EmergencyInfo />}
          {activeTab === 'insurance' && <Insurance />}
          {activeTab === 'preferences' && <Preferences />}
          {activeTab === 'saved' && <SavedHospitals />}
          {activeTab === 'documents' && <MedicalDocuments />}
          {activeTab === 'security' && <Security />}
          {activeTab === 'privacy' && <Privacy />}
        </div>
      </div>
    </div>
  );
}
