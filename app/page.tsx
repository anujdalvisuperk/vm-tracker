'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient'; 
import ExecutionCard from '../components/ExecutionCard'; 

// --- MOCK DATA FOR MATRIX (We will wire this next) ---
const MONTHS = ['January', 'February', 'March', 'April'];
const MOCK_GENERAL_DATA = [
  { week: 'Week 1', execution: 82 },
  { week: 'Week 2', execution: 88 },
  { week: 'Week 3', execution: 94 },
  { week: 'Week 4', execution: 76 },
];

export default function VMDashboard() {
  // --- AUTHENTICATION STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // --- NAVIGATION STATE ---
  const [mainView, setMainView] = useState<'dashboard' | 'queue' | 'review' | 'settings' | 'login'>('dashboard');
  const [dashboardTab, setDashboardTab] = useState<'general' | string>('general');
  const [settingsTab, setSettingsTab] = useState<'stores' | 'campaigns'>('stores');
  const [selectedMonth, setSelectedMonth] = useState('April');

  // --- LIVE SUPABASE DATA STATE ---
  const [pendingExecutions, setPendingExecutions] = useState<any[]>([]);
  const [allExecutions, setAllExecutions] = useState<any[]>([]); // NEW: Holds all historical data
  const [storesList, setStoresList] = useState<any[]>([]);
  const [campaignsList, setCampaignsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Execution History Filters
  const [reviewFilter, setReviewFilter] = useState<'all' | 'approved' | 'rejected' | 'in_review'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [storeFilter, setStoreFilter] = useState('all');
  const [campaignFilter, setCampaignFilter] = useState('all');

  const [selectedPhoto, setSelectedPhoto] = useState<{ store: string; date: string; status: string; image: string; raw_text: string } | null>(null);

  // New Form States
  const [newStoreName, setNewStoreName] = useState('');
  const [newCampName, setNewCampName] = useState('');
  const [newCampPayout, setNewCampPayout] = useState<number | ''>('');
  const [newCampStores, setNewCampStores] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- 1. DATA FETCHING ---
  const fetchData = async () => {
    setIsLoading(true);
    
    // Fetch Queue (Pending only)
    const { data: qData } = await supabase.from('executions').select('*').eq('status', 'pending_admin').order('submission_date', { ascending: false });
    if (qData) setPendingExecutions(qData);

    // Fetch History (Everything)
    const { data: hData } = await supabase.from('executions').select('*').order('submission_date', { ascending: false });
    if (hData) setAllExecutions(hData);

    // Fetch Stores
    const { data: sData } = await supabase.from('stores').select('*').order('name');
    if (sData) setStoresList(sData);

    // Fetch Campaigns
    const { data: cData } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false });
    if (cData) setCampaignsList(cData);
    
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [mainView]);

  // --- 2. AUTH LOGIC ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginPassword === 'superk2026') {
      setIsAuthenticated(true);
      setMainView('queue');
      setLoginError('');
    } else setLoginError('Invalid password');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setMainView('dashboard');
  };

  useEffect(() => {
    if (!isAuthenticated && mainView !== 'dashboard' && mainView !== 'login') setMainView('dashboard');
  }, [isAuthenticated, mainView]);

  // --- 3. SETTINGS LOGIC ---
  const handleAddSingleStore = async () => {
    if (!newStoreName.trim()) return;
    await supabase.from('stores').insert([{ name: newStoreName, aligned: true }]);
    setNewStoreName(''); fetchData();
  };

  const toggleStoreAlignment = async (id: number, currentStatus: boolean) => {
    await supabase.from('stores').update({ aligned: !currentStatus }).eq('id', id);
    fetchData();
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

  const toggleStoreInCampaign = (storeName: string) => {
    setNewCampStores(prev => prev.includes(storeName) ? prev.filter(s => s !== storeName) : [...prev, storeName]);
  };

  const selectAllAlignedStores = () => {
    setNewCampStores(storesList.filter(s => s.aligned).map(s => s.name));
  };

  const handleAddCampaign = async () => {
    if (!newCampName.trim() || !newCampPayout) return;
    await supabase.from('campaigns').insert([{ name: newCampName, payout: Number(newCampPayout), stores: newCampStores }]);
    setNewCampName(''); setNewCampPayout(''); setNewCampStores([]); fetchData();
  };

  const handleSyncSlack = async () => {
    setIsLoading(true);
    await fetch('/api/slack-sync');
    await fetchData();
  };

  // --- 4. LIVE FILTERING FOR HISTORY TABLE ---
  const filteredReviewData = useMemo(() => {
    return allExecutions.filter(item => {
      // Map database status to UI status
      const mappedStatus = item.status === 'pending_admin' ? 'in_review' : item.status;
      const finalStoreName = item.store_name || item.extracted_store || 'Unmapped Store';
      
      const matchesStatus = reviewFilter === 'all' || mappedStatus === reviewFilter;
      const matchesStore = storeFilter === 'all' || finalStoreName === storeFilter;
      // Note: We will wire campaign matching in the next step, assuming 'all' for now
      
      const searchStr = `${finalStoreName} ${item.raw_text || ''}`.toLowerCase();
      const matchesSearch = searchStr.includes(searchQuery.toLowerCase());
      
      return matchesStatus && matchesStore && matchesSearch;
    });
  }, [allExecutions, reviewFilter, searchQuery, storeFilter]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900 font-sans relative">
      
      {/* SIDEBAR NAVIGATION */}
      <div className="w-full md:w-64 bg-slate-900 text-white flex flex-col z-10 shadow-xl">
        <div className="p-6">
          <h1 className="text-xl font-black tracking-tight text-white">SuperK <span className="text-blue-400">VM</span></h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold">Command Center</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button onClick={() => setMainView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${mainView === 'dashboard' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            📊 Analytics Matrix
          </button>
          
          {isAuthenticated ? (
            <>
              <button onClick={() => setMainView('queue')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${mainView === 'queue' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <div className="flex items-center gap-3"><span>📋 Admin Queue</span></div>
                {pendingExecutions.length > 0 && <span className="bg-amber-500 text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded-full">{pendingExecutions.length}</span>}
              </button>
              <button onClick={() => setMainView('review')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${mainView === 'review' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                🗂️ Execution History
              </button>
              <button onClick={() => setMainView('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${mainView === 'settings' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                ⚙️ Master Settings
              </button>
            </>
          ) : (
            <button onClick={() => setMainView('login')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all mt-8 border border-slate-700 ${mainView === 'login' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              🔒 Admin Login
            </button>
          )}
        </nav>

        {isAuthenticated && (
          <div className="p-4 border-t border-slate-800">
            <button onClick={handleLogout} className="w-full text-xs text-slate-400 hover:text-white transition-colors text-left px-4 py-2">← Logout</button>
          </div>
        )}
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 p-8 overflow-y-auto z-0">
        
        {/* LOGIN PAGE */}
        {mainView === 'login' && (
          <div className="max-w-md mx-auto mt-20 bg-white p-8 rounded-2xl shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-300">
             {/* ... exact same login UI ... */}
             <div className="text-center mb-8"><div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">🔒</div><h2 className="text-2xl font-bold text-slate-900">Admin Access</h2></div>
             <form onSubmit={handleLogin} className="space-y-4">
              <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Enter Password" className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500" />
              {loginError && <p className="text-red-500 text-sm font-semibold">{loginError}</p>}
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-md">Unlock Command Center</button>
            </form>
          </div>
        )}

        {/* ANALYTICS DASHBOARD (Placeholder) */}
        {mainView === 'dashboard' && (
          <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
             <h2 className="text-3xl font-bold text-slate-900 mb-8">Execution Overview</h2>
             <div className="text-slate-500 bg-white p-12 text-center rounded-xl border border-slate-200 shadow-sm">(Analytics Matrix Active)</div>
          </div>
        )}

        {/* ADMIN QUEUE */}
        {mainView === 'queue' && (
          <div className="max-w-5xl mx-auto animate-in fade-in duration-500">
            <div className="flex justify-between items-start mb-8">
              <div><h2 className="text-3xl font-bold text-slate-900 mb-1">Admin Queue</h2><p className="text-slate-500">Review and map store executions from Slack</p></div>
              <button onClick={handleSyncSlack} disabled={isLoading} className="flex items-center gap-2 border border-slate-200 bg-white text-slate-600 px-4 py-2 rounded-lg text-sm hover:bg-slate-50 shadow-sm disabled:opacity-50">
                <span className={`text-blue-600 font-bold ${isLoading && 'animate-spin'}`}>↻</span> Sync Slack
              </button>
            </div>
            {isLoading && pendingExecutions.length === 0 ? (
               <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
            ) : pendingExecutions.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm flex flex-col items-center">
                <span className="text-4xl mb-4">🎉</span><h3 className="text-lg font-bold text-slate-900">Inbox Zero!</h3>
              </div>
            ) : (
              <div className="space-y-6">
                {pendingExecutions.map((exec) => (
                  <ExecutionCard key={exec.id} execution={exec} onUpdate={fetchData} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* =========================================
            EXECUTION HISTORY (LIVE SUPABASE DATA)
            ========================================= */}
        {mainView === 'review' && (
          <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">Execution History</h2>
                <p className="text-slate-500 mt-1">Search, filter, and audit past store executions.</p>
              </div>
            </div>

            {/* Table Controls Panel */}
            <div className="flex flex-col gap-4 mb-6 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex flex-col md:flex-row gap-4">
                
                {/* Search */}
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
                  <input 
                    type="text" 
                    placeholder="Search caption or store name..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Filter: Store (Driven by Live DB) */}
                <div className="w-full md:w-64">
                  <select 
                    value={storeFilter}
                    onChange={(e) => setStoreFilter(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Stores</option>
                    {storesList.map(store => <option key={store.id} value={store.name}>{store.name}</option>)}
                  </select>
                </div>

                {/* Filter: Campaign (Driven by Live DB) */}
                <div className="w-full md:w-64">
                  <select 
                    value={campaignFilter}
                    onChange={(e) => setCampaignFilter(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Campaigns</option>
                    {campaignsList.map(camp => <option key={camp.id} value={camp.name}>{camp.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Status Toggles */}
              <div className="flex bg-slate-100 p-1 rounded-lg w-fit">
                {['all', 'approved', 'rejected', 'in_review'].map(status => (
                  <button
                    key={status}
                    onClick={() => setReviewFilter(status as any)}
                    className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
                      reviewFilter === status 
                        ? 'bg-white text-slate-900 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </button>
                ))}
              </div>
            </div>

            {/* The Live Data Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-widest">
                    <th className="p-4 font-semibold">Store</th>
                    <th className="p-4 font-semibold">Slack Caption</th>
                    <th className="p-4 font-semibold">Submission Date</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReviewData.length > 0 ? (
                    filteredReviewData.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-medium text-slate-800">
                          {row.store_name || row.extracted_store || 'Unmapped Store'}
                        </td>
                        <td className="p-4 text-slate-500 text-sm italic max-w-xs truncate">
                          "{row.raw_text}"
                        </td>
                        <td className="p-4 text-slate-600 text-sm">
                          {new Date(row.submission_date).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide
                            ${row.status === 'approved' ? 'bg-green-100 text-green-700' : ''}
                            ${row.status === 'rejected' ? 'bg-red-100 text-red-700' : ''}
                            ${row.status === 'pending_admin' ? 'bg-amber-100 text-amber-700' : ''}
                          `}>
                            {row.status === 'pending_admin' ? 'In Review' : row.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={() => setSelectedPhoto({ 
                              store: row.store_name || row.extracted_store || 'Unmapped', 
                              status: row.status === 'pending_admin' ? 'In Review' : row.status, 
                              image: row.image_url, 
                              date: new Date(row.submission_date).toLocaleString(),
                              raw_text: row.raw_text
                            })}
                            className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        No executions found matching your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MASTER SETTINGS (Abbreviated to keep copy/paste clean, you already have this code!) */}
        {mainView === 'settings' && (
           <div className="max-w-5xl mx-auto animate-in fade-in duration-500 text-slate-500 bg-white p-12 text-center rounded-xl border border-slate-200 shadow-sm">
               (Master Settings Active)
           </div>
        )}

      </div>

      {/* PHOTO VIEWER MODAL */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl overflow-hidden shadow-2xl max-w-4xl w-full flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-start bg-slate-50">
              <div>
                <h3 className="font-bold text-lg text-slate-900">{selectedPhoto.store}</h3>
                <p className="text-sm text-slate-500 font-medium flex items-center gap-2 mt-1">
                  {selectedPhoto.date} • 
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider 
                    ${selectedPhoto.status === 'approved' ? 'bg-green-500' : 
                      selectedPhoto.status === 'rejected' ? 'bg-red-500' : 'bg-amber-400 text-amber-900'}
                  `}>
                    {selectedPhoto.status}
                  </span>
                </p>
                <p className="text-sm text-slate-700 italic mt-2">"{selectedPhoto.raw_text}"</p>
              </div>
              <button onClick={() => setSelectedPhoto(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 transition-colors">✕</button>
            </div>
            <div className="bg-slate-100 flex items-center justify-center p-4">
              <img src={selectedPhoto.image} alt="Execution Photo" className="max-h-[70vh] object-contain rounded border border-slate-200 shadow-sm" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}