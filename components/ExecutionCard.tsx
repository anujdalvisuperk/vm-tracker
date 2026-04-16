'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const REJECTION_REASONS = [
  "Blurry or Unusable Photo",
  "Wrong Product Displayed",
  "Missing Price Tags/Signage",
  "Incomplete Execution",
  "Stock Depleted / Out of Stock",
  "Other"
];

// Fuzzy matching logic to guess the store name
const findBestStoreMatch = (rawText: string, officialStores: string[]) => {
    if (!rawText) return '';
    
    // 1. Clean the Slack input (remove punctuation and make lowercase)
    let cleanInput = rawText.toLowerCase().replace(/[.,!*'_]/g, ' ');
    
    // 2. Define "Stop Words" (Words that ruin the scoring)
    const stopWords = ['superk', 'store', 'supermarket', 'mart', 'done', 'execution', 'photo', 'sir', 'check', 'vm'];
    
    // Strip stop words out of the input so we only look at unique identifying words
    stopWords.forEach(sw => {
       cleanInput = cleanInput.replace(new RegExp(`\\b${sw}\\b`, 'g'), ' ');
    });
  
    let bestMatch = '';
    let highestScore = 0;
  
    officialStores.forEach(store => {
      const cleanStore = store.toLowerCase();
      
      // Check 1: Direct Substring Match (Always wins)
      if (rawText.toLowerCase().includes(cleanStore)) {
          bestMatch = store;
          highestScore = 999; 
          return;
      }
  
      // Check 2: Unique Token Scoring
      let uniqueStoreName = cleanStore;
      // Strip "SuperK" out of the official name so we only score based on the location/identifier
      stopWords.forEach(sw => {
           uniqueStoreName = uniqueStoreName.replace(new RegExp(`\\b${sw}\\b`, 'g'), ' ');
      });
  
      // Split into words, allowing 3-letter words (like KVR)
      const tokens = uniqueStoreName.split(/\s+/).filter(t => t.length >= 3); 
  
      let score = 0;
      tokens.forEach(t => {
          if (cleanInput.includes(t)) {
              // Weight longer words higher (e.g. matching "Anantapur" is worth 9 points, matching "KVR" is worth 3)
              score += t.length; 
          }
      });
  
      if (score > highestScore && score > 0) {
        highestScore = score;
        bestMatch = store;
      }
    });
  
    return highestScore > 0 ? bestMatch : '';
  };

export default function ExecutionCard({ execution, onUpdate }: { execution: any, onUpdate: () => void }) {
  const [mappedStore, setMappedStore] = useState(execution.store_name || '');
  const [selectedCampaign, setSelectedCampaign] = useState(execution.campaign_name || '');
  
  // LIVE DATA STATES
  const [officialStores, setOfficialStores] = useState<string[]>([]);
  const [allCampaigns, setAllCampaigns] = useState<any[]>([]);
  
  // Rejection UI State
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const isProcessed = execution.status === 'approved' || execution.status === 'rejected';

  useEffect(() => {
    const fetchMasterData = async () => {
      const { data: stores } = await supabase.from('stores').select('name').order('name');
      if (stores) {
        const storeNames = stores.map(s => s.name);
        setOfficialStores(storeNames);
        
        if (!mappedStore && execution.raw_text) {
          const guess = findBestStoreMatch(execution.raw_text, storeNames);
          if (guess) setMappedStore(guess);
          else setMappedStore(execution.extracted_store || '');
        }
      }

      const { data: campaigns } = await supabase.from('campaigns').select('*').order('name');
      if (campaigns) setAllCampaigns(campaigns);
    };
    fetchMasterData();
  }, []);

  const handleApprove = async () => {
    if (!selectedCampaign) return alert("Please assign a Campaign before approving.");
    if (!mappedStore) return alert("Please map a valid Store before approving.");

    const { error } = await supabase.from('executions').update({ 
      status: 'approved',
      store_name: mappedStore, 
      campaign_name: selectedCampaign,
      rejection_reason: null,
      reviewed_at: new Date().toISOString()
    }).eq('id', execution.id);

    if (!error) onUpdate();
    else alert("Error: " + error.message);
  };

  const submitReject = async () => {
    if (!rejectReason) return alert("Please select a rejection reason.");

    const { error } = await supabase.from('executions').update({ 
      status: 'rejected',
      store_name: mappedStore, 
      campaign_name: selectedCampaign || null,
      rejection_reason: rejectReason,
      reviewed_at: new Date().toISOString()
    }).eq('id', execution.id);

    if (!error) onUpdate();
    else alert("Error: " + error.message);
  };

  const handleUndo = async () => {
    await supabase.from('executions').update({ status: 'pending_admin', reviewed_at: null }).eq('id', execution.id);
    onUpdate();
  };

  // NEW: Delete Workflow
  const handleDelete = async () => {
    if (confirm("Are you sure you want to permanently delete this photo? This will remove it from the database entirely.")) {
      const { error } = await supabase.from('executions').delete().eq('id', execution.id);
      if (!error) onUpdate();
      else alert("Error deleting record: " + error.message);
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
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Slack Submission</p>
              <p className="text-slate-700 italic font-medium leading-relaxed">&quot;{execution.raw_text || 'No caption provided'}&quot;</p>
            </div>
            <p className="text-xs text-slate-400 font-medium">{new Date(execution.submission_date).toLocaleString()}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Mapped Store</label>
              <input 
                type="text" placeholder="Search store name..."
                className={`w-full border rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-600 disabled:font-semibold ${!officialStores.includes(mappedStore) ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`}
                value={mappedStore} onChange={(e) => setMappedStore(e.target.value)} list={`store-options-${execution.id}`} disabled={isProcessed}
              />
              <datalist id={`store-options-${execution.id}`}>
                {officialStores.map((s, i) => <option key={i} value={s} />)}
              </datalist>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Assigned Campaign</label>
              {isProcessed ? (
                <div className="w-full border border-slate-100 bg-slate-50 rounded-lg px-3 py-2 text-sm text-slate-600 font-semibold truncate">
                  {execution.campaign_name || 'No Campaign Assigned'}
                </div>
              ) : (
                <select
                  value={selectedCampaign} onChange={(e) => setSelectedCampaign(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="" disabled>Select a campaign...</option>
                  {alignedCampaigns.length > 0 && (
                    <optgroup label={`Aligned for ${mappedStore || 'this store'}`}>
                      {alignedCampaigns.map(c => <option key={c.id} value={c.name}>⭐ {c.name}</option>)}
                    </optgroup>
                  )}
                  <optgroup label="Other Active Campaigns">
                    {unalignedCampaigns.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </optgroup>
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons & Rejection Flow */}
        <div className="mt-4 border-t border-slate-100 pt-4">
          {!isProcessed ? (
            !isRejecting ? (
              <div className="flex gap-2">
                <button onClick={handleApprove} className="flex-1 bg-green-50 text-green-700 font-bold py-2.5 px-4 rounded-lg border border-green-200 hover:bg-green-100 transition-colors">
                  ✓ Approve & Tag
                </button>
                <button onClick={() => setIsRejecting(true)} className="w-28 bg-red-50 text-red-700 font-bold py-2.5 px-4 rounded-lg border border-red-200 hover:bg-red-100 transition-colors">
                  Reject
                </button>
                {/* Delete Button (Pending Queue) */}
                <button onClick={handleDelete} title="Delete Permanently" className="w-12 flex items-center justify-center bg-slate-50 text-slate-500 font-bold py-2.5 rounded-lg border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors">
                  🗑️
                </button>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 animate-in slide-in-from-right-4">
                <label className="text-xs font-bold text-red-800 uppercase tracking-widest block mb-2">Select Rejection Reason</label>
                <div className="flex gap-2">
                  <select value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="flex-1 border border-red-200 rounded-md px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-500">
                    <option value="" disabled>Choose a reason...</option>
                    {REJECTION_REASONS.map((r, i) => <option key={i} value={r}>{r}</option>)}
                  </select>
                  <button onClick={submitReject} className="bg-red-600 text-white font-bold px-4 py-2 rounded-md hover:bg-red-700">Confirm</button>
                  <button onClick={() => setIsRejecting(false)} className="bg-white text-slate-600 border border-slate-300 font-bold px-4 py-2 rounded-md hover:bg-slate-50">Cancel</button>
                </div>
              </div>
            )
          ) : (
            <div className="flex items-center justify-between">
              <div>
                {execution.status === 'rejected' && <p className="text-sm font-bold text-red-600">❌ Rejected: <span className="font-medium text-slate-700">{execution.rejection_reason}</span></p>}
                {execution.status === 'approved' && <p className="text-sm font-bold text-green-600">✅ Approved Successfully</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={handleUndo} className="bg-slate-50 text-slate-600 font-bold py-2 px-4 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                  ↺ Undo
                </button>
                {/* Delete Button (Processed View) */}
                <button onClick={handleDelete} title="Delete Permanently" className="w-10 flex items-center justify-center bg-slate-50 text-slate-400 font-bold py-2 rounded-lg border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors">
                  🗑️
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}