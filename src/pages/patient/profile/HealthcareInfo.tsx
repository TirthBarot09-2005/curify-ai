import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../lib/api';

export default function HealthcareInfo() {
  const { profile, fetchProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    height: '',
    weight: '',
    known_allergies: '',
    existing_conditions: '',
    current_medications: '',
    previous_surgeries: '',
    family_medical_history: '',
    chronic_conditions: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        height: profile.height?.toString() || '',
        weight: profile.weight?.toString() || '',
        known_allergies: profile.known_allergies?.join(', ') || '',
        existing_conditions: profile.existing_conditions?.join(', ') || '',
        current_medications: profile.current_medications?.join(', ') || '',
        previous_surgeries: profile.previous_surgeries?.join(', ') || '',
        family_medical_history: profile.family_medical_history || '',
        chronic_conditions: profile.chronic_conditions?.join(', ') || '',
      });
    }
  }, [profile]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.patient.updateProfile({
        height: formData.height ? parseFloat(formData.height) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        known_allergies: formData.known_allergies ? formData.known_allergies.split(',').map(s => s.trim()) : [],
        existing_conditions: formData.existing_conditions ? formData.existing_conditions.split(',').map(s => s.trim()) : [],
        current_medications: formData.current_medications ? formData.current_medications.split(',').map(s => s.trim()) : [],
        previous_surgeries: formData.previous_surgeries ? formData.previous_surgeries.split(',').map(s => s.trim()) : [],
        family_medical_history: formData.family_medical_history,
        chronic_conditions: formData.chronic_conditions ? formData.chronic_conditions.split(',').map(s => s.trim()) : [],
      });
      await fetchProfile();
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save healthcare info');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-navy-900">Healthcare Profile</h2>
          <p className="text-sm text-slate-500 mt-1">Optional medical information to improve recommendations.</p>
        </div>
        {!isEditing ? (
          <button onClick={() => setIsEditing(true)} className="btn-secondary text-sm py-1.5 px-4">Edit Info</button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setIsEditing(false)} className="btn-secondary text-sm py-1.5 px-4 bg-white border-slate-200">Cancel</button>
            <button onClick={handleSave} disabled={loading} className="btn-primary text-sm py-1.5 px-4">{loading ? 'Saving...' : 'Save'}</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Height (cm)</label>
          <input type="number" value={formData.height} onChange={e => setFormData({...formData, height: e.target.value})} disabled={!isEditing} className="input-field" placeholder="Optional" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Weight (kg)</label>
          <input type="number" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} disabled={!isEditing} className="input-field" placeholder="Optional" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Known Allergies</label>
          <input type="text" value={formData.known_allergies} onChange={e => setFormData({...formData, known_allergies: e.target.value})} disabled={!isEditing} className="input-field" placeholder="Comma separated, e.g. Penicillin, Peanuts" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Existing Medical Conditions</label>
          <input type="text" value={formData.existing_conditions} onChange={e => setFormData({...formData, existing_conditions: e.target.value})} disabled={!isEditing} className="input-field" placeholder="Comma separated, e.g. Hypertension, Diabetes" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Current Medications</label>
          <input type="text" value={formData.current_medications} onChange={e => setFormData({...formData, current_medications: e.target.value})} disabled={!isEditing} className="input-field" placeholder="Comma separated, e.g. Metformin 500mg" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Previous Surgeries</label>
          <input type="text" value={formData.previous_surgeries} onChange={e => setFormData({...formData, previous_surgeries: e.target.value})} disabled={!isEditing} className="input-field" placeholder="Comma separated, e.g. Appendectomy 2015" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Family Medical History</label>
          <textarea value={formData.family_medical_history} onChange={e => setFormData({...formData, family_medical_history: e.target.value})} disabled={!isEditing} className="input-field min-h-[80px]" placeholder="Optional notes on family history..." />
        </div>
      </div>
    </div>
  );
}
