'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient'; 
import ExecutionCard from '../components/ExecutionCard'; 

const Pagination = ({ total, page, setPage, perPage = 10 }: { total: number, page: number, setPage: (p: number) => void, perPage?: number }) => {
  const maxPages = Math.ceil(total / perPage);
  if (maxPages <= 1) return null;
  return (
    <div className="flex justify-between items-center mt-6 bg-slate-50 p-2 rounded-lg border border-slate-100">
      <button disabled={page === 1} onClick={() => setPage(page - 1)} className="px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-30 hover:bg-slate-200 rounded-md transition-colors">← Previous</button>
      <span className="text-sm font-bold text-slate-500">Page {page} of {maxPages}</span>
      <button disabled={page === maxPages} onClick={() => setPage(page + 1)} className="px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-30 hover:bg-slate-200 rounded-md transition-colors">Next →</button>
    </div>
  );
};

const parseCSVRow = (str: string) => {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < str.length; i++) {
        if (str[i] === '"') {
            inQuotes = !inQuotes;
        } else if (str[i] === ',' && !inQuotes) {
            result.push(cur.trim());
            cur = '';
        } else {
            cur += str[i];
        }
    }
    result.push(cur.trim());
    return result;
};

// --- NEW COMPONENT: ORPHAN RECOVERY CARD ---
const OrphanCard = ({ execution, storesList, campaignsList, reasonsList, onResolve, onDelete }: any) => {
  const [editedStore, setEditedStore] = useState(execution.store_name || '');
  const [selectedCamp, setSelectedCamp] = useState(execution.campaign_name || '');
  const [actionState, setActionState] = useState<'idle' | 'rejecting'>('idle');
  const [rejectReason, setRejectReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  const handleApprove = () => {
    if (!editedStore.trim()) return alert("Please enter a valid store name.");
    if (!selectedCamp) return alert("Please select a campaign.");
    onResolve(execution.id, editedStore.trim(), selectedCamp, 'approved', null);
  };

  const handleReject = () => {
    if (!editedStore.trim()) return alert("Please enter a valid store name.");
    if (!selectedCamp) return alert("Please select a campaign so the rejection tracks to the matrix.");
    if (!rejectReason) return alert("Please select a reason.");
    const finalReason = rejectReason === 'Other (Type custom reason)' ? customReason : rejectReason;
    if (rejectReason === 'Other (Type custom reason)' && !finalReason.trim()) return alert("Please type a reason.");
    
    onResolve(execution.id, editedStore.trim(), selectedCamp, 'rejected', finalReason);
  };

  return (
    <div className="bg-amber-50/30 border border-amber-200 rounded-xl overflow-visible shadow-sm flex mb-6">
      <div className="w-[300px] bg-slate-100 flex-shrink-0 relative group rounded-l-xl overflow-hidden border-r border-amber-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={execution.image_url} alt="Execution" className="w-full h-full object-cover cursor-zoom-in" onClick={() => window.open(execution.image_url, '_blank')} />
        <div className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-black px-2 py-1 rounded shadow-sm uppercase tracking-widest">Orphaned Data</div>
      </div>

      <div className="flex-1 p-6 flex flex-col justify-between overflow-visible">
        <div>
          <div className="flex justify-between items-start mb-4">
             <div>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Original Bad Mapping</p>
               <p className="text-xl font-black text-red-500 line-through decoration-2">{execution.store_name}</p>
             </div>
             <p className="text-xs text-slate-400 font-medium">{new Date(execution.submission_date).toLocaleString()}</p>
          </div>
          <p className="text-sm text-slate-600 italic mb-6 border-l-2 border-slate-300 pl-3">&quot;{execution.raw_text}&quot;</p>

          <div className="grid grid-cols-2 gap-4 mb-4">
             <div>
               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Correct Store Name *</label>
               <input 
                 type="text" 
                 value={editedStore} 
                 onChange={(e) => setEditedStore(e.target.value)} 
                 list={`orphan-stores-${execution.id}`}
                 className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 bg-white"
                 placeholder="Type or select correct store..."
               />
               <datalist id={`orphan-stores-${execution.id}`}>
                 {storesList.map((s: any) => <option key={s.id} value={s.name} />)}
               </datalist>
             </div>
             <div>
               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Assign Campaign *</label>
               <select 
                 value={selectedCamp} 
                 onChange={(e) => setSelectedCamp(e.target.value)}
                 className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white"
               >
                 <option value="" disabled>-- Select Campaign --</option>
                 {campaignsList.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
               </select>
             </div>
          </div>
        </div>

        <div className="mt-2 pt-4 border-t border-amber-100 flex flex-col justify-end min-h-[50px]">
          {actionState === 'idle' ? (
             <div className="flex gap-2">
               <button onClick={handleApprove} className="flex-1 bg-green-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-green-700 transition-colors shadow-sm">
                 ✓ Approve & Auto-Assign
               </button>
               <button onClick={() => setActionState('rejecting')} className="w-40 bg-red-50 text-red-700 font-bold py-2.5 px-4 rounded-lg border border-red-200 hover:bg-red-100 transition-colors">
                 Reject Photo
               </button>
               <button onClick={() => onDelete(execution.id)} title="Delete completely" className="w-12 flex items-center justify-center bg-white text-slate-400 font-bold py-2.5 rounded-lg border border-slate-200 hover:bg-red-50 hover:text-red-600 transition-colors">
                 🗑️
               </button>
             </div>
          ) : (
             <div className="bg-red-50 border border-red-100 p-4 rounded-xl animate-in fade-in slide-in-from-bottom-2">
               <div className="flex justify-between items-center mb-3">
                 <label className="text-sm font-bold text-red-800">Reason for Rejection *</label>
                 <button onClick={() => setActionState('idle')} className="text-xs font-bold text-blue-600 hover:underline">← Cancel</button>
               </div>
               <select value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="w-full border border-red-200 rounded-lg px-4 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm mb-3">
                 <option value="" disabled>-- Select a reason --</option>
                 {reasonsList.map((r: any) => <option key={r.id} value={r.reason}>{r.reason}</option>)}
                 <option value="Other (Type custom reason)">Other (Type custom reason)</option>
               </select>
               {rejectReason === 'Other (Type custom reason)' && (
                 <input type="text" placeholder="Type specific reason..." value={customReason} onChange={(e) => setCustomReason(e.target.value)} className="w-full border border-red-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm mb-3" autoFocus />
               )}
               <button onClick={handleReject} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-lg shadow-sm transition-colors text-sm">
                 Confirm Rejection & Auto-Assign
               </button>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function VMDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // NEW: Added 'orphans' view
  const [mainView, setMainView] = useState<'dashboard' | 'queue' | 'pazo' | 'orphans' | 'missing' | 'review' | 'settings' | 'login'>('dashboard');
  const [dashboardTab, setDashboardTab] = useState<'general' | string>('general');
  const [settingsTab, setSettingsTab] = useState<'stores' | 'campaigns' | 'reasons'>('stores');
  const [selectedMonth, setSelectedMonth] = useState('April');

  const [syncStartDate, setSyncStartDate] = useState('');
  const [syncEndDate, setSyncEndDate] = useState('');
  const [missingStartDate, setMissingStartDate] = useState('');
  const [missingEndDate, setMissingEndDate] = useState('');

  const [pendingExecutions, setPendingExecutions] = useState<any[]>([]);
  const [allExecutions, setAllExecutions] = useState<any[]>([]);
  const [storesList, setStoresList] = useState<any[]>([]);
  const [campaignsList, setCampaignsList] = useState<any[]>([]);
  const [reasonsList, setReasonsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [queuePage, setQueuePage] = useState(1);
  const [pazoPage, setPazoPage] = useState(1);
  const [orphansPage, setOrphansPage] = useState(1); // NEW: Pagination for Orphans
  const [missingPage, setMissingPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [storesPage, setStoresPage] = useState(1);
  const [campaignsPage, setCampaignsPage] = useState(1);
  const [matrixPage, setMatrixPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const [reviewFilter, setReviewFilter] = useState<'all' | 'approved' | 'rejected' | 'in_review'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [storeFilter, setStoreFilter] = useState('all');
  const [campaignFilter, setCampaignFilter] = useState('all');
  const [missingCampaignFilter, setMissingCampaignFilter] = useState('all');

  const [selectedPhoto, setSelectedPhoto] = useState<{ id: string; store: string; date: string; status: string; image: string; raw_text: string; rejection_reason?: string } | null>(null);
  const [modalActionState, setModalActionState] = useState<'idle' | 'rejecting'>('idle');
  const [modalRejectReason, setModalRejectReason] = useState('');
  const [modalCustomRejectReason, setModalCustomRejectReason] = useState('');

  const [newStoreName, setNewStoreName] = useState('');
  const [newCampName, setNewCampName] = useState('');
  const [newCampPayout, setNewCampPayout] = useState<number | ''>('');
  const [newCampStores, setNewCampStores] = useState<string[]>([]);
  const [newCampDependencies, setNewCampDependencies] = useState<string[]>([]);
  const [newCampStart, setNewCampStart] = useState('');
  const [newCampEnd, setNewCampEnd] = useState('');
  const [newReason, setNewReason] = useState('');
  
  const [editingStoreId, setEditingStoreId] = useState<number | null>(null);
  const [editingStoreName, setEditingStoreName] = useState('');
  const [editingCampaign, setEditingCampaign] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pazoFileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setIsLoading(true);
    
    // BUMPED LIMITS: Added .limit(50000) to ensure we don't drop older data
    const { data: qData } = await supabase.from('executions')
      .select('*')
      .eq('status', 'pending_admin')
      .order('submission_date', { ascending: false })
      .limit(10000);
    if (qData) setPendingExecutions(qData);

    const { data: hData } = await supabase.from('executions')
      .select('*')
      .order('submission_date', { ascending: false })
      .limit(50000); // 50,000 executions limit for the master history
    if (hData) setAllExecutions(hData);

    const { data: sData } = await supabase.from('stores')
      .select('*')
      .order('name')
      .limit(5000);
    if (sData) setStoresList(sData);

    const { data: cData } = await supabase.from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    if (cData) setCampaignsList(cData);
    
    const { data: rData } = await supabase.from('rejection_reasons')
      .select('*')
      .order('id', { ascending: true });
    if (rData) setReasonsList(rData);

    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, [mainView]);

  useEffect(() => {
    setQueuePage(1); setPazoPage(1); setOrphansPage(1); setMissingPage(1); setHistoryPage(1); setStoresPage(1); setCampaignsPage(1); setMatrixPage(1);
  }, [mainView, settingsTab, reviewFilter, storeFilter, campaignFilter, missingCampaignFilter, searchQuery, dashboardTab]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginPassword === 'superk2026') { setIsAuthenticated(true); setMainView('queue'); setLoginError(''); } 
    else setLoginError('Invalid password');
  };

  const handleLogout = () => { setIsAuthenticated(false); setMainView('dashboard'); };

  // --- ORPHAN DETECTION ENGINE ---
  const orphanExecutions = useMemo(() => {
    const validStoreNames = storesList.map(s => s.name);
    // Find executions that have a store_name, but that name no longer exists in the official stores list
    return allExecutions.filter(e => e.store_name && !validStoreNames.includes(e.store_name));
  }, [allExecutions, storesList]);

  // --- GHOST DETECTION ENGINE ---
  const ghostExecutions = useMemo(() => {
    const ghosts: { execution: any, campaignId: number, campaignName: string, storeName: string }[] = [];
    const validStoreNames = storesList.map(s => s.name);
    
    allExecutions.forEach(e => {
      // Find executions that are fully processed and valid...
      if ((e.status === 'approved' || e.status === 'rejected') && e.campaign_name && e.store_name && validStoreNames.includes(e.store_name)) {
          const taggedCamps = e.campaign_name.split(', ');
          taggedCamps.forEach((cName: string) => {
              const campObj = campaignsList.find(c => c.name === cName);
              // ...but the store is missing from the Campaign's official roster!
              if (campObj && (!campObj.stores || !campObj.stores.includes(e.store_name))) {
                  ghosts.push({ execution: e, campaignId: campObj.id, campaignName: campObj.name, storeName: e.store_name });
              }
          });
      }
    });
    return ghosts;
  }, [allExecutions, storesList, campaignsList]);

  const handleAutoEnrollGhosts = async () => {
    setIsLoading(true);
    const updates: Record<number, Set<string>> = {}; 
    
    // Group all the missing stores by campaign
    ghostExecutions.forEach(g => {
        if (!updates[g.campaignId]) updates[g.campaignId] = new Set();
        updates[g.campaignId].add(g.storeName);
    });
    
    const promises = [];
    for (const [campIdStr, newStoresSet] of Object.entries(updates)) {
        const campId = parseInt(campIdStr);
        const campObj = campaignsList.find(c => c.id === campId);
        if (campObj) {
            const currentStores = campObj.stores || [];
            // Merge existing stores with the newly recovered stores
            const updatedStores = Array.from(new Set([...currentStores, ...Array.from(newStoresSet)]));
            promises.push(supabase.from('campaigns').update({ stores: updatedStores }).eq('id', campId));
        }
    }
    await Promise.all(promises);
    alert(`Successfully enrolled stores for ${ghostExecutions.length} orphaned tags! Your Analytics Matrix is now 100% accurate.`);
    fetchData();
  };

  const handleEnrollSingleGhost = async (campaignId: number, storeName: string, campaignName: string) => {
    setIsLoading(true);
    const campObj = campaignsList.find(c => c.id === campaignId);
    if (campObj) {
        const currentStores = campObj.stores || [];
        if (!currentStores.includes(storeName)) {
            const updatedStores = [...currentStores, storeName];
            const { error } = await supabase.from('campaigns').update({ stores: updatedStores }).eq('id', campaignId);
            if (!error) {
                fetchData();
            } else {
                alert("Error enrolling store: " + error.message);
            }
        }
    }
    setIsLoading(false);
  };

  // --- ORPHAN RESOLUTION HANDLER ---
  const handleOrphanResolve = async (executionId: string, correctedStoreName: string, selectedCampaignName: string, status: 'approved' | 'rejected', rejectReason: string | null) => {
    
    // 1. If they typed a completely new correct store name, auto-add it to the Master Store List
    const storeExists = storesList.some(s => s.name === correctedStoreName);
    if (!storeExists) {
      await supabase.from('stores').insert([{ name: correctedStoreName, aligned: true }]);
    }

    // 2. Update the Execution Record
    const { error: execError } = await supabase.from('executions').update({
      store_name: correctedStoreName,
      campaign_name: selectedCampaignName,
      status: status,
      rejection_reason: rejectReason,
      reviewed_at: new Date().toISOString()
    }).eq('id', executionId);

    if (execError) return alert("Error updating execution: " + execError.message);

    // 3. Auto-Add the Store to the Campaign
    const camp = campaignsList.find(c => c.name === selectedCampaignName);
    if (camp) {
      const currentStores = camp.stores || [];
      if (!currentStores.includes(correctedStoreName)) {
        await supabase.from('campaigns').update({
          stores: [...currentStores, correctedStoreName]
        }).eq('id', camp.id);
      }
    }

    fetchData();
  };

  const handleOrphanDelete = async (executionId: string) => {
    if (confirm("Are you sure you want to permanently delete this orphaned record?")) {
      await supabase.from('executions').delete().eq('id', executionId);
      fetchData();
    }
  };

  // ... (Rest of existing data handlers: handleSyncSlack, handlePazoUpload, etc.) ...
  const handleSyncSlack = async () => {
    if (!syncStartDate) return alert("Please select at least a Start Date.");
    setIsLoading(true);
    try {
      await fetch('/api/slack-sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ startDate: syncStartDate, endDate: syncEndDate }) });
      await fetchData();
    } catch (error) { console.error("Sync failed:", error); }
  };

  const handlePazoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const text = event.target?.result as string;
            const lines = text.split('\n').filter(l => l.trim());
            if (lines.length < 2) throw new Error("CSV is empty or invalid");

            const headers = parseCSVRow(lines[0]);
            const storeIdx = headers.findIndex(h => h.includes('Store Name'));
            const dateIdx = headers.findIndex(h => h.includes('Submitted Dat')); 
            const timeIdx = headers.findIndex(h => h.includes('Submitted Tim')); 
            const imgIdx = headers.findIndex(h => h.includes('Image 1'));

            if (storeIdx === -1 || dateIdx === -1 || timeIdx === -1 || imgIdx === -1) {
                throw new Error("CSV is missing required columns. Please ensure Store Name, Submitted Date, Submitted Time, and Image 1 are present.");
            }

            const newExecutions = [];
            let skippedCount = 0;

            for (let i = 1; i < lines.length; i++) {
                const row = parseCSVRow(lines[i]);
                if (row.length <= Math.max(storeIdx, dateIdx, timeIdx, imgIdx)) continue;

                const storeName = row[storeIdx];
                const dateStr = row[dateIdx];
                const timeStr = row[timeIdx];
                const rawImgText = row[imgIdx];

                const urlMatch = rawImgText.match(/https?:\/\/[^\s",]+/);
                
                if (!urlMatch) {
                    console.warn(`Row ${i + 1} skipped. No valid URL found in text: "${rawImgText}"`);
                    skippedCount++;
                    continue;
                }

                const finalImgUrl = urlMatch[0];

                let isoDate = new Date().toISOString();
                try {
                    const [dd, mm, yyyy] = dateStr.split('-');
                    const timeMatch = timeStr.match(/(\d+):(\d+)\s*(am|pm)/i);
                    if (timeMatch && yyyy && mm && dd) {
                        let hrs = parseInt(timeMatch[1]);
                        const mins = parseInt(timeMatch[2]);
                        const isPm = timeMatch[3].toLowerCase() === 'pm';
                        if (isPm && hrs < 12) hrs += 12;
                        if (!isPm && hrs === 12) hrs = 0;
                        const dateObj = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd), hrs, mins);
                        isoDate = dateObj.toISOString();
                    }
                } catch (e) { console.warn("Date parse error for row", i); }

                newExecutions.push({
                    slack_message_id: `pazo-${Date.now()}-${i}`,
                    raw_text: `PAZO Import`,
                    extracted_store: storeName,
                    image_url: finalImgUrl,
                    status: 'pending_admin',
                    submission_date: isoDate
                });
            }

            if (newExecutions.length > 0) {
                for (let i = 0; i < newExecutions.length; i += 100) {
                    const chunk = newExecutions.slice(i, i + 100);
                    const { error } = await supabase.from('executions').insert(chunk);
                    if (error) console.error("Supabase insert error:", error);
                }
                
                let successMsg = `Successfully imported ${newExecutions.length} PAZO executions!`;
                if (skippedCount > 0) successMsg += `\n(Skipped ${skippedCount} rows because they didn't contain valid 'http' links.)`;
                alert(successMsg);
                
            } else {
                alert("No valid image rows found in the CSV. Make sure you extracted the hidden URLs before exporting!");
            }
            
            fetchData();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsLoading(false);
            if (pazoFileInputRef.current) pazoFileInputRef.current.value = '';
        }
    };
    reader.readAsText(file);
  };

  const handleAddSingleStore = async () => {
    if (!newStoreName.trim()) return;
    await supabase.from('stores').insert([{ name: newStoreName, aligned: true }]);
    setNewStoreName(''); fetchData();
  };

  const toggleStoreAlignment = async (id: number, currentStatus: boolean) => {
    await supabase.from('stores').update({ aligned: !currentStatus }).eq('id', id); fetchData();
  };

  const handleDeleteStore = async (id: number, storeName: string) => {
    if (confirm(`Are you sure you want to permanently delete ${storeName}?`)) {
      await supabase.from('stores').delete().eq('id', id);
      fetchData();
    }
  };

  const startEditStore = (store: any) => { setEditingStoreId(store.id); setEditingStoreName(store.name); };

  const saveEditStore = async (id: number, oldName: string) => {
    if (!editingStoreName.trim()) return setEditingStoreId(null);
    await supabase.from('stores').update({ name: editingStoreName }).eq('id', id);
    if (editingStoreName !== oldName) await supabase.from('executions').update({ store_name: editingStoreName }).eq('store_name', oldName);
    setEditingStoreId(null); fetchData();
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const rows = text.split('\n').map(row => row.trim()).filter(row => row);
      const newStores = rows.map(name => ({ name: name.replace(/,/g, ''), aligned: true }));
      await supabase.from('stores').insert(newStores);
      fetchData();
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleStoreInCampaign = (storeName: string, isEditing = false) => {
    if (isEditing && editingCampaign) {
      const stores = editingCampaign.stores || [];
      const newStores = stores.includes(storeName) ? stores.filter((s: string) => s !== storeName) : [...stores, storeName];
      setEditingCampaign({ ...editingCampaign, stores: newStores });
    } else {
      setNewCampStores(prev => prev.includes(storeName) ? prev.filter(s => s !== storeName) : [...prev, storeName]);
    }
  };

  const toggleDependency = (campName: string, isEditing = false) => {
    if (isEditing && editingCampaign) {
      const deps = editingCampaign.dependencies || [];
      const newDeps = deps.includes(campName) ? deps.filter((c: string) => c !== campName) : [...deps, campName];
      setEditingCampaign({ ...editingCampaign, dependencies: newDeps });
    } else {
      setNewCampDependencies(prev => prev.includes(campName) ? prev.filter(c => c !== campName) : [...prev, campName]);
    }
  };

  const selectAllAlignedStores = (isEditing = false) => {
    const alignedNames = storesList.filter(s => s.aligned).map(s => s.name);
    if (isEditing && editingCampaign) setEditingCampaign({ ...editingCampaign, stores: alignedNames });
    else setNewCampStores(alignedNames);
  };

  const handleAddCampaign = async () => {
    if (!newCampName.trim() || newCampPayout === '' || !newCampStart || !newCampEnd) return alert("Please fill all required campaign fields including dates.");
    await supabase.from('campaigns').insert([{ name: newCampName, payout: Number(newCampPayout), stores: newCampStores, dependencies: newCampDependencies, start_date: newCampStart, end_date: newCampEnd }]);
    setNewCampName(''); setNewCampPayout(''); setNewCampStores([]); setNewCampDependencies([]); setNewCampStart(''); setNewCampEnd(''); fetchData();
  };

  const startDuplicateCampaign = (camp: any) => {
    setNewCampName(`${camp.name} (Copy)`);
    setNewCampPayout(camp.payout);
    setNewCampStart(camp.start_date || '');
    setNewCampEnd(camp.end_date || '');
    setNewCampStores(camp.stores || []);
    setNewCampDependencies(camp.dependencies || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteCampaign = async (id: number, campName: string) => {
    if (confirm(`Are you sure you want to permanently delete the "${campName}" campaign?`)) {
      await supabase.from('campaigns').delete().eq('id', id); fetchData();
    }
  };

  const saveEditCampaign = async () => {
    if (!editingCampaign.name.trim() || editingCampaign.payout === '' || !editingCampaign.start_date || !editingCampaign.end_date) return alert("Please ensure all fields are filled out.");
    await supabase.from('campaigns').update({
      name: editingCampaign.name, payout: Number(editingCampaign.payout), start_date: editingCampaign.start_date, end_date: editingCampaign.end_date,
      stores: editingCampaign.stores || [], dependencies: editingCampaign.dependencies || []
    }).eq('id', editingCampaign.id);
    setEditingCampaign(null); fetchData();
  };

  const handleAddReason = async () => {
    if (!newReason.trim()) return;
    await supabase.from('rejection_reasons').insert([{ reason: newReason.trim() }]);
    setNewReason(''); fetchData();
  };

  const handleDeleteReason = async (id: number) => {
    if (confirm("Are you sure you want to delete this rejection reason?")) {
      await supabase.from('rejection_reasons').delete().eq('id', id);
      fetchData();
    }
  };

  const totalStoresCount = storesList.length;
  const alignedStoresCount = storesList.filter(s => s.aligned).length;
  const unalignedStoresCount = totalStoresCount - alignedStoresCount;
  const alignedPercentage = totalStoresCount > 0 ? Math.round((alignedStoresCount / totalStoresCount) * 100) : 0;

  const filteredReviewData = useMemo(() => {
    return allExecutions.filter(item => {
      const mappedStatus = item.status === 'pending_admin' ? 'in_review' : item.status;
      const finalStoreName = item.store_name || item.extracted_store || 'Unmapped Store';
      const campName = item.campaign_name || 'Unassigned';
      
      const matchesStatus = reviewFilter === 'all' || mappedStatus === reviewFilter;
      const matchesStore = storeFilter === 'all' || finalStoreName === storeFilter;
      const matchesCampaign = campaignFilter === 'all' || campName === campaignFilter;
      const searchStr = `${finalStoreName} ${item.raw_text || ''} ${campName}`.toLowerCase();
      const matchesSearch = searchStr.includes(searchQuery.toLowerCase());
      
      return matchesStatus && matchesStore && matchesCampaign && matchesSearch;
    });
  }, [allExecutions, reviewFilter, searchQuery, storeFilter, campaignFilter]);

  const missingExecutions = useMemo(() => {
    const missing: { store: string; campaign: string; payout: number }[] = [];
    const startTimestamp = missingStartDate ? new Date(missingStartDate).getTime() : 0;
    const endTimestamp = missingEndDate ? new Date(`${missingEndDate}T23:59:59`).getTime() : Infinity;

    campaignsList.forEach(camp => {
      if (!camp.stores) return;
      camp.stores.forEach((storeName: string) => {
        const hasExecution = allExecutions.some(exec => {
            if (exec.store_name !== storeName && exec.extracted_store !== storeName) return false;
            if (exec.campaign_name !== camp.name) return false;
            const execTime = new Date(exec.submission_date).getTime();
            return execTime >= startTimestamp && execTime <= endTimestamp;
        });
        if (!hasExecution) missing.push({ store: storeName, campaign: camp.name, payout: camp.payout });
      });
    });

    if (missingCampaignFilter !== 'all') return missing.filter(m => m.campaign === missingCampaignFilter);
    return missing;
  }, [campaignsList, allExecutions, missingCampaignFilter, missingStartDate, missingEndDate]);

  const matrixData = useMemo(() => {
    const rows: { campaign: string; store: string; w1: any; w2: any; w3: any; w4: any; totalPayout: number }[] = [];

    const getWeekStatusForCamp = (storeName: string, campName: string, weekNum: number) => {
      const storeExecs = allExecutions.filter(e => 
        (e.store_name === storeName || e.extracted_store === storeName) && 
        (e.campaign_name && e.campaign_name.includes(campName))
      );
      const execForWeek = storeExecs.find(e => {
        const day = new Date(e.submission_date).getDate();
        if (weekNum === 1 && day >= 1 && day <= 7) return true;
        if (weekNum === 2 && day >= 8 && day <= 14) return true;
        if (weekNum === 3 && day >= 15 && day <= 21) return true;
        if (weekNum === 4 && day >= 22) return true;
        return false;
      });
      
      if (!execForWeek) return { status: 'Missed', execution: null };
      
      let statusStr = 'Pending';
      if (execForWeek.status === 'approved') statusStr = 'Approved';
      if (execForWeek.status === 'rejected') statusStr = 'Rejected';
      
      return { status: statusStr, execution: execForWeek };
    };

    campaignsList.forEach(camp => {
      if (!camp.stores) return;
      camp.stores.forEach((storeName: string) => {
        const w1 = getWeekStatusForCamp(storeName, camp.name, 1);
        const w2 = getWeekStatusForCamp(storeName, camp.name, 2);
        const w3 = getWeekStatusForCamp(storeName, camp.name, 3);
        const w4 = getWeekStatusForCamp(storeName, camp.name, 4);

        let approvedCount = 0;
        const weeks = [w1, w2, w3, w4];
        
        weeks.forEach((weekObj, index) => {
          const weekNum = index + 1;
          if (weekObj.status === 'Approved') {
            let depsSatisfied = true;
            const deps = camp.dependencies || [];
            deps.forEach((depCampName: string) => {
              if (getWeekStatusForCamp(storeName, depCampName, weekNum).status !== 'Approved') depsSatisfied = false;
            });
            if (depsSatisfied) approvedCount++;
          }
        });

        rows.push({
          campaign: camp.name,
          store: storeName,
          w1, w2, w3, w4,
          totalPayout: approvedCount * (camp.payout || 0)
        });
      });
    });

    return rows;
  }, [campaignsList, allExecutions]);

  const generalMatrixData = useMemo(() => {
    return campaignsList.map(camp => {
      const campRows = matrixData.filter(r => r.campaign === camp.name);
      const enrolledCount = camp.stores?.length || 0;

      const calcWeek = (weekKey: 'w1'|'w2'|'w3'|'w4') => {
        if (enrolledCount === 0) return { sub: 0, app: 0, rej: 0 };
        const submitted = campRows.filter(r => r[weekKey].status !== 'Missed').length;
        const approved = campRows.filter(r => r[weekKey].status === 'Approved').length;
        const rejected = campRows.filter(r => r[weekKey].status === 'Rejected').length;
        return {
          sub: Math.round((submitted / enrolledCount) * 100),
          app: Math.round((approved / enrolledCount) * 100),
          rej: Math.round((rejected / enrolledCount) * 100),
        };
      };

      return {
        id: camp.id, campaign: camp.name, enrolled: enrolledCount,
        w1: calcWeek('w1'), w2: calcWeek('w2'), w3: calcWeek('w3'), w4: calcWeek('w4'),
        totalLiability: campRows.reduce((sum, r) => sum + r.totalPayout, 0)
      };
    });
  }, [campaignsList, matrixData]);

  const filteredDashboardData = useMemo(() => {
    if (dashboardTab === 'general') return matrixData;
    return matrixData.filter(row => row.campaign === dashboardTab);
  }, [matrixData, dashboardTab]);

  const dashboardTotalPayout = useMemo(() => {
    return filteredDashboardData.reduce((sum, row) => sum + row.totalPayout, 0);
  }, [filteredDashboardData]);

  const slackPendingExecutions = pendingExecutions.filter(e => e.raw_text !== 'PAZO Import');
  const pazoPendingExecutions = pendingExecutions.filter(e => e.raw_text === 'PAZO Import');

  const paginatedQueue = slackPendingExecutions.slice((queuePage - 1) * ITEMS_PER_PAGE, queuePage * ITEMS_PER_PAGE);
  const paginatedPazoQueue = pazoPendingExecutions.slice((pazoPage - 1) * ITEMS_PER_PAGE, pazoPage * ITEMS_PER_PAGE);
  const paginatedOrphans = orphanExecutions.slice((orphansPage - 1) * ITEMS_PER_PAGE, orphansPage * ITEMS_PER_PAGE);
  
  const paginatedMissing = missingExecutions.slice((missingPage - 1) * ITEMS_PER_PAGE, missingPage * ITEMS_PER_PAGE);
  const paginatedHistory = filteredReviewData.slice((historyPage - 1) * ITEMS_PER_PAGE, historyPage * ITEMS_PER_PAGE);
  const paginatedStores = storesList.slice((storesPage - 1) * ITEMS_PER_PAGE, storesPage * ITEMS_PER_PAGE);
  const paginatedCampaigns = campaignsList.slice((campaignsPage - 1) * ITEMS_PER_PAGE, campaignsPage * ITEMS_PER_PAGE);
  const paginatedGeneralMatrix = generalMatrixData.slice((matrixPage - 1) * ITEMS_PER_PAGE, matrixPage * ITEMS_PER_PAGE);
  const paginatedMatrix = filteredDashboardData.slice((matrixPage - 1) * ITEMS_PER_PAGE, matrixPage * ITEMS_PER_PAGE);

  const exportMatrixToCSV = () => {
    let csvContent = '"Campaign Name","Store Name","Week 1","Week 2","Week 3","Week 4","Total Payout"\n';
    filteredDashboardData.forEach(row => {
        csvContent += `"${row.campaign}","${row.store}","${row.w1.status}","${row.w2.status}","${row.w3.status}","${row.w4.status}","${row.totalPayout}"\n`;
    });
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const fileNameSuffix = dashboardTab === 'general' ? 'All_Campaigns' : dashboardTab.replace(/[^a-zA-Z0-9]/g, '_');
    link.setAttribute("download", `SuperK_VM_Analytics_${fileNameSuffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderWeekCell = (week: {sub: number, app: number, rej: number}) => (
    <div className="flex flex-col gap-0.5 text-[10px] w-24 mx-auto bg-slate-50 p-1.5 rounded-md border border-slate-100">
      <div className="flex justify-between items-center"><span className="text-slate-400 font-bold">SUB</span><span className="font-black text-blue-600">{week.sub}%</span></div>
      <div className="flex justify-between items-center"><span className="text-slate-400 font-bold">APP</span><span className="font-black text-green-600">{week.app}%</span></div>
      <div className="flex justify-between items-center"><span className="text-slate-400 font-bold">REJ</span><span className="font-black text-red-600">{week.rej}%</span></div>
    </div>
  );

  const handleModalApprove = async () => {
    if (!selectedPhoto) return;
    const { error } = await supabase.from('executions').update({ status: 'approved', rejection_reason: null }).eq('id', selectedPhoto.id);
    if (!error) {
      setSelectedPhoto({ ...selectedPhoto, status: 'Approved', rejection_reason: undefined });
      fetchData();
    } else alert(error.message);
  };

  const handleModalReject = async () => {
    if (!selectedPhoto || !modalRejectReason) return alert("Please select a reason");
    const finalReason = modalRejectReason === 'Other (Type custom reason)' ? modalCustomRejectReason : modalRejectReason;
    const { error } = await supabase.from('executions').update({ status: 'rejected', rejection_reason: finalReason }).eq('id', selectedPhoto.id);
    if (!error) {
      setSelectedPhoto({ ...selectedPhoto, status: 'Rejected', rejection_reason: finalReason });
      setModalActionState('idle');
      fetchData();
    } else alert(error.message);
  };

  const handleModalDelete = async () => {
    if (!selectedPhoto) return;
    if (confirm("Are you sure you want to permanently delete this photo?")) {
      await supabase.from('executions').delete().eq('id', selectedPhoto.id);
      setSelectedPhoto(null);
      fetchData();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900 font-sans relative">
      
      {/* SIDEBAR NAVIGATION */}
      <div className="w-full md:w-64 bg-slate-900 text-white flex flex-col z-10 shadow-xl">
        <div className="p-6">
          <h1 className="text-xl font-black tracking-tight text-white">SuperK <span className="text-blue-400">VM</span></h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold">Command Center</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button onClick={() => setMainView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${mainView === 'dashboard' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>📊 Analytics Matrix</button>
          
          {isAuthenticated ? (
            <>
              <button onClick={() => setMainView('queue')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${mainView === 'queue' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <div className="flex items-center gap-3"><span>📋 Admin Queue</span></div>
                {slackPendingExecutions.length > 0 && <span className="bg-amber-500 text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded-full">{slackPendingExecutions.length}</span>}
              </button>

              <button onClick={() => setMainView('pazo')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${mainView === 'pazo' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <div className="flex items-center gap-3"><span>📤 PAZO Import</span></div>
                {pazoPendingExecutions.length > 0 && <span className="bg-indigo-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{pazoPendingExecutions.length}</span>}
              </button>

              {/* NEW ORPHANS TAB */}
              <button onClick={() => setMainView('orphans')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${mainView === 'orphans' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <div className="flex items-center gap-3"><span>🚑 Orphan Recovery</span></div>
                {orphanExecutions.length > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">{orphanExecutions.length}</span>}
              </button>

              <button onClick={() => setMainView('missing')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${mainView === 'missing' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <div className="flex items-center gap-3"><span>⚠️ Missing Photos</span></div>
                {missingExecutions.length > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{missingExecutions.length}</span>}
              </button>
              <button onClick={() => setMainView('review')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${mainView === 'review' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>🗂️ Execution History</button>
              <button onClick={() => setMainView('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${mainView === 'settings' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>⚙️ Master Settings</button>
            </>
          ) : (
            <button onClick={() => setMainView('login')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all mt-8 border border-slate-700 ${mainView === 'login' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>🔒 Admin Login</button>
          )}
        </nav>

        {isAuthenticated && <div className="p-4 border-t border-slate-800"><button onClick={handleLogout} className="w-full text-xs text-slate-400 hover:text-white transition-colors text-left px-4 py-2">← Logout</button></div>}
      </div>

      <div className="flex-1 p-8 overflow-y-auto z-0">
        
        {mainView === 'login' && (
          <div className="max-w-md mx-auto mt-20 bg-white p-8 rounded-2xl shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-300">
             <div className="text-center mb-8"><div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">🔒</div><h2 className="text-2xl font-bold text-slate-900">Admin Access</h2></div>
             <form onSubmit={handleLogin} className="space-y-4">
              <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Enter Password" className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" />
              {loginError && <p className="text-red-500 text-sm font-semibold">{loginError}</p>}
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-colors">Unlock Command Center</button>
            </form>
          </div>
        )}

        {/* DASHBOARD TAB */}
        {mainView === 'dashboard' && (
          <div className="max-w-6xl mx-auto animate-in fade-in duration-500 flex flex-col h-full">
            
            <div className="flex justify-between items-end mb-6">
              <div><h2 className="text-3xl font-bold text-slate-900">Execution Overview</h2><p className="text-slate-500 mt-1">Track visual merchandising compliance across the network.</p></div>
              <div className="flex gap-4 items-center">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Payout Liability</p>
                  <p className="text-xl font-black text-green-600">₹{dashboardTotalPayout.toLocaleString()}</p>
                </div>
                <button onClick={exportMatrixToCSV} className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2 h-fit">⬇️ Export CSV</button>
              </div>
            </div>

            <div className="flex overflow-x-auto space-x-2 bg-slate-200/50 p-1 rounded-xl mb-6 w-full max-w-full border border-slate-200">
              <button onClick={() => setDashboardTab('general')} className={`whitespace-nowrap px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${dashboardTab === 'general' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Executive Summary</button>
              {campaignsList.map(camp => (
                <button key={camp.id} onClick={() => setDashboardTab(camp.name)} className={`whitespace-nowrap px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${dashboardTab === camp.name ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {camp.name}
                </button>
              ))}
            </div>
            
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              {dashboardTab === 'general' ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 uppercase tracking-widest">
                      <th className="p-4 font-semibold">Active Campaign</th>
                      <th className="p-4 font-semibold text-center">Stores</th>
                      <th className="p-4 font-semibold text-center w-28">W1 (1-7)</th>
                      <th className="p-4 font-semibold text-center w-28">W2 (8-14)</th>
                      <th className="p-4 font-semibold text-center w-28">W3 (15-21)</th>
                      <th className="p-4 font-semibold text-center w-28">W4 (22+)</th>
                      <th className="p-4 font-semibold text-right">Total Liability</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {generalMatrixData.length === 0 ? (
                      <tr><td colSpan={7} className="p-12 text-center text-slate-500">No campaigns configured yet.</td></tr>
                    ) : (
                      paginatedGeneralMatrix.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-bold text-slate-800">{row.campaign}</td>
                          <td className="p-4 text-center font-bold text-slate-500">{row.enrolled}</td>
                          <td className="p-4">{renderWeekCell(row.w1)}</td>
                          <td className="p-4">{renderWeekCell(row.w2)}</td>
                          <td className="p-4">{renderWeekCell(row.w3)}</td>
                          <td className="p-4">{renderWeekCell(row.w4)}</td>
                          <td className="p-4 text-right font-black text-green-600">₹{row.totalLiability.toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 uppercase tracking-widest">
                      <th className="p-4 font-semibold">Store</th>
                      <th className="p-4 font-semibold text-center w-24">W1 (1-7)</th>
                      <th className="p-4 font-semibold text-center w-24">W2 (8-14)</th>
                      <th className="p-4 font-semibold text-center w-24">W3 (15-21)</th>
                      <th className="p-4 font-semibold text-center w-24">W4 (22+)</th>
                      <th className="p-4 font-semibold text-right">Payout</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredDashboardData.length === 0 ? (
                      <tr><td colSpan={6} className="p-12 text-center text-slate-500">No stores enrolled in this campaign.</td></tr>
                    ) : (
                      paginatedMatrix.map((row, i) => {
                        const getStatusColor = (status: string) => {
                          if (status === 'Approved') return 'bg-green-100 text-green-700 font-bold hover:bg-green-200 cursor-pointer';
                          if (status === 'Rejected') return 'bg-red-100 text-red-700 font-bold hover:bg-red-200 cursor-pointer';
                          if (status === 'Missed') return 'bg-slate-100 text-slate-500 font-semibold italic';
                          return 'bg-amber-100 text-amber-700 font-bold hover:bg-amber-200 cursor-pointer';
                        };

                        const handlePillClick = (weekData: any) => {
                          if (weekData.execution) {
                            setSelectedPhoto({
                              id: weekData.execution.id,
                              store: weekData.execution.store_name || weekData.execution.extracted_store,
                              status: weekData.status,
                              image: weekData.execution.image_url,
                              date: new Date(weekData.execution.submission_date).toLocaleString(),
                              raw_text: weekData.execution.raw_text,
                              rejection_reason: weekData.execution.rejection_reason
                            });
                            setModalActionState('idle'); 
                          }
                        };

                        return (
                          <tr key={i} className="hover:bg-slate-50 transition-colors">
                            <td className="p-4 font-medium text-slate-600">{row.store}</td>
                            <td className="p-4 text-center"><span onClick={() => handlePillClick(row.w1)} className={`px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wide inline-block w-20 transition-colors ${getStatusColor(row.w1.status)}`}>{row.w1.status}</span></td>
                            <td className="p-4 text-center"><span onClick={() => handlePillClick(row.w2)} className={`px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wide inline-block w-20 transition-colors ${getStatusColor(row.w2.status)}`}>{row.w2.status}</span></td>
                            <td className="p-4 text-center"><span onClick={() => handlePillClick(row.w3)} className={`px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wide inline-block w-20 transition-colors ${getStatusColor(row.w3.status)}`}>{row.w3.status}</span></td>
                            <td className="p-4 text-center"><span onClick={() => handlePillClick(row.w4)} className={`px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wide inline-block w-20 transition-colors ${getStatusColor(row.w4.status)}`}>{row.w4.status}</span></td>
                            <td className="p-4 text-right font-black text-green-600">₹{row.totalPayout}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}
              {dashboardTab === 'general' && generalMatrixData.length > 0 && <div className="p-4 border-t border-slate-100"><Pagination total={generalMatrixData.length} page={matrixPage} setPage={setMatrixPage} /></div>}
              {dashboardTab !== 'general' && filteredDashboardData.length > 0 && <div className="p-4 border-t border-slate-100"><Pagination total={filteredDashboardData.length} page={matrixPage} setPage={setMatrixPage} /></div>}
            </div>
          </div>
        )}

        {/* ORPHAN RECOVERY TAB */}
        {mainView === 'orphans' && (
          <div className="max-w-5xl mx-auto animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
              <div>
                <h2 className="text-3xl font-bold text-amber-600 mb-1">Orphan Recovery</h2>
                <p className="text-slate-500">Fix executions with invalid store names to reattach them to the matrix.</p>
              </div>
            </div>

            {/* --- NEW: GHOST RECOVERY BANNER --- */}
            {/* --- UPGRADED: GHOST RECOVERY BANNER & LIST --- */}
            {ghostExecutions.length > 0 && (
              <div className="mb-10 animate-in fade-in slide-in-from-top-4">
                {/* The Banner */}
                <div className="bg-blue-50 border border-blue-200 rounded-t-xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2"><span>👻</span> Ghost Executions Detected</h3>
                    <p className="text-sm text-blue-700 mt-1">
                    We found <strong>{ghostExecutions.length}</strong> reviewed photos tagged to brands, but the stores aren&apos;t enrolled in those campaigns.
                    </p>
                  </div>
                  <button onClick={handleAutoEnrollGhosts} disabled={isLoading} className="whitespace-nowrap bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-md">
                    {isLoading ? 'Fixing...' : 'Auto-Enroll All into Matrix'}
                  </button>
                </div>
                
                {/* The Detail Table */}
                <div className="bg-white border-x border-b border-blue-200 rounded-b-xl overflow-hidden shadow-sm max-h-96 overflow-y-auto">
                   <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-blue-50/90 backdrop-blur-sm shadow-sm z-10">
                        <tr className="border-b border-blue-100 text-[10px] text-blue-800 uppercase tracking-widest">
                          <th className="p-3 font-semibold">Store Name</th>
                          <th className="p-3 font-semibold">Missing Campaign Roster</th>
                          <th className="p-3 font-semibold">Current Status</th>
                          <th className="p-3 font-semibold text-right">Photo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-blue-50 text-sm">
                        {ghostExecutions.map((ghost, i) => (
                          <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                            <td className="p-3 font-bold text-slate-800">{ghost.storeName}</td>
                            <td className="p-3 text-blue-600 font-bold">{ghost.campaignName}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${ghost.execution.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {ghost.execution.status}
                              </span>
                            </td>
                            <td className="p-3 text-right flex justify-end gap-2">
                              <button onClick={() => {
                                setSelectedPhoto({ 
                                  id: ghost.execution.id, 
                                  store: ghost.storeName, 
                                  status: ghost.execution.status === 'approved' ? 'Approved' : 'Rejected', 
                                  image: ghost.execution.image_url, 
                                  date: new Date(ghost.execution.submission_date).toLocaleString(), 
                                  raw_text: ghost.execution.raw_text, 
                                  rejection_reason: ghost.execution.rejection_reason 
                                });
                                setModalActionState('idle');
                              }} className="text-xs font-bold text-blue-600 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-md bg-blue-50 transition-colors shadow-sm">
                                View Photo
                              </button>
                              <button 
                                onClick={() => handleEnrollSingleGhost(ghost.campaignId, ghost.storeName, ghost.campaignName)} 
                                disabled={isLoading}
                                className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-md shadow-sm transition-colors disabled:opacity-50"
                              >
                                Enroll Single
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                   </table>
                </div>
              </div>
            )}

            {orphanExecutions.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm flex flex-col items-center">
                <span className="text-4xl mb-4">🩺</span><h3 className="text-lg font-bold text-slate-900">Database is perfectly healthy!</h3>
                <p className="text-slate-500 mt-2 text-sm">There are no orphaned executions.</p>
              </div>
            ) : (
              <div>
                <div className="bg-amber-100 text-amber-900 text-xs font-bold px-4 py-2 rounded-lg mb-4 w-fit border border-amber-200">
                  {orphanExecutions.length} Missing Records Found
                </div>
                <div className="space-y-6">
                  {paginatedOrphans.map((exec) => (
                    <OrphanCard 
                      key={exec.id} 
                      execution={exec} 
                      storesList={storesList} 
                      campaignsList={campaignsList} 
                      reasonsList={reasonsList}
                      onResolve={handleOrphanResolve}
                      onDelete={handleOrphanDelete}
                    />
                  ))}
                </div>
                <Pagination total={orphanExecutions.length} page={orphansPage} setPage={setOrphansPage} />
              </div>
            )}
          </div>
        )}

        {/* SLACK ADMIN QUEUE */}
        {mainView === 'queue' && (
          <div className="max-w-5xl mx-auto animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
              <div><h2 className="text-3xl font-bold text-slate-900 mb-1">Slack Admin Queue</h2><p className="text-slate-500">Review and map store executions pulled directly from Slack</p></div>
              <div className="flex items-end gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Start Date *</label><input type="date" value={syncStartDate} onChange={(e) => setSyncStartDate(e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">End Date</label><input type="date" value={syncEndDate} onChange={(e) => setSyncEndDate(e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500" /></div>
                <button onClick={handleSyncSlack} disabled={isLoading} className="flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-blue-100 shadow-sm disabled:opacity-50 h-[34px]"><span className={`${isLoading && 'animate-spin'}`}>↻</span> Pull</button>
              </div>
            </div>
            {isLoading && slackPendingExecutions.length === 0 ? (
               <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
            ) : slackPendingExecutions.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm flex flex-col items-center">
                <span className="text-4xl mb-4">🎉</span><h3 className="text-lg font-bold text-slate-900">Inbox Zero!</h3>
                <p className="text-slate-500 mt-2 text-sm">There are no pending Slack executions to review.</p>
              </div>
            ) : (
              <div>
                <div className="space-y-6">
                  {paginatedQueue.map((exec) => <ExecutionCard key={exec.id} execution={exec} onUpdate={fetchData} rejectionReasons={reasonsList} />)}
                </div>
                <Pagination total={slackPendingExecutions.length} page={queuePage} setPage={setQueuePage} />
              </div>
            )}
          </div>
        )}

        {/* PAZO IMPORT QUEUE */}
        {mainView === 'pazo' && (
          <div className="max-w-5xl mx-auto animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
              <div>
                <h2 className="text-3xl font-bold text-indigo-900 mb-1">PAZO Bulk Import</h2>
                <p className="text-slate-500">Upload a PAZO CSV to queue executions for review without using Slack.</p>
              </div>
              <div className="flex items-center gap-3 bg-indigo-50 p-3 rounded-xl border border-indigo-100 shadow-sm">
                <input type="file" accept=".csv" ref={pazoFileInputRef} onChange={handlePazoUpload} className="hidden" />
                <button onClick={() => pazoFileInputRef.current?.click()} disabled={isLoading} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-sm disabled:opacity-50 transition-colors">
                  <span className={`${isLoading && 'animate-spin'}`}>📤</span> {isLoading ? 'Importing...' : 'Upload PAZO CSV'}
                </button>
              </div>
            </div>

            {pazoPendingExecutions.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm flex flex-col items-center">
                <span className="text-4xl mb-4">📁</span><h3 className="text-lg font-bold text-slate-900">No PAZO uploads pending.</h3>
                <p className="text-slate-500 mt-2 text-sm">Upload a CSV to start reviewing PAZO executions.</p>
              </div>
            ) : (
              <div>
                <div className="bg-indigo-100 text-indigo-800 text-xs font-bold px-4 py-2 rounded-lg mb-4 w-fit border border-indigo-200">
                  {pazoPendingExecutions.length} PAZO Images waiting for review
                </div>
                <div className="space-y-6">
                  {paginatedPazoQueue.map((exec) => <ExecutionCard key={exec.id} execution={exec} onUpdate={fetchData} rejectionReasons={reasonsList} />)}
                </div>
                <Pagination total={pazoPendingExecutions.length} page={pazoPage} setPage={setPazoPage} />
              </div>
            )}
          </div>
        )}

        {/* MISSING PHOTOS */}
        {mainView === 'missing' && (
          <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
            <div className="flex justify-between items-end mb-8">
              <div><h2 className="text-3xl font-bold text-slate-900 mb-1">Missing Photos</h2><p className="text-slate-500">Stores enrolled in campaigns that have not submitted a photo.</p></div>
            </div>
            <div className="mb-6 bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Filter by Campaign</label>
                <select value={missingCampaignFilter} onChange={(e) => setMissingCampaignFilter(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                  <option value="all">All Active Campaigns</option>
                  {campaignsList.map(camp => <option key={camp.id} value={camp.name}>{camp.name}</option>)}
                </select>
              </div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Start Date</label><input type="date" value={missingStartDate} onChange={(e) => setMissingStartDate(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">End Date</label><input type="date" value={missingEndDate} onChange={(e) => setMissingEndDate(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" /></div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-widest">
                    <th className="p-4 font-semibold">Store Name</th>
                    <th className="p-4 font-semibold">Missing Campaign</th>
                    <th className="p-4 font-semibold text-right">Potential Payout Loss</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {missingExecutions.length > 0 ? (
                    paginatedMissing.map((row, i) => (
                      <tr key={i} className="hover:bg-red-50 transition-colors">
                        <td className="p-4 font-bold text-slate-800">{row.store}</td>
                        <td className="p-4 text-slate-600 font-medium"><span className="inline-block w-2 h-2 rounded-full bg-red-400 mr-2 animate-pulse"></span>{row.campaign}</td>
                        <td className="p-4 text-right font-bold text-red-600">- ₹{row.payout}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={3} className="p-12 text-center"><span className="text-4xl block mb-4">🏆</span><h3 className="text-lg font-bold text-slate-900">100% Compliance!</h3></td></tr>
                  )}
                </tbody>
              </table>
              {missingExecutions.length > 0 && <div className="p-4 border-t border-slate-100"><Pagination total={missingExecutions.length} page={missingPage} setPage={setMissingPage} /></div>}
            </div>
          </div>
        )}

        {/* REVIEW HISTORY */}
        {mainView === 'review' && (
          <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
            <div className="flex justify-between items-end mb-8">
              <div><h2 className="text-3xl font-bold text-slate-900">Execution History</h2><p className="text-slate-500 mt-1">Search, filter, and audit past store executions.</p></div>
            </div>

            <div className="flex flex-col gap-4 mb-6 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
                  <input type="text" placeholder="Search caption or store name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="w-full md:w-64">
                  <select value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                    <option value="all">All Stores</option>
                    {storesList.map(store => <option key={store.id} value={store.name}>{store.name}</option>)}
                  </select>
                </div>
                <div className="w-full md:w-64">
                  <select value={campaignFilter} onChange={(e) => setCampaignFilter(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                    <option value="all">All Campaigns</option>
                    {campaignsList.map(camp => <option key={camp.id} value={camp.name}>{camp.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-lg w-fit">
                {['all', 'approved', 'rejected', 'in_review'].map(status => (
                  <button key={status} onClick={() => setReviewFilter(status as any)} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${reviewFilter === status ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-widest">
                    <th className="p-4 font-semibold">Store</th>
                    <th className="p-4 font-semibold">Slack Caption</th>
                    <th className="p-4 font-semibold">Campaign</th>
                    <th className="p-4 font-semibold">Submission Date</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReviewData.length > 0 ? (
                    paginatedHistory.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-medium text-slate-800">{row.store_name || row.extracted_store || 'Unmapped Store'}</td>
                        <td className="p-4 text-slate-500 text-sm italic max-w-[200px] truncate">&quot;{row.raw_text}&quot;</td>
                        <td className="p-4 text-slate-600 text-sm font-medium">{row.campaign_name || '—'}</td>
                        <td className="p-4 text-slate-600 text-sm">{new Date(row.submission_date).toLocaleDateString()}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide ${row.status === 'approved' ? 'bg-green-100 text-green-700' : ''} ${row.status === 'rejected' ? 'bg-red-100 text-red-700' : ''} ${row.status === 'pending_admin' ? 'bg-amber-100 text-amber-700' : ''}`}>
                            {row.status === 'pending_admin' ? 'In Review' : row.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button onClick={() => {
                            setSelectedPhoto({ id: row.id, store: row.store_name || row.extracted_store || 'Unmapped', status: row.status === 'pending_admin' ? 'Pending' : row.status === 'approved' ? 'Approved' : 'Rejected', image: row.image_url, date: new Date(row.submission_date).toLocaleString(), raw_text: row.raw_text, rejection_reason: row.rejection_reason });
                            setModalActionState('idle');
                          }} className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors">View</button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={6} className="p-8 text-center text-slate-500">No executions found matching your filters.</td></tr>
                  )}
                </tbody>
              </table>
              {filteredReviewData.length > 0 && <div className="p-4 border-t border-slate-100"><Pagination total={filteredReviewData.length} page={historyPage} setPage={setHistoryPage} /></div>}
            </div>
          </div>
        )}

        {/* MASTER SETTINGS */}
        {mainView === 'settings' && (
          <div className="max-w-5xl mx-auto animate-in fade-in duration-500">
            <div className="mb-8"><h2 className="text-3xl font-bold text-slate-900">Master Settings</h2><p className="text-slate-500 mt-1">Manage Store Roster, Campaigns, and Rejection Reasons.</p></div>

            <div className="flex space-x-1 bg-slate-200/50 p-1 rounded-xl mb-6 w-fit">
              <button onClick={() => setSettingsTab('stores')} className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${settingsTab === 'stores' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>🏢 Manage Stores</button>
              <button onClick={() => setSettingsTab('campaigns')} className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${settingsTab === 'campaigns' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>📢 Manage Campaigns</button>
              <button onClick={() => setSettingsTab('reasons')} className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${settingsTab === 'reasons' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>❌ Rejection Reasons</button>
            </div>

            {settingsTab === 'stores' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Stores</p>
                    <p className="text-2xl font-black text-slate-800">{totalStoresCount}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Aligned</p>
                    <p className="text-2xl font-black text-green-600">{alignedStoresCount}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Unaligned</p>
                    <p className="text-2xl font-black text-amber-600">{unalignedStoresCount}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Alignment %</p>
                    <p className="text-2xl font-black text-blue-600">{alignedPercentage}%</p>
                  </div>
                </div>

                <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Add Single Store</label>
                    <div className="flex gap-2">
                      <input type="text" value={newStoreName} onChange={(e) => setNewStoreName(e.target.value)} placeholder="e.g. SuperK Anantapur" className="flex-1 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                      <button onClick={handleAddSingleStore} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors">Add</button>
                    </div>
                  </div>
                  <div className="hidden md:block w-px h-12 bg-slate-200 mx-4"></div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Bulk Import (CSV)</label>
                    <input type="file" accept=".csv" ref={fileInputRef} onChange={handleCSVUpload} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="border border-slate-300 bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-100 flex items-center gap-2 transition-colors">
                      <span>📁</span> Upload Store List
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-widest">
                        <th className="p-4 font-semibold w-1/2">Store Name</th>
                        <th className="p-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {storesList.length === 0 && <tr><td colSpan={2} className="p-8 text-center text-slate-500">No stores configured. Add some above!</td></tr>}
                      {paginatedStores.map(store => (
                        <tr key={store.id} className="hover:bg-slate-50">
                          {editingStoreId === store.id ? (
                            <td className="p-3"><input type="text" value={editingStoreName} onChange={(e) => setEditingStoreName(e.target.value)} className="w-full border border-blue-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 shadow-inner" autoFocus /></td>
                          ) : (<td className="p-4 font-medium text-slate-800">{store.name}</td>)}
                          <td className="p-4 text-right flex justify-end gap-2">
                            {editingStoreId === store.id ? (
                              <button onClick={() => saveEditStore(store.id, store.name)} className="px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm">💾 Save</button>
                            ) : (
                              <button onClick={() => startEditStore(store)} className="px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-colors">✏️ Edit</button>
                            )}
                            <button onClick={() => toggleStoreAlignment(store.id, store.aligned)} className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors border ${store.aligned ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'}`}>
                              {store.aligned ? '✓ Aligned' : '✕ Not Aligned'}
                            </button>
                            <button onClick={() => handleDeleteStore(store.id, store.name)} className="px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors">🗑️ Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {storesList.length > 0 && <div className="p-4 border-t border-slate-100"><Pagination total={storesList.length} page={storesPage} setPage={setStoresPage} /></div>}
                </div>
              </div>
            )}

            {settingsTab === 'campaigns' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1 bg-white p-6 border border-slate-200 rounded-xl shadow-sm h-fit">
                  <h3 className="text-lg font-bold text-slate-900 mb-6 border-b border-slate-100 pb-2">Create Campaign</h3>
                  <div className="space-y-4">
                    <div><label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 block">Campaign Name</label><input type="text" value={newCampName} onChange={(e) => setNewCampName(e.target.value)} placeholder="e.g. Veeba Ketchup" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                    <div><label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 block">Weekly Payout (₹)</label><input type="number" value={newCampPayout} onChange={(e) => setNewCampPayout(e.target.value === '' ? '' : Number(e.target.value))} placeholder="500" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 block">Start Date</label><input type="date" value={newCampStart} onChange={(e) => setNewCampStart(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" /></div>
                      <div><label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 block">End Date</label><input type="date" value={newCampEnd} onChange={(e) => setNewCampEnd(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" /></div>
                    </div>
                    {campaignsList.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 block">🔗 Required Co-Campaigns</label>
                        <p className="text-[10px] text-slate-500 mb-2">Payout requires both campaigns to be approved.</p>
                        <div className="max-h-24 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50 space-y-1">
                           {campaignsList.map(camp => (
                             <label key={camp.id} className="flex items-center gap-2 p-1 hover:bg-white rounded cursor-pointer text-sm transition-colors">
                               <input type="checkbox" checked={newCampDependencies.includes(camp.name)} onChange={() => toggleDependency(camp.name)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                               {camp.name}
                             </label>
                           ))}
                        </div>
                      </div>
                    )}
                    <div className="pt-2 border-t border-slate-100 mt-4">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Assign Stores</label>
                        <button type="button" onClick={() => selectAllAlignedStores()} className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-1 rounded hover:bg-blue-100 transition-colors">+ Select All Aligned</button>
                      </div>
                      <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50 space-y-1">
                        {storesList.length === 0 && <p className="text-xs text-slate-400 p-2 text-center">Add stores first!</p>}
                        {storesList.map(store => (
                          <label key={store.id} className="flex items-center gap-2 p-1.5 hover:bg-white rounded cursor-pointer transition-colors">
                            <input type="checkbox" checked={newCampStores.includes(store.name)} onChange={() => toggleStoreInCampaign(store.name)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                            <span className={`text-sm ${!store.aligned && 'text-slate-400 italic'}`}>{store.name} {!store.aligned && '(Unassigned)'}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <button onClick={handleAddCampaign} className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-lg hover:bg-blue-700 transition-colors mt-4">Create Campaign</button>
                  </div>
                </div>
                <div className="md:col-span-2 space-y-4">
                  {campaignsList.length === 0 && <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">No campaigns created yet.</div>}
                  {paginatedCampaigns.map(campaign => (
                    <div key={campaign.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden group">
                      {campaign.end_date && new Date(campaign.end_date) < new Date() ? (
                        <div className="absolute top-0 right-0 bg-slate-200 text-slate-600 text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-widest">Expired</div>
                      ) : (
                        <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-widest shadow-sm">Live Now</div>
                      )}
                      <div className="flex justify-between items-start mb-4 mt-2">
                        <div>
                          <h4 className="text-lg font-bold text-slate-900">{campaign.name}</h4>
                          <p className="text-sm font-semibold text-green-600 mt-1">₹{campaign.payout} / week</p>
                          <p className="text-xs text-slate-500 mt-1 mb-2">
                            {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : 'N/A'} - {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString() : 'Ongoing'}
                          </p>
                          {campaign.dependencies && campaign.dependencies.length > 0 && (
                            <p className="text-xs font-bold text-amber-700 mt-1 bg-amber-100 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-amber-300 shadow-sm">
                              <span>🔗</span> Linked Required: {campaign.dependencies.join(', ')}
                            </p>
                          )}
                        </div>
                        <span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full border border-blue-100">{campaign.stores?.length || 0} Stores</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 max-h-24 overflow-y-auto flex flex-wrap gap-2 mb-4">
                        {campaign.stores?.map((s: string, i: number) => (
                          <span key={i} className="text-xs bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded shadow-sm">{s}</span>
                        ))}
                      </div>
                      <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                        <button onClick={() => startDuplicateCampaign(campaign)} className="px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition-colors flex items-center gap-2">📑 Clone</button>
                        <button onClick={() => setEditingCampaign(campaign)} className="px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-colors flex items-center gap-2">✏️ Edit</button>
                        <button onClick={() => handleDeleteCampaign(campaign.id, campaign.name)} className="px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors flex items-center gap-2">🗑️ Delete</button>
                      </div>
                    </div>
                  ))}
                  {campaignsList.length > 0 && <Pagination total={campaignsList.length} page={campaignsPage} setPage={setCampaignsPage} />}
                </div>
              </div>
            )}

            {/* TAB: REJECTION REASONS */}
            {settingsTab === 'reasons' && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm max-w-3xl">
                 <div className="p-6 border-b border-slate-100 bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Dynamic Rejection Reasons</h3>
                    <p className="text-sm text-slate-500 mb-4">Add or remove standardized reasons that admins can choose from when rejecting photos.</p>
                    <div className="flex gap-2">
                      <input type="text" value={newReason} onChange={(e) => setNewReason(e.target.value)} placeholder="e.g. Blurry photo" className="flex-1 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none" />
                      <button onClick={handleAddReason} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors">Add Reason</button>
                    </div>
                 </div>
                 <table className="w-full text-left border-collapse">
                    <tbody className="divide-y divide-slate-100">
                      {reasonsList.length === 0 && <tr><td className="p-8 text-center text-slate-500">No rejection reasons found.</td></tr>}
                      {reasonsList.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="p-4 font-medium text-slate-800">{r.reason}</td>
                          <td className="p-4 text-right">
                            <button onClick={() => handleDeleteReason(r.id)} className="px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors">🗑️ Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
              </div>
            )}

          </div>
        )}
      </div>

      {/* --- EDIT CAMPAIGN MODAL --- */}
      {editingCampaign && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in">
           <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">✏️ Edit Campaign</h3>
              <button onClick={() => setEditingCampaign(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 transition-colors">✕</button>
            </div>
            <div className="p-6 overflow-y-auto space-y-5">
               <div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Campaign Name</label><input type="text" value={editingCampaign.name} onChange={e => setEditingCampaign({...editingCampaign, name: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" /></div>
               <div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Weekly Payout (₹)</label><input type="number" value={editingCampaign.payout} onChange={e => setEditingCampaign({...editingCampaign, payout: e.target.value === '' ? '' : Number(e.target.value)})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" /></div>
               <div className="grid grid-cols-2 gap-4">
                 <div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Start Date</label><input type="date" value={editingCampaign.start_date || ''} onChange={e => setEditingCampaign({...editingCampaign, start_date: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" /></div>
                 <div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">End Date</label><input type="date" value={editingCampaign.end_date || ''} onChange={e => setEditingCampaign({...editingCampaign, end_date: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" /></div>
               </div>
               <div className="pt-4 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">🔗 Required Co-Campaigns</label>
                  <div className="max-h-24 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50 space-y-1">
                     {campaignsList.filter(c => c.id !== editingCampaign.id).map(camp => (
                       <label key={camp.id} className="flex items-center gap-2 p-1 hover:bg-white rounded cursor-pointer text-sm">
                         <input type="checkbox" checked={(editingCampaign.dependencies || []).includes(camp.name)} onChange={() => toggleDependency(camp.name, true)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                         {camp.name}
                       </label>
                     ))}
                  </div>
               </div>
               <div className="pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Assigned Stores</label>
                    <button type="button" onClick={() => selectAllAlignedStores(true)} className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-1 rounded hover:bg-blue-100">+ Select All Aligned</button>
                  </div>
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50 space-y-1">
                    {storesList.map(store => (
                      <label key={store.id} className="flex items-center gap-2 p-1.5 hover:bg-white rounded cursor-pointer">
                        <input type="checkbox" checked={(editingCampaign.stores || []).includes(store.name)} onChange={() => toggleStoreInCampaign(store.name, true)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                        <span className={`text-sm ${!store.aligned && 'text-slate-400 italic'}`}>{store.name} {!store.aligned && '(Unassigned)'}</span>
                      </label>
                    ))}
                  </div>
               </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
               <button onClick={() => setEditingCampaign(null)} className="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 transition-colors">Cancel</button>
               <button onClick={saveEditCampaign} className="px-5 py-2.5 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* --- PHOTO VIEWER & EDITOR MODAL --- */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl overflow-hidden shadow-2xl max-w-4xl w-full flex flex-col">
            
            <div className="p-4 border-b border-slate-100 flex justify-between items-start bg-slate-50">
              <div>
                <h3 className="font-bold text-lg text-slate-900">{selectedPhoto.store}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm text-slate-500 font-medium">{selectedPhoto.date}</p>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider ${selectedPhoto.status === 'Approved' ? 'bg-green-500' : selectedPhoto.status === 'Rejected' ? 'bg-red-500' : 'bg-amber-400 text-amber-900'}`}>
                    {selectedPhoto.status}
                  </span>
                </div>
                {selectedPhoto.status === 'Rejected' && selectedPhoto.rejection_reason && (
                  <p className="text-sm font-bold text-red-600 mt-1">Reason: <span className="font-medium text-slate-600">{selectedPhoto.rejection_reason}</span></p>
                )}
                <p className="text-sm text-slate-700 italic mt-2">&quot;{selectedPhoto.raw_text}&quot;</p>
              </div>
              <button onClick={() => { setSelectedPhoto(null); setModalActionState('idle'); }} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 transition-colors">✕</button>
            </div>
            
            <div className="bg-slate-100 flex items-center justify-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selectedPhoto.image} alt="Execution Photo" className="max-h-[60vh] object-contain rounded border border-slate-200 shadow-sm" />
            </div>

            {selectedPhoto.id && (
              <div className="p-4 border-t border-slate-100 bg-white">
                {modalActionState === 'idle' ? (
                  <div className="flex justify-between items-center">
                    <button onClick={handleModalDelete} className="px-4 py-2 rounded-lg text-sm font-bold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors flex items-center gap-2">
                      🗑️ Delete Execution
                    </button>
                    <div>
                      {selectedPhoto.status === 'Approved' ? (
                        <button onClick={() => setModalActionState('rejecting')} className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm">
                          Change to Rejected
                        </button>
                      ) : (
                        <button onClick={handleModalApprove} className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-green-600 hover:bg-green-700 transition-colors shadow-sm">
                          Change to Approved
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-100 p-4 rounded-xl animate-in fade-in slide-in-from-right-4">
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-sm font-bold text-red-800">Reason for Rejection *</label>
                      <button onClick={() => setModalActionState('idle')} className="text-xs font-bold text-blue-600 hover:underline">← Cancel</button>
                    </div>
                    <select value={modalRejectReason} onChange={(e) => setModalRejectReason(e.target.value)} className="w-full border border-red-200 rounded-lg px-4 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm mb-3">
                      <option value="" disabled>-- Select a reason --</option>
                      {reasonsList.map((r) => <option key={r.id} value={r.reason}>{r.reason}</option>)}
                      <option value="Other (Type custom reason)">Other (Type custom reason)</option>
                    </select>
                    {modalRejectReason === 'Other (Type custom reason)' && (
                      <input type="text" placeholder="Type specific reason..." value={modalCustomRejectReason} onChange={(e) => setModalCustomRejectReason(e.target.value)} className="w-full border border-red-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm mb-3" autoFocus />
                    )}
                    <button onClick={handleModalReject} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg shadow-sm transition-colors text-sm">
                      Confirm Rejection
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}