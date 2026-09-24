import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api';
import { Save, Building2, MapPin, Star, Trash2, ArrowRight } from 'lucide-react';
import type { Hospital } from '../../../types';

export default function SavedHospitals() {
  const [savedHospitals, setSavedHospitals] = useState<(Hospital & { saved_at: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSavedHospitals();
  }, []);

  const fetchSavedHospitals = async () => {
    try {
      const data = await api.patient.savedHospitals.get();
      setSavedHospitals(data || []);
    } catch (err) {
      console.error('Failed to fetch saved hospitals:', err);
    } finally {
      setLoading(false);
    }
  };

  const removeHospital = async (hospitalId: string) => {
    try {
      await api.patient.savedHospitals.remove(hospitalId);
      setSavedHospitals(prev => prev.filter(h => h.id !== hospitalId));
    } catch (err) {
      console.error('Failed to remove hospital:', err);
      alert('Failed to remove hospital');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading saved hospitals...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-navy-900 flex items-center gap-2">
          <Save className="w-5 h-5 text-teal-600" />
          Saved Hospitals
        </h2>
        <p className="text-sm text-slate-500 mt-1">Hospitals you have bookmarked for comparison.</p>
      </div>

      {savedHospitals.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">No saved hospitals</h3>
          <p className="text-sm text-slate-500 mt-1">You haven't bookmarked any hospitals yet.</p>
          <button onClick={() => navigate('/patient/hospitals')} className="mt-4 btn-primary text-xs px-4 py-2">
            Discover Hospitals
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {savedHospitals.map((hospital) => (
            <div key={hospital.id} className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start gap-4">
                  <h3 className="text-base font-bold text-navy-900 leading-tight">
                    {hospital.name}
                  </h3>
                  <button 
                    onClick={() => removeHospital(hospital.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                    title="Remove from saved"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-2">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {hospital.city}
                  </span>
                  {hospital.rating && (
                    <span className="flex items-center gap-1 font-semibold text-slate-700">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      {hospital.rating} / 5.0
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-medium text-slate-400">
                  Saved on {new Date(hospital.saved_at).toLocaleDateString()}
                </span>
                <button 
                  onClick={() => navigate(`/patient/hospitals/${hospital.id}`)}
                  className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1"
                >
                  View Details <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
