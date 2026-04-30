'use client';
import { useState, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabaseClient'; 
import ExecutionCard from '../components/ExecutionCard'; 
import { useVMData } from '../hooks/useVMData'; 
import AnalyticsMatrix from '../views/AnalyticsMatrix';
import MasterSettings from '../views/MasterSettings';
import UserGuide from '../views/UserGuide';
import Leaderboard from '../views/Leaderboard';

const Pagination = ({ total, page, setPage, perPage = 10 }: any) => {
  const maxPages = Math.ceil(total / perPage);
  if (maxPages <= 1) return null;
  return (
    <div className="flex justify-between items-center mt-6 bg-white p-3 rounded-xl border border-slate-100 shadow-sm overflow-x-auto">
      <button disabled={page === 1} onClick={() => setPage(page - 1)} className="px-5 py-2 text-sm font-bold text-slate-600 disabled:opacity-30 hover:bg-slate-100 rounded-lg transition-all whitespace-nowrap">← Previous</button>
      <span className="text-sm font-bold text-slate-400 tracking-widest uppercase mx-4 whitespace-nowrap">Page <span className="text-slate-800">{page}</span> of {maxPages}</span>
      <button disabled={page === maxPages} onClick={() => setPage(page + 1)} className="px-5 py-2 text-sm font-bold text-slate-600 disabled:opacity-30 hover:bg-slate-100 rounded-lg transition-all whitespace-nowrap">Next →</button>
    </div>
  );
};

const parseCSVRow = (str: string) => {
    const result = []; let cur = ''; let inQuotes = false;
    for (let i = 0; i < str.length; i++) {
        if (str[i] === '"') inQuotes = !inQuotes;
        else if (str[i] === ',' && !inQuotes) { result.push(cur.trim()); cur = ''; } 
        else cur += str[i];
    }
    result.push(cur.trim()); return result;
};

// --- ORPHAN CARD ---
const OrphanCard = ({ execution, storesList, campaignsList, onResolve, onDelete }: any) => {
  const [editedStore, setEditedStore] = useState(execution.store_name || '');
  const [selectedCamp, setSelectedCamp] = useState(execution.campaign_name || '');
  
  return (
    <div className="bg-white/80 backdrop-blur-md border border-amber-200 rounded-2xl overflow-visible shadow-lg flex mb-6 transition-all hover:shadow-xl flex-col sm:flex-row">
      <div className="w-full sm:w-[300px] h-48 sm:h-auto bg-slate-100 flex-shrink-0 relative group sm:rounded-l-2xl sm:rounded-tr-none rounded-t-2xl overflow-hidden border-b sm:border-b-0 sm:border-r border-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={execution.image_url} alt="Execution" className="w-full h-full object-cover cursor-zoom-in hover:scale-105 transition-transform duration-500" onClick={() => window.open(execution.image_url, '_blank')} />
        <div className="absolute top-3 left-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-md uppercase tracking-widest">Orphaned</div>
      </div>
      <div className="flex-1 p-6 flex flex-col justify-between">
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-2">
             <div>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Bad Mapping</p>
               <p className="text-xl font-black text-red-500 line-through decoration-2 opacity-80">{execution.store_name}</p>
             </div>
             <p className="text-xs text-slate-400 font-medium bg-slate-50 px-3 py-1 rounded-full w-fit">{new Date(execution.submission_date).toLocaleString()}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
             <div>
               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Correct Store Name</label>
               <input type="text" value={editedStore} onChange={(e) => setEditedStore(e.target.value)} list={`orphan-${execution.id}`} className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all" />
               <datalist id={`orphan-${execution.id}`}>{storesList.map((s: any) => <option key={s.id} value={s.name} />)}</datalist>
             </div>
             <div>
               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Assign Campaign</label>
               <select value={selectedCamp} onChange={(e) => setSelectedCamp(e.target.value)} className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:border-blue-400 focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-white">
                 <option value="" disabled>-- Select --</option>
                 {campaignsList.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
               </select>
             </div>
          </div>
        </div>
        <div className="mt-2 pt-4 flex gap-3">
           <button onClick={() => {
              if (!editedStore.trim() || !selectedCamp) return alert("Valid store & campaign required.");
              onResolve(execution.id, editedStore.trim(), selectedCamp, 'approved', null);
           }} className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all active:scale-95">✓ Fix & Approve</button>
           <button onClick={() => onDelete(execution.id)} className="px-5 bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 font-bold rounded-xl transition-all">🗑️</button>
        </div>
      </div>
    </div>
  );
};

export default function VMDashboard() {
  // 🟢 NEW: Mobile Menu State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Auth & Routing State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [mainView, setMainView] = useState<'dashboard' | 'queue' | 'pazo' | 'orphans' | 'missing' | 'review' | 'settings' | 'login' | 'guide' | 'leaderboard'>('dashboard');
  
  const ITEMS_PER_PAGE = 10;

  // View States
  const [queuePage, setQueuePage] = useState(1);
  const [pazoPage, setPazoPage] = useState(1);
  const [orphansPage, setOrphansPage] = useState(1);
  const [missingPage, setMissingPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);

  // Sync & Filters
  const [syncStartDate, setSyncStartDate] = useState('');
  const [syncEndDate, setSyncEndDate] = useState('');
  const pazoFileInputRef = useRef<HTMLInputElement>(null);
  const [missingStartDate, setMissingStartDate] = useState('');
  const [missingEndDate, setMissingEndDate] = useState('');
  const [missingCampaignFilter, setMissingCampaignFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [storeFilter, setStoreFilter] = useState('all');
  const [campaignFilter, setCampaignFilter] = useState('all');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'approved' | 'rejected' | 'in_review'>('all');

  // Modal State
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [modalActionState, setModalActionState] = useState<'idle' | 'rejecting'>('idle');
  const [modalRejectReason, setModalRejectReason] = useState('');
  const [modalCustomRejectReason, setModalCustomRejectReason] = useState('');

  const closeGlobalViewer = () => {
    setSelectedPhoto(null);
    setModalActionState('idle');
    setModalRejectReason('');
    setModalCustomRejectReason('');
  };

  // 🧠 THE BRAIN (from Hook)
  const {
    pendingExecutions, allExecutions, storesList, campaignsList, reasonsList, personnelList,
    isLoading, setIsLoading, fetchData, orphanExecutions, ghostExecutions,
    matrixData, generalMatrixData,
    matrixYear, setMatrixYear, matrixMonth, setMatrixMonth // 👈 NEW
  } = useVMData();

  // --- DERIVED DATA ---
  const missingExecutions = useMemo(() => {
    const missing: { store: string; campaign: string; payout: number }[] = [];
    const startTimestamp = missingStartDate ? new Date(missingStartDate).getTime() : 0;
    const endTimestamp = missingEndDate ? new Date(`${missingEndDate}T23:59:59`).getTime() : Infinity;

    campaignsList.forEach((camp: any) => {
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

  // --- MUTATION FUNCTIONS ---
  const handleSyncSlack = async () => {
    if (!syncStartDate) return alert("Select Start Date.");
    setIsLoading(true);
    try {
      await fetch('/api/slack-sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ startDate: syncStartDate, endDate: syncEndDate }) });
      await fetchData();
    } catch (error) { console.error(error); }
  };

  const handlePazoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const lines = (event.target?.result as string).split('\n').filter(l => l.trim());
            const headers = parseCSVRow(lines[0]);
            const storeIdx = headers.findIndex(h => h.includes('Store Name'));
            const dateIdx = headers.findIndex(h => h.includes('Submitted Dat')); 
            const timeIdx = headers.findIndex(h => h.includes('Submitted Tim')); 
            const imgIdx = headers.findIndex(h => h.includes('Image 1'));

            if (storeIdx === -1 || imgIdx === -1) throw new Error("CSV missing Store Name or Image 1");

            const newExecutions = [];
            for (let i = 1; i < lines.length; i++) {
                const row = parseCSVRow(lines[i]);
                const urlMatch = row[imgIdx]?.match(/https?:\/\/[^\s",]+/);
                if (!urlMatch) continue;

                let isoDate = new Date().toISOString();
                try {
                    const [dd, mm, yyyy] = row[dateIdx].split('-');
                    const tMatch = row[timeIdx].match(/(\d+):(\d+)\s*(am|pm)/i);
                    if (tMatch && yyyy) {
                        let hrs = parseInt(tMatch[1]);
                        if (tMatch[3].toLowerCase() === 'pm' && hrs < 12) hrs += 12;
                        if (tMatch[3].toLowerCase() === 'am' && hrs === 12) hrs = 0;
                        isoDate = new Date(parseInt(yyyy), parseInt(mm)-1, parseInt(dd), hrs, parseInt(tMatch[2])).toISOString();
                    }
                } catch(e) {}

                const safeStore = row[storeIdx].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                const safeDate = new Date(isoDate).getTime();
                newExecutions.push({
                    slack_message_id: `pazo-${safeStore}-${safeDate}`,
                    raw_text: `PAZO Import`, extracted_store: row[storeIdx], image_url: urlMatch[0],
                    status: 'pending_admin', submission_date: isoDate
                });
            }
            if (newExecutions.length > 0) {
                for (let i=0; i<newExecutions.length; i+=100) await supabase.from('executions').insert(newExecutions.slice(i, i+100));
                alert(`Imported ${newExecutions.length} PAZO executions!`); fetchData();
            }
        } catch (err: any) { alert(err.message); } 
        finally { setIsLoading(false); if(pazoFileInputRef.current) pazoFileInputRef.current.value = ''; }
    };
    reader.readAsText(file);
  };

  const handleOrphanResolve = async (id: string, store: string, camp: string, status: string, reason: string | null) => {
    setIsLoading(true);
    const storeExists = storesList.some((s:any) => s.name === store);
    if (!storeExists) await supabase.from('stores').insert([{ name: store, aligned: true }]);
    await supabase.from('executions').update({ store_name: store, campaign_name: camp, status, rejection_reason: reason }).eq('id', id);
    const campObj = campaignsList.find((c:any) => c.name === camp);
    if (campObj && (!campObj.stores || !campObj.stores.includes(store))) await supabase.from('campaigns').update({ stores: [...(campObj.stores || []), store] }).eq('id', campObj.id);
    await fetchData();
  };

  const handleModalApprove = async () => {
    if (!selectedPhoto || !selectedPhoto.id) {
      alert("🚨 Error: Photo ID is missing! The UI couldn't find the ID for this image.");
      return;
    }
    
    setIsLoading(true);
    const { error } = await supabase
      .from('executions')
      .update({ status: 'approved', rejection_reason: null }) // If this still fails, we may need to change 'Approved' to 'approved'
      .eq('id', selectedPhoto.id);

    if (error) {
      console.error("Supabase Error:", error);
      alert(`Database Error: ${error.message}`); // This will tell us EXACTLY what is wrong!
    } else {
      setSelectedPhoto({ ...selectedPhoto, status: 'Approved', rejection_reason: undefined }); 
      setModalActionState('idle'); 
      fetchData(); 
    }
    setIsLoading(false);
  };

  const handleModalReject = async () => {
    if (!selectedPhoto || !selectedPhoto.id) {
      alert("🚨 Error: Photo ID is missing! The UI couldn't find the ID for this image.");
      return;
    }
    if (!modalRejectReason) return alert("Please select a reason first.");
    
    setIsLoading(true);
    const finalReason = modalRejectReason === 'Other (Type custom reason)' ? modalCustomRejectReason : modalRejectReason;
    
    const { error } = await supabase
      .from('executions')
      .update({ status: 'rejected', rejection_reason: finalReason })
      .eq('id', selectedPhoto.id);

    if (error) {
      console.error("Supabase Error:", error);
      alert(`Database Error: ${error.message}`);
    } else {
      setSelectedPhoto({ ...selectedPhoto, status: 'Rejected', rejection_reason: finalReason }); 
      setModalActionState('idle'); 
      fetchData(); 
    }
    setIsLoading(false);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setMainView('dashboard');
    setIsMobileMenuOpen(false);
  };

  const handleNavigation = (viewId: any) => {
    if (viewId === 'dashboard' || viewId === 'leaderboard') {
      setMainView(viewId);
    } else if (!isAuthenticated) {
      setMainView('login');
    } else {
      setMainView(viewId);
    }
    setIsMobileMenuOpen(false);
  };

  // UI Slicing
  const slackPending = pendingExecutions.filter((e:any) => e.raw_text !== 'PAZO Import');
  const pazoPending = pendingExecutions.filter((e:any) => e.raw_text === 'PAZO Import');
  const paginatedQueue = slackPending.slice((queuePage - 1) * ITEMS_PER_PAGE, queuePage * ITEMS_PER_PAGE);
  const paginatedPazo = pazoPending.slice((pazoPage - 1) * ITEMS_PER_PAGE, pazoPage * ITEMS_PER_PAGE);
  const paginatedOrphans = orphanExecutions.slice((orphansPage - 1) * ITEMS_PER_PAGE, orphansPage * ITEMS_PER_PAGE);
  const paginatedMissing = missingExecutions.slice((missingPage - 1) * ITEMS_PER_PAGE, missingPage * ITEMS_PER_PAGE);
  const paginatedHistory = filteredReviewData.slice((historyPage - 1) * ITEMS_PER_PAGE, historyPage * ITEMS_PER_PAGE);

  // 🟢 NEW: Separate Navigation Arrays
  const publicNav = [
    { id: 'dashboard', icon: '📊', label: 'Analytics Matrix' },
    { id: 'leaderboard', icon: '🏆', label: 'Field Leaderboard' }
  ];

  const protectedNav = [
    { id: 'queue', icon: '⚡️', label: 'Admin Queue', badge: slackPending?.length || 0, color: 'bg-amber-500' },
    { id: 'pazo', icon: '📤', label: 'PAZO Import', badge: pazoPending?.length || 0, color: 'bg-indigo-500' },
    { id: 'orphans', icon: '🚑', label: 'Recovery', badge: (orphanExecutions?.length || 0) + (ghostExecutions?.length || 0), color: 'bg-red-500' },
    { id: 'missing', icon: '⚠️', label: 'Missing Photos', badge: missingExecutions?.length || 0, color: 'bg-red-500' },
    { id: 'review', icon: '🗂️', label: 'Execution History' },
    { id: 'settings', icon: '⚙️', label: 'Master Settings' },
    { id: 'guide', icon: '📖', label: 'System Manual' }
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      
      {/* ========================================== */}
      {/* DESKTOP SIDEBAR */}
      {/* ========================================== */}
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10 hidden md:flex flex-shrink-0">
        <div className="h-20 flex items-center px-6 border-b border-slate-100 flex-shrink-0">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3 shadow-md"><span className="text-white font-black text-sm">SK</span></div>
          <h1 className="text-xl font-black tracking-tight text-slate-800">Command Center</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
          <div>
            <p className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Field Dashboard</p>
            <div className="space-y-1">
              {publicNav.map((item) => (
                <button key={item.id} onClick={() => handleNavigation(item.id)} className={`w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${mainView === item.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                  <span className="mr-3 text-lg">{item.icon}</span>{item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">Admin Tools {!isAuthenticated && '🔒'}</p>
            <div className="space-y-1">
              {protectedNav.map((item) => (
                <button key={item.id} onClick={() => handleNavigation(item.id)} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${mainView === item.id ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'} ${!isAuthenticated && 'opacity-60'}`}>
                  <div className="flex items-center"><span className="mr-3 text-lg">{item.icon}</span>{item.label}</div>
                  {item.badge && item.badge > 0 && isAuthenticated && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black text-white shadow-sm ${item.color}`}>{item.badge}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isAuthenticated && (
          <div className="p-4 border-t border-slate-100 flex-shrink-0">
            <button onClick={handleLogout} className="w-full py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-red-50 hover:text-red-600 transition-all">Sign Out</button>
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* MOBILE HEADER & MENU */}
      {/* ========================================== */}
      <div className="md:hidden fixed top-0 left-0 w-full bg-white border-b border-slate-200 z-50 flex items-center justify-between px-4 h-16">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3 shadow-md"><span className="text-white font-black text-sm">SK</span></div>
          <h1 className="text-lg font-black tracking-tight text-slate-800">Command Center</h1>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-2xl p-2 focus:outline-none">
          {isMobileMenuOpen ? '✕' : '☰'}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 bg-white z-40 overflow-y-auto pb-20 animate-in slide-in-from-top-2">
          <div className="p-4 space-y-8">
            <div>
              <p className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Field Dashboard</p>
              <div className="space-y-1">
                {publicNav.map((item) => (
                  <button key={item.id} onClick={() => handleNavigation(item.id)} className={`w-full flex items-center px-3 py-3 rounded-xl text-base font-bold transition-all ${mainView === item.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600'}`}>
                    <span className="mr-3 text-xl">{item.icon}</span>{item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">Admin Tools {!isAuthenticated && '🔒'}</p>
              <div className="space-y-1">
                {protectedNav.map((item) => (
                  <button key={item.id} onClick={() => handleNavigation(item.id)} className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-base font-bold transition-all ${mainView === item.id ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600'} ${!isAuthenticated && 'opacity-60'}`}>
                    <div className="flex items-center"><span className="mr-3 text-xl">{item.icon}</span>{item.label}</div>
                    {item.badge && item.badge > 0 && isAuthenticated && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black text-white shadow-sm ${item.color}`}>{item.badge}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            
            {isAuthenticated && (
              <div className="pt-4 border-t border-slate-100">
                <button onClick={handleLogout} className="w-full py-3 bg-red-50 text-red-600 rounded-xl text-base font-bold transition-all">Sign Out</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MAIN CONTENT AREA */}
      {/* ========================================== */}
      <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-10 pt-20 md:pt-10 w-full relative">
        
        {/* PUBLIC VIEW: DASHBOARD */}
        {mainView === 'dashboard' && (
          <AnalyticsMatrix 
            campaignsList={campaignsList} 
            generalMatrixData={generalMatrixData} 
            matrixData={matrixData} 
            matrixYear={matrixYear} setMatrixYear={setMatrixYear} // 👈 NEW
            matrixMonth={matrixMonth} setMatrixMonth={setMatrixMonth}
            onPhotoClick={(wData:any) => {
              if (wData && wData.execution) {
                setSelectedPhoto({ id: wData.execution.id, store: wData.execution.store_name, status: wData.execution.status, image: wData.execution.image_url, date: new Date(wData.execution.submission_date).toLocaleString(), raw_text: wData.execution.raw_text, rejection_reason: wData.execution.rejection_reason });
                setModalActionState('idle');
              }
            }} 
          />
        )}

        {/* PUBLIC VIEW: LEADERBOARD */}
        {mainView === 'leaderboard' && (
          <Leaderboard 
             personnelList={personnelList} 
             storesList={storesList} 
             matrixData={matrixData} 
             campaignsList={campaignsList}
             generalMatrixData={generalMatrixData} // 👈 Pass this to get dynamic campaigns
             matrixYear={matrixYear} setMatrixYear={setMatrixYear} // 👈 NEW
             matrixMonth={matrixMonth} setMatrixMonth={setMatrixMonth}
          />
        )}

        {/* LOGIN GATEWAY */}
        {mainView === 'login' && !isAuthenticated && (
          <div className="max-w-md mx-auto mt-24 bg-white p-10 rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-slate-100 animate-in fade-in zoom-in-95">
             <div className="text-center mb-10"><div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 text-3xl shadow-inner">🔒</div><h2 className="text-3xl font-black text-slate-900">Admin Access</h2><p className="text-slate-500 mt-2 font-medium">Authentication required to manage data.</p></div>
             <form onSubmit={(e) => { 
                e.preventDefault(); 
                // Ensure this matches your original password!
                if(loginPassword === 'superk2026') { 
                  setIsAuthenticated(true); 
                  setMainView('queue'); 
                  setLoginPassword('');
                } else {
                  alert("Incorrect Master Password");
                }
              }} className="space-y-6">
              <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Master Password" autoFocus className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none text-lg text-center tracking-widest font-bold" />
              <button type="submit" className="w-full bg-slate-900 hover:bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl transition-all active:scale-95 text-lg">Unlock Workspace</button>
            </form>
          </div>
        )}

        {/* PROTECTED VIEWS */}
        {isAuthenticated && (
          <>
            {mainView === 'settings' && (
              <MasterSettings storesList={storesList} campaignsList={campaignsList} reasonsList={reasonsList} personnelList={personnelList} fetchData={fetchData} />
            )}

            {mainView === 'guide' && (
              <UserGuide />
            )}

            {mainView === 'queue' && (
              <div className="max-w-5xl mx-auto animate-in fade-in">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                  <div><h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Admin Queue</h2><p className="text-slate-500 mt-2 font-medium text-sm md:text-lg">Map store executions directly from Slack</p></div>
                  <div className="flex flex-wrap gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm w-full md:w-auto">
                    <input type="date" value={syncStartDate} onChange={e => setSyncStartDate(e.target.value)} className="flex-1 md:flex-none border-2 border-slate-100 rounded-xl px-3 py-2 text-sm focus:border-blue-400 outline-none" />
                    <input type="date" value={syncEndDate} onChange={e => setSyncEndDate(e.target.value)} className="flex-1 md:flex-none border-2 border-slate-100 rounded-xl px-3 py-2 text-sm focus:border-blue-400 outline-none" />
                    <button onClick={handleSyncSlack} disabled={isLoading} className="w-full md:w-auto bg-slate-900 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-blue-600 transition-all active:scale-95 shadow-md whitespace-nowrap">{isLoading ? 'Syncing...' : '↻ Pull Slack'}</button>
                  </div>
                </div>
                {slackPending.length === 0 ? (
                  <div className="bg-white rounded-3xl p-16 text-center shadow-xl shadow-slate-200/40 border border-slate-100"><span className="text-5xl block mb-4">🎉</span><h3 className="text-2xl font-black text-slate-900">Inbox Zero!</h3><p className="text-slate-500 font-medium mt-2">No pending Slack executions.</p></div>
                ) : (
                  <div className="space-y-6">{paginatedQueue.map((e:any) => <ExecutionCard key={e.id} execution={e} onUpdate={fetchData} rejectionReasons={reasonsList} />)}<Pagination total={slackPending.length} page={queuePage} setPage={setQueuePage} /></div>
                )}
              </div>
            )}

            {mainView === 'pazo' && (
              <div className="max-w-5xl mx-auto animate-in fade-in">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                  <div><h2 className="text-3xl md:text-4xl font-black text-indigo-900 tracking-tight">PAZO Bulk Import</h2><p className="text-slate-500 mt-2 font-medium text-sm md:text-lg">Upload PAZO CSV to queue offline executions.</p></div>
                  <div className="bg-indigo-50 p-2 rounded-2xl border border-indigo-100 shadow-sm w-full md:w-auto">
                    <input type="file" accept=".csv" ref={pazoFileInputRef} onChange={handlePazoUpload} className="hidden" />
                    <button onClick={() => pazoFileInputRef.current?.click()} disabled={isLoading} className="w-full bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-md transition-all active:scale-95">📤 Upload PAZO CSV</button>
                  </div>
                </div>
                {pazoPending.length === 0 ? (
                  <div className="bg-white rounded-3xl p-16 text-center shadow-xl shadow-slate-200/40 border border-slate-100"><span className="text-5xl block mb-4">📁</span><h3 className="text-2xl font-black text-slate-900">No PAZO uploads</h3></div>
                ) : (
                  <div className="space-y-6">{paginatedPazo.map((e:any) => <ExecutionCard key={e.id} execution={e} onUpdate={fetchData} rejectionReasons={reasonsList} />)}<Pagination total={pazoPending.length} page={pazoPage} setPage={setPazoPage} /></div>
                )}
              </div>
            )}

            {mainView === 'orphans' && (
              <div className="max-w-5xl mx-auto animate-in fade-in">
                <div className="mb-10"><h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-2">Data Recovery</h2><p className="text-slate-500 font-medium">Fix stores that don&apos;t match or aren&apos;t enrolled.</p></div>
                {ghostExecutions.length > 0 && (
                  <div className="mb-10 animate-in fade-in slide-in-from-top-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-t-2xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div><h3 className="text-lg font-bold text-blue-900">👻 Ghost Executions Detected</h3><p className="text-sm text-blue-700">{ghostExecutions.length} photos mapped to un-enrolled stores.</p></div>
                      <button onClick={async () => {
                         setIsLoading(true); const updates:Record<number, Set<string>>={}; 
                         ghostExecutions.forEach((g:any) => { if(!updates[g.campaignId]) updates[g.campaignId] = new Set(); updates[g.campaignId].add(g.storeName); });
                         await Promise.all(Object.entries(updates).map(([idStr, sts]) => { const camp = campaignsList.find((c:any) => c.id === parseInt(idStr)); if(camp) return supabase.from('campaigns').update({ stores: Array.from(new Set([...(camp.stores||[]), ...Array.from(sts)])) }).eq('id', camp.id); return Promise.resolve(); }));
                         fetchData();
                      }} className="w-full sm:w-auto bg-blue-600 text-white font-bold py-3 px-6 rounded-xl shadow-md">Auto-Enroll All</button>
                    </div>
                    <div className="bg-white border-x border-b border-blue-200 rounded-b-2xl max-h-96 overflow-y-auto">
                       <table className="w-full text-left min-w-[500px]"><tbody className="divide-y divide-blue-50 text-sm">
                          {ghostExecutions.map((g:any, i:number) => (
                            <tr key={i} className="hover:bg-blue-50/30">
                              <td className="p-4 font-bold text-slate-800">{g.storeName}</td><td className="p-4 text-blue-600 font-bold">{g.campaignName}</td>
                              <td className="p-4 text-right">
                                <button onClick={() => { setSelectedPhoto({ id: g.execution.id, store: g.storeName, status: g.execution.status, image: g.execution.image_url, date: new Date(g.execution.submission_date).toLocaleString(), raw_text: g.execution.raw_text }); setModalActionState('idle'); }} className="text-xs font-bold text-blue-600 mr-4">View Photo</button>
                                <button onClick={async () => { const camp = campaignsList.find((c:any) => c.id === g.campaignId); if(camp) { await supabase.from('campaigns').update({ stores: [...(camp.stores||[]), g.storeName] }).eq('id', g.campaignId); fetchData(); } }} className="text-xs font-bold bg-blue-600 text-white px-3 py-1.5 rounded-lg">Enroll Single</button>
                              </td>
                            </tr>
                          ))}
                       </tbody></table>
                    </div>
                  </div>
                )}
                {orphanExecutions.length === 0 && ghostExecutions.length === 0 ? (
                  <div className="bg-white rounded-3xl p-16 text-center shadow-xl shadow-slate-200/40 border border-slate-100"><div className="text-5xl mb-4">✨</div><h3 className="text-2xl font-black text-slate-900">Database is Pristine</h3></div>
                ) : (
                  <div className="space-y-6">{paginatedOrphans.map((exec:any) => <OrphanCard key={exec.id} execution={exec} storesList={storesList} campaignsList={campaignsList} onResolve={handleOrphanResolve} onDelete={async (id:string)=>{ if(confirm("Delete?")){ await supabase.from('executions').delete().eq('id', id); fetchData(); } }} />)}<Pagination total={orphanExecutions.length} page={orphansPage} setPage={setOrphansPage} /></div>
                )}
              </div>
            )}

            {mainView === 'missing' && (
              <div className="max-w-6xl mx-auto animate-in fade-in">
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-8">Missing Photos</h2>
                <div className="mb-8 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4">
                  <select value={missingCampaignFilter} onChange={e => setMissingCampaignFilter(e.target.value)} className="flex-1 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:border-blue-400 outline-none bg-white"><option value="all">All Campaigns</option>{campaignsList.map((c:any) => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
                  <input type="date" value={missingStartDate} onChange={e => setMissingStartDate(e.target.value)} className="flex-1 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:border-blue-400 outline-none" />
                  <input type="date" value={missingEndDate} onChange={e => setMissingEndDate(e.target.value)} className="flex-1 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:border-blue-400 outline-none" />
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[500px]">
                      <thead className="bg-slate-50"><tr className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-widest"><th className="p-4 sm:p-5 font-bold">Store</th><th className="p-4 sm:p-5 font-bold">Campaign</th><th className="p-4 sm:p-5 font-bold text-right">Potential Loss</th></tr></thead>
                      <tbody className="divide-y divide-slate-50 text-xs sm:text-sm">
                        {missingExecutions.length > 0 ? paginatedMissing.map((r, i) => (
                          <tr key={i} className="hover:bg-red-50/50"><td className="p-4 sm:p-5 font-bold text-slate-800">{r.store}</td><td className="p-4 sm:p-5 font-bold text-slate-500">{r.campaign}</td><td className="p-4 sm:p-5 text-right font-black text-red-500">- ₹{r.payout}</td></tr>
                        )) : <tr><td colSpan={3} className="p-16 text-center text-xl font-bold">100% Compliance!</td></tr>}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-4 bg-slate-50/50"><Pagination total={missingExecutions.length} page={missingPage} setPage={setMissingPage} /></div>
                </div>
              </div>
            )}

            {mainView === 'review' && (
              <div className="max-w-6xl mx-auto animate-in fade-in">
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-8">Execution History</h2>
                <div className="flex flex-col gap-4 mb-8 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex flex-col md:flex-row gap-4">
                    <input type="text" placeholder="Search caption or store..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="flex-1 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:border-blue-400 outline-none" />
                    <select value={storeFilter} onChange={e => setStoreFilter(e.target.value)} className="w-full md:w-64 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:border-blue-400 outline-none bg-white"><option value="all">All Stores</option>{storesList.map((s:any) => <option key={s.id} value={s.name}>{s.name}</option>)}</select>
                    <select value={campaignFilter} onChange={e => setCampaignFilter(e.target.value)} className="w-full md:w-64 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:border-blue-400 outline-none bg-white"><option value="all">All Campaigns</option>{campaignsList.map((c:any) => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
                  </div>
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                      <thead className="bg-slate-50"><tr className="text-[10px] text-slate-400 uppercase tracking-widest"><th className="p-4 sm:p-5 font-bold">Store</th><th className="p-4 sm:p-5 font-bold">Caption</th><th className="p-4 sm:p-5 font-bold">Status</th><th className="p-4 sm:p-5 font-bold text-right">Action</th></tr></thead>
                      <tbody className="divide-y divide-slate-50 text-xs sm:text-sm">
                        {paginatedHistory.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50/50">
                            <td className="p-4 sm:p-5 font-bold text-slate-800">{r.store_name || r.extracted_store}</td><td className="p-4 sm:p-5 italic text-slate-500 max-w-[150px] sm:max-w-[200px] truncate">&quot;{r.raw_text}&quot;</td>
                            <td className="p-4 sm:p-5"><span className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider ${r.status === 'Approved' ? 'bg-green-100 text-green-700' : r.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{r.status}</span></td>
                            <td className="p-4 sm:p-5 text-right"><button onClick={() => { setSelectedPhoto({ id: r.id, store: r.store_name, status: r.status, image: r.image_url, date: new Date(r.submission_date).toLocaleString(), raw_text: r.raw_text, rejection_reason: r.rejection_reason }); setModalActionState('idle'); }} className="text-sm font-bold text-blue-600 hover:underline">View</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-4 bg-slate-50/50"><Pagination total={filteredReviewData.length} page={historyPage} setPage={setHistoryPage} /></div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 🚀 GLOBAL PHOTO VIEWER MODAL (SECURED FOR ADMIN) */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl overflow-hidden shadow-2xl max-w-4xl w-full flex flex-col md:flex-row border border-slate-100 max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/80 md:hidden">
              <div>
                <h3 className="font-black text-xl text-slate-900">{selectedPhoto.store}</h3>
              </div>
              <button onClick={closeGlobalViewer} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-600 font-bold">✕</button>
            </div>
            
            <div className="flex-1 bg-slate-100 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden group min-h-[300px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selectedPhoto.image} alt="Execution" className="max-h-full max-w-full object-contain rounded-xl shadow-sm cursor-zoom-in transition-transform duration-500 hover:scale-105" onClick={() => window.open(selectedPhoto.image, '_blank')} />
            </div>

            <div className="p-6 sm:p-8 bg-white flex flex-col w-full md:w-96 overflow-y-auto">
              <div className="hidden md:flex justify-between items-start mb-4">
                 <h3 className="font-black text-2xl text-slate-900">{selectedPhoto.store}</h3>
                 <button onClick={closeGlobalViewer} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 font-bold">✕</button>
              </div>
              <div className="flex items-center gap-3 mb-6">
                <p className="text-sm text-slate-500 font-bold">{selectedPhoto.date}</p>
                <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${selectedPhoto.status === 'Approved' ? 'bg-green-500 text-white' : selectedPhoto.status === 'Rejected' ? 'bg-red-500 text-white' : 'bg-amber-400 text-amber-900'}`}>{selectedPhoto.status}</span>
              </div>
              {selectedPhoto.rejection_reason && <p className="text-sm font-bold text-red-600 mb-4 bg-red-50 px-3 py-2 rounded-lg">Reason: {selectedPhoto.rejection_reason}</p>}
              {selectedPhoto.raw_text && <p className="text-sm text-slate-600 italic bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">&quot;{selectedPhoto.raw_text}&quot;</p>}

              {/* ACTION BUTTONS (ONLY IF AUTHENTICATED) */}
              {isAuthenticated && selectedPhoto.id && (
                <div className="mt-auto pt-6 border-t border-slate-100">
                  {modalActionState === 'idle' ? (
                    <div className="flex flex-col gap-3">
                      {selectedPhoto.status === 'Approved' ? (
                        <button onClick={() => setModalActionState('rejecting')} className="w-full py-3 rounded-xl text-sm font-black text-white bg-red-600 hover:bg-red-700 transition-all shadow-md active:scale-95">Change to Rejected</button>
                      ) : (
                        <button onClick={handleModalApprove} disabled={isLoading} className="w-full py-3 rounded-xl text-sm font-black text-white bg-green-500 hover:bg-green-600 transition-all shadow-md active:scale-95">{isLoading ? 'Processing...' : 'Change to Approved'}</button>
                      )}
                      <button onClick={async () => { if(confirm("Delete permanently?")){ await supabase.from('executions').delete().eq('id', selectedPhoto.id); closeGlobalViewer(); fetchData(); } }} className="w-full py-3 rounded-xl text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-all mt-4">🗑️ Delete Record</button>
                    </div>
                  ) : (
                    <div className="bg-white border-2 border-red-100 p-4 rounded-2xl shadow-sm">
                      <div className="flex justify-between items-center mb-3"><label className="text-xs font-black text-red-800 uppercase tracking-widest">Rejection Reason</label><button onClick={() => setModalActionState('idle')} className="text-[10px] font-bold text-blue-600 uppercase">Cancel</button></div>
                      <select value={modalRejectReason} onChange={(e) => setModalRejectReason(e.target.value)} className="w-full border-2 border-red-100 rounded-xl px-3 py-2 text-sm focus:border-red-400 outline-none mb-3 bg-white"><option value="" disabled>-- Select a reason --</option>{reasonsList?.map((r:any) => <option key={r.id} value={r.reason}>{r.reason}</option>)}<option value="Other (Type custom reason)">Other (Type custom reason)</option></select>
                      {modalRejectReason === 'Other (Type custom reason)' && <input type="text" placeholder="Type reason..." value={modalCustomRejectReason} onChange={(e) => setModalCustomRejectReason(e.target.value)} className="w-full border-2 border-red-100 rounded-xl px-3 py-2 text-sm focus:border-red-400 outline-none mb-3" autoFocus />}
                      <button onClick={handleModalReject} disabled={isLoading} className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-3 rounded-xl shadow-md transition-all active:scale-95 text-sm">{isLoading ? 'Processing...' : 'Confirm Rejection'}</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}