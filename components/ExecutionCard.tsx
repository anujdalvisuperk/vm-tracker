'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const findBestStoreMatch = (rawText: string, officialStores: string[]) => {
  if (!rawText) return '';
  let cleanInput = rawText.toLowerCase().replace(/[.,!*'_]/g, ' ');
  const stopWords = ['superk', 'store', 'supermarket', 'mart', 'done', 'execution', 'photo', 'sir', 'check', 'vm'];
  
  stopWords.forEach(sw => { cleanInput = cleanInput.replace(new RegExp(`\\b${sw}\\b`, 'g'), ' '); });

  let bestMatch = '';
  let highestScore = 0;

  officialStores.forEach(store => {
    const cleanStore = store.toLowerCase();
    if (rawText.toLowerCase().includes(cleanStore)) {
        bestMatch = store; highestScore = 999; return;
    }
    let uniqueStoreName = cleanStore;
    stopWords.forEach(sw => { uniqueStoreName = uniqueStoreName.replace(new RegExp(`\\b${sw}\\b`, 'g'), ' '); });
    const tokens = uniqueStoreName.split(/\s+/).filter(t => t.length >= 3); 
    let score = 0;
    tokens.forEach(t => { if (cleanInput.includes(t)) score += t.length; });
    if (score > highestScore && score > 0) { highestScore = score; bestMatch = store; }
  });
  return highestScore > 0 ? bestMatch : '';
};

export default function ExecutionCard({ execution, onUpdate, rejectionReasons }: { execution: any, onUpdate: () => void, rejectionReasons: any[] }) {
  const [mappedStore, setMappedStore] = useState(execution.store_name || execution.extracted_store || '');
  const initialCampaigns = execution.campaign_name ? execution.campaign_name.split(', ') : [];
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>(initialCampaigns);
  
  const [officialStores, setOfficialStores] = useState<string[]>([]);
  const [allCampaigns, setAllCampaigns] = useState<any[]>([]);
  
  const [actionState, setActionState] = useState<'idle' | 'approving' | 'rejecting'>('idle');
  const [rejectReason, setRejectReason] = useState('');
  const [customRejectReason, setCustomRejectReason] = useState('');

  const isProcessed = execution.status === 'approved' || execution.status === 'rejected';
  
  // NEW: Detect if this is a PAZO upload
  const isPazo = execution.raw_text === 'PAZO Import';

  useEffect(() => {
    const fetchMasterData = async () => {
      const { data: stores } = await supabase.from('stores').select('name').order('name');
      if (stores) {
        const storeNames = stores.map(s => s.name);
        setOfficialStores(storeNames);
        if (!mappedStore && !isPazo && execution.raw_text) {
          const guess = findBestStoreMatch(execution.raw_text, storeNames);
          if (guess) setMappedStore(guess);
        }
      }
      const { data: campaigns } = await supabase.from('campaigns').select('*').order('name');
      if (campaigns) setAllCampaigns(campaigns);
    };
    fetchMasterData();
  }, []);

  const toggleCampaign = (campName: string) => {
    setSelectedCampaigns(prev => prev.includes(campName) ? prev.filter(c => c !== campName) : [...prev, campName]);
  };

  const confirmApprove = async () => {
    if (!mappedStore) return alert("Please map a valid Store before approving.");
    const finalCampaignString = selectedCampaigns.length > 0 ? selectedCampaigns.join(', ') : null;
    const { error } = await supabase.from('executions').update({ 
      status: 'approved', store_name: mappedStore, campaign_name: finalCampaignString,
      rejection_reason: null, reviewed_at: new Date().toISOString()
    }).eq('id', execution.id);
    if (!error) onUpdate(); else alert("Error: " + error.message);
  };

  const confirmReject = async () => {
    if (!rejectReason) return alert("Please select a rejection reason.");
    if (rejectReason === 'Other (Type custom reason)' && !customRejectReason.trim()) return alert("Please type a custom reason.");
    const finalReason = rejectReason === 'Other (Type custom reason)' ? customRejectReason : rejectReason;
    const finalCampaignString = selectedCampaigns.length > 0 ? selectedCampaigns.join(', ') : null;

    const { error } = await supabase.from('executions').update({ 
      status: 'rejected', store_name: mappedStore, campaign_name: finalCampaignString,
      rejection_reason: finalReason, reviewed_at: new Date().toISOString()
    }).eq('id', execution.id);
    if (!error) onUpdate(); else alert("Error: " + error.message);
  };

  const handleUndo = async () => {
    await supabase.from('executions').update({ status: 'pending_admin', reviewed_at: null }).eq('id', execution.id);
    onUpdate();
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to permanently delete this photo?")) {
      const { error } = await supabase.from('executions').delete().eq('id', execution.id);
      if (!error) onUpdate(); else alert("Error deleting: " + error.message);
    }
  };

  const alignedCampaigns = allCampaigns.filter(c => c.stores && c.stores.includes(mappedStore));
  const unalignedCampaigns = allCampaigns.filter(c => !c.stores || !c.stores.includes(mappedStore));

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex mb-6">
      <div className="w-[350px] bg-slate-100 flex-shrink-0 relative group">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={execution.image_url} alt="Execution" className="w-full h-full object-cover cursor-zoom-in" onClick={() => window.open(execution.image_url, '_blank')} />
      </div>

      <div className="flex-1 p-6 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start mb-6">
            <div>
              {/* NEW: Dynamic Source Tagging */}
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isPazo ? 'text-indigo-500' : 'text-slate-400'}`}>
                {isPazo ? 'PAZO Bulk Import' : 'Slack Submission'}
              </p>
              <p className="text-slate-700 italic font-medium leading-relaxed">
                {isPazo ? "Automated PAZO Queue Data" : `"${execution.raw_text || 'No caption provided'}"`}
              </p>
            </div>
            <p className="text-xs text-slate-400 font-medium">{new Date(execution.submission_date).toLocaleString()}</p>
          </div>

          <div className="mb-4">
             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Mapped Store</label>
             <input 
               type="text" placeholder="Search store name..."
               className={`w-full max-w-md border rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-600 disabled:font-semibold ${!officialStores.includes(mappedStore) ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`}
               value={mappedStore} onChange={(e) => setMappedStore(e.target.value)} list={`store-options-${execution.id}`} disabled={isProcessed || actionState !== 'idle'}
             />
             <datalist id={`store-options-${execution.id}`}>
               {officialStores.map((s, i) => <option key={i} value={s} />)}
             </datalist>
          </div>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4 min-h-[120px] flex flex-col justify-end">
          
          {isProcessed && (
            <div>
               <div className="mb-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Tagged Campaigns</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedCampaigns.length > 0 ? selectedCampaigns.map(camp => (
                      <span key={camp} className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1.5 rounded-md text-sm font-semibold">{camp}</span>
                    )) : <span className="text-sm text-slate-500 italic">None</span>}
                  </div>
               </div>
               <div className="flex items-center justify-between">
                <div>
                  {execution.status === 'rejected' && <p className="text-sm font-bold text-red-600">❌ Rejected: <span className="font-medium text-slate-700">{execution.rejection_reason}</span></p>}
                  {execution.status === 'approved' && <p className="text-sm font-bold text-green-600">✅ Approved Successfully</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={handleUndo} className="bg-slate-50 text-slate-600 font-bold py-2 px-4 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">↺ Undo</button>
                  <button onClick={handleDelete} title="Delete" className="w-10 flex items-center justify-center bg-slate-50 text-slate-400 font-bold py-2 rounded-lg border border-slate-200 hover:bg-red-50 hover:text-red-600 transition-colors">🗑️</button>
                </div>
              </div>
            </div>
          )}

          {!isProcessed && actionState === 'idle' && (
            <div className="flex gap-2">
              <button onClick={() => setActionState('approving')} className="flex-1 bg-green-50 text-green-700 font-bold py-3 px-4 rounded-lg border border-green-200 hover:bg-green-100 transition-colors">
                ✓ Approve & Tag
              </button>
              <button onClick={() => setActionState('rejecting')} className="w-32 bg-red-50 text-red-700 font-bold py-3 px-4 rounded-lg border border-red-200 hover:bg-red-100 transition-colors">
                Reject
              </button>
              <button onClick={handleDelete} title="Delete" className="w-12 flex items-center justify-center bg-slate-50 text-slate-500 font-bold py-3 rounded-lg border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors">
                🗑️
              </button>
            </div>
          )}

          {!isProcessed && actionState !== 'idle' && (
            <div className={`p-4 rounded-xl border ${actionState === 'approving' ? 'bg-blue-50/50 border-blue-100' : 'bg-red-50/30 border-red-100'} animate-in fade-in slide-in-from-bottom-2`}>
              
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm font-bold text-slate-700">Tag Brands (Select multiple if needed)</p>
                <button onClick={() => setActionState('idle')} className="text-xs font-bold text-blue-600 hover:underline">← Back</button>
              </div>

              <div className="flex flex-wrap gap-2 mb-5">
                {alignedCampaigns.map(c => {
                  const isSelected = selectedCampaigns.includes(c.name);
                  return (
                    <button key={c.id} onClick={() => toggleCampaign(c.name)} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${isSelected ? 'bg-green-500 text-white border-green-600 shadow-sm ring-2 ring-green-200' : 'bg-green-50 text-green-800 border-green-200 hover:bg-green-100'}`}>
                      {c.name} ✨
                    </button>
                  );
                })}
                {unalignedCampaigns.map(c => {
                  const isSelected = selectedCampaigns.includes(c.name);
                  return (
                    <button key={c.id} onClick={() => toggleCampaign(c.name)} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${isSelected ? 'bg-slate-700 text-white border-slate-800 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                      {c.name}
                    </button>
                  );
                })}
              </div>

              {actionState === 'rejecting' && (
                <div className="mb-5 pt-4 border-t border-red-100">
                  <label className="text-sm font-bold text-red-800 block mb-2">Reason for Rejection *</label>
                  <select value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="w-full border border-red-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm mb-2">
                    <option value="" disabled>-- Select a reason --</option>
                    {rejectionReasons.map((r) => <option key={r.id} value={r.reason}>{r.reason}</option>)}
                    <option value="Other (Type custom reason)">Other (Type custom reason)</option>
                  </select>
                  {rejectReason === 'Other (Type custom reason)' && (
                    <input type="text" placeholder="Type specific reason..." value={customRejectReason} onChange={(e) => setCustomRejectReason(e.target.value)} className="w-full border border-red-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm" autoFocus />
                  )}
                </div>
              )}

              {actionState === 'approving' ? (
                <button onClick={confirmApprove} className="w-full bg-blue-400 hover:bg-blue-500 text-white font-bold py-3 rounded-lg shadow-sm transition-colors text-base">
                  Confirm & Approve Execution
                </button>
              ) : (
                <button onClick={confirmReject} className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-lg shadow-sm transition-colors text-base">
                  Confirm Rejection
                </button>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}