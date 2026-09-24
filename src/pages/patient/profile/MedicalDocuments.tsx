import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import { FileText, Plus, Trash2, Calendar, Building2, UploadCloud } from 'lucide-react';

export default function MedicalDocuments() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  
  // Mock form state for adding a document
  const [newDoc, setNewDoc] = useState({
    name: '',
    type: 'Prescription',
    date: new Date().toISOString().split('T')[0],
    hospital_doctor: '',
    notes: '',
  });

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const data = await api.patient.documents.get();
      setDocuments(data || []);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const added = await api.patient.documents.add(newDoc);
      setDocuments([added, ...documents]);
      setIsUploading(false);
      setNewDoc({
        name: '',
        type: 'Prescription',
        date: new Date().toISOString().split('T')[0],
        hospital_doctor: '',
        notes: '',
      });
    } catch (err) {
      console.error('Failed to add document:', err);
      alert('Failed to add document');
    }
  };

  const handleRemove = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document record?')) return;
    try {
      await api.patient.documents.remove(docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (err) {
      console.error('Failed to remove document:', err);
      alert('Failed to remove document');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-navy-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-600" />
            Medical Documents
          </h2>
          <p className="text-sm text-slate-500 mt-1">Organize your prescriptions, reports, and imaging.</p>
        </div>
        <button 
          onClick={() => setIsUploading(!isUploading)} 
          className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Document
        </button>
      </div>

      {isUploading && (
        <form onSubmit={handleAdd} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-navy-900 mb-2 flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-teal-600" /> Upload New Record
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Document Name</label>
              <input required type="text" value={newDoc.name} onChange={e => setNewDoc({...newDoc, name: e.target.value})} className="input-field py-1.5 text-sm" placeholder="e.g. MRI Knee Report" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Document Type</label>
              <select value={newDoc.type} onChange={e => setNewDoc({...newDoc, type: e.target.value})} className="input-field py-1.5 text-sm">
                <option value="Prescription">Prescription</option>
                <option value="Lab Report">Lab Report</option>
                <option value="Diagnostic Report">Diagnostic Report</option>
                <option value="Scan / Imaging">Scan / Imaging</option>
                <option value="Discharge Summary">Discharge Summary</option>
                <option value="Insurance Document">Insurance Document</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Date</label>
              <input required type="date" value={newDoc.date} onChange={e => setNewDoc({...newDoc, date: e.target.value})} className="input-field py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Hospital / Doctor</label>
              <input type="text" value={newDoc.hospital_doctor} onChange={e => setNewDoc({...newDoc, hospital_doctor: e.target.value})} className="input-field py-1.5 text-sm" placeholder="Optional" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Notes (Optional)</label>
              <input type="text" value={newDoc.notes} onChange={e => setNewDoc({...newDoc, notes: e.target.value})} className="input-field py-1.5 text-sm" placeholder="Any additional context..." />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/60 mt-4">
            <button type="button" onClick={() => setIsUploading(false)} className="btn-secondary text-xs px-4 py-1.5">Cancel</button>
            <button type="submit" className="btn-primary text-xs px-4 py-1.5">Save Record</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading documents...</div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">No medical records</h3>
          <p className="text-sm text-slate-500 mt-1">Upload your prescriptions and lab reports to keep them handy.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div key={doc.id} className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm hover:border-teal-200 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-navy-900">{doc.name}</h4>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1 font-medium">
                    <span className="text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">{doc.type}</span>
                    {doc.date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(doc.date).toLocaleDateString()}
                      </span>
                    )}
                    {doc.hospital_doctor && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" />
                        {doc.hospital_doctor}
                      </span>
                    )}
                  </div>
                  {doc.notes && <p className="text-xs text-slate-400 mt-2 italic">{doc.notes}</p>}
                </div>
              </div>
              <button 
                onClick={() => handleRemove(doc.id)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors flex-shrink-0 self-end sm:self-auto"
                title="Delete document"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
