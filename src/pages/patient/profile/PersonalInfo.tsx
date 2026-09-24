import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../lib/api';

export default function PersonalInfo() {
  const { user, profile, fetchProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    date_of_birth: '',
    gender: '',
    blood_group: '',
    city: '',
    state: '',
    pincode: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && profile) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        date_of_birth: profile.date_of_birth ? new Date(profile.date_of_birth).toISOString().split('T')[0] : '',
        gender: profile.gender || '',
        blood_group: profile.blood_group || '',
        city: profile.city || '',
        state: profile.state || '',
        pincode: profile.pincode || '',
      });
    }
  }, [user, profile]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.patient.updateProfile(formData);
      await fetchProfile();
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-navy-900">Personal Information</h2>
          <p className="text-sm text-slate-500 mt-1">Manage your basic demographic details.</p>
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
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">First Name</label>
          <input type="text" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} disabled={!isEditing} className="input-field" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Last Name</label>
          <input type="text" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} disabled={!isEditing} className="input-field" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Date of Birth</label>
          <input type="date" value={formData.date_of_birth} onChange={e => setFormData({...formData, date_of_birth: e.target.value})} disabled={!isEditing} className="input-field" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Gender</label>
          <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} disabled={!isEditing} className="input-field">
            <option value="">Select</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Blood Group</label>
          <select value={formData.blood_group} onChange={e => setFormData({...formData, blood_group: e.target.value})} disabled={!isEditing} className="input-field">
            <option value="">Select</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">City</label>
          <input type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} disabled={!isEditing} className="input-field" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">State</label>
          <input type="text" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} disabled={!isEditing} className="input-field" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Pincode</label>
          <input type="text" value={formData.pincode} onChange={e => setFormData({...formData, pincode: e.target.value})} disabled={!isEditing} className="input-field" />
        </div>
      </div>
    </div>
  );
}
