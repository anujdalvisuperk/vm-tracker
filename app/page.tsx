'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient'; 
import ExecutionCard from '../components/ExecutionCard'; 

export default function VMDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [mainView, setMainView] = useState<'dashboard' | 'queue' | 'missing' | 'review' | 'settings' | 'login'>('dashboard');
  const [settingsTab, setSettingsTab] = useState<'stores' | 'campaigns'>('stores');
  const [selectedMonth, setSelectedMonth] = useState('April');

  const [syncStartDate, setSyncStartDate] = useState('');
  const [syncEndDate, setSyncEndDate] = useState('');
  const [missingStartDate, setMissingStartDate] = useState('');
  const [missingEndDate, setMissingEndDate] = useState('');

  const [pendingExecutions, setPendingExecutions] = useState<any[]>([]);
  const [allExecutions, setAllExecutions] = useState<any[]>([]);
  const [storesList, setStoresList] = useState<any[]>([]);
  const [campaignsList, setCampaignsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [reviewFilter, setReviewFilter] = useState<'all' | 'approved' | 'rejected' | 'in_review'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [storeFilter, setStoreFilter] = useState('all');
  const [campaignFilter, setCampaignFilter] = useState('all');

  const [missingCampaignFilter, setMissingCampaignFilter] = useState('all');

  const [selectedPhoto, setSelectedPhoto] = useState<{ store: string; date: string; status: string; image: string; raw_text: string } | null>(null);

  const [newStoreName, setNewStoreName] = useState('');
  const [newCampName, setNewCampName] = useState('');
  const [newCampPayout, setNewCampPayout] = useState<number | ''>('');
  const [newCampStores, setNewCampStores] = useState<string[]>([]);
  
  // NEW: State for Linked Campaigns
  const [newCampDependencies, setNewCampDependencies] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setIsLoading(true);
    const { data: qData } = await supabase.from('executions').select('*').eq('status', 'pending_admin').order('submission_date', { ascending: false });
    if (qData) setPendingExecutions(qData);

    const { data: hData } = await supabase.from('executions').select('*').order('submission_date', { ascending: false });
    if (hData) setAllExecutions(hData);

    const { data: sData } = await supabase.from('stores').select('*').order('name');
    if (sData) setStoresList(sData);

    const { data: cData } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false });
    if (cData) setCampaignsList(cData);
    
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, [mainView]);

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

  const handleSyncSlack = async () => {
    if (!syncStartDate) return alert("Please select at least a Start Date to sync from Slack.");
    setIsLoading(true);
    try {
      await fetch('/api/slack-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: syncStartDate, endDate: syncEndDate })
      });
      await fetchData();
    } catch (error) {
      console.error("Failed to sync:", error);
    }
  };

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

  const toggleDependency = (campName: string) => {
    setNewCampDependencies(prev => prev.includes(campName) ? prev.filter(c => c !== campName) : [...prev, campName]);
  };

  const selectAllAlignedStores = () => {
    setNewCampStores(storesList.filter(s => s.aligned).map(s => s.name));
  };

  const handleAddCampaign = async () => {
    if (!newCampName.trim() || !newCampPayout) return;
    await supabase.from('campaigns').insert([{ 
      name: newCampName, 
      payout: Number(newCampPayout), 
      stores: newCampStores,
      dependencies: newCampDependencies 
    }]);
    setNewCampName(''); setNewCampPayout(''); setNewCampStores([]); setNewCampDependencies([]); fetchData();
  };

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

  // --- UPGRADED CSV EXPORT (Handles Linked Campaign Logic) ---
  const exportMatrixToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Campaign Name,Store Name,Week 1,Week 2,Week 3,Week 4,Total Payout\n";

    // Helper: Determine execution status for a specific store, campaign, and week
    const getWeekStatusForCamp = (storeName: string, campName: string, weekNum: number) => {
      const storeExecs = allExecutions.filter(e => 
        (e.store_name === storeName || e.extracted_store === storeName) && 
        e.campaign_name === campName
      );

      const execForWeek = storeExecs.find(e => {
        const day = new Date(e.submission_date).getDate();
        if (weekNum === 1 && day >= 1 && day <= 7) return true;
        if (weekNum === 2 && day >= 8 && day <= 14) return true;
        if (weekNum === 3 && day >= 15 && day <= 21) return true;
        if (weekNum === 4 && day >= 22) return true;
        return false;
      });

      if (!execForWeek) return "Missed";
      if (execForWeek.status === 'approved') return "Approved";
      if (execForWeek.status === 'rejected') return "Rejected";
      return "Pending";
    };

    campaignsList.forEach(camp => {
      if (!camp.stores) return;

      camp.stores.forEach((storeName: string) => {
        const w1 = getWeekStatusForCamp(storeName, camp.name, 1);
        const w2 = getWeekStatusForCamp(storeName, camp.name, 2);
        const w3 = getWeekStatusForCamp(storeName, camp.name, 3);
        const w4 = getWeekStatusForCamp(storeName, camp.name, 4);

        // Check dependencies for payout
        let approvedCount = 0;
        const weeks = [w1, w2, w3, w4];
        
        weeks.forEach((status, index) => {
          const weekNum = index + 1;
          if (status === 'Approved') {
            // Assume it's valid, unless a dependency fails
            let depsSatisfied = true;
            
            const deps = camp.dependencies || [];
            deps.forEach((depCampName: string) => {
              // If the required linked campaign wasn't approved this week, dependencies fail
              if (getWeekStatusForCamp(storeName, depCampName, weekNum) !== 'Approved') {
                depsSatisfied = false;
              }
            });

            if (depsSatisfied) {
              approvedCount++;
            }
          }
        });

        const totalPayout = approvedCount * (camp.payout || 0);

        const safeCampName = `"${camp.name}"`;
        const safeStoreName = `"${storeName}"`;

        const row = `${safeCampName},${safeStoreName},${w1},${w2},${w3},${w4},${totalPayout}`;
        csvContent += row + "\n";
      });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SuperK_VM_Analytics_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          <button onClick={() => setMainView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${mainView === 'dashboard' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            📊 Analytics Matrix
          </button>
          
          {isAuthenticated ? (
            <>
              <button onClick={() => setMainView('queue')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${mainView === 'queue' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <div className="flex items-center gap-3"><span>📋 Admin Queue</span></div>
                {pendingExecutions.length > 0 && <span className="bg-amber-500 text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded-full">{pendingExecutions.length}</span>}
              </button>

              <button onClick={() => setMainView('missing')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${mainView === 'missing' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <div className="flex items-center gap-3"><span>⚠️ Missing Photos</span></div>
                {missingExecutions.length > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{missingExecutions.length}</span>}
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
        
        {/* VIEW: LOGIN PAGE */}
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

        {/* VIEW: ANALYTICS DASHBOARD */}
        {mainView === 'dashboard' && (
          <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
             <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">Execution Overview</h2>
                <p className="text-slate-500 mt-1">Track visual merchandising compliance across the network.</p>
              </div>
              <button onClick={exportMatrixToCSV} className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2">
                ⬇️ Download CSV
              </button>
            </div>
            <div className="text-slate-500 bg-white p-12 text-center rounded-xl border border-slate-200 shadow-sm flex flex-col items-center">
                <span className="text-4xl mb-4">📊</span>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Live Analytics Matrix Active</h3>
                <p>Click &quot;Download CSV&quot; above to instantly generate the finance payout report based on historical data.</p>
            </div>
          </div>
        )}

        {/* VIEW: ADMIN QUEUE */}
        {mainView === 'queue' && (
          <div className="max-w-5xl mx-auto animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-1">Admin Queue</h2>
                <p className="text-slate-500">Review and map store executions from Slack</p>
              </div>
              
              <div className="flex items-end gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Start Date *</label>
                  <input type="date" value={syncStartDate} onChange={(e) => setSyncStartDate(e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">End Date</label>
                  <input type="date" value={syncEndDate} onChange={(e) => setSyncEndDate(e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <button onClick={handleSyncSlack} disabled={isLoading} className="flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-blue-100 shadow-sm disabled:opacity-50 h-[34px] transition-colors">
                  <span className={`${isLoading && 'animate-spin'}`}>↻</span> Pull
                </button>
              </div>
            </div>

            {isLoading && pendingExecutions.length === 0 ? (
               <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
            ) : pendingExecutions.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm flex flex-col items-center">
                <span className="text-4xl mb-4">🎉</span><h3 className="text-lg font-bold text-slate-900">Inbox Zero!</h3>
                <p className="text-slate-500 mt-2 text-sm">There are no pending executions to review.</p>
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

        {/* VIEW: MISSING PHOTOS */}
        {mainView === 'missing' && (
          <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-1">Missing Photos</h2>
                <p className="text-slate-500">Stores enrolled in campaigns that have not submitted a photo in the selected timeframe.</p>
              </div>
            </div>

            <div className="mb-6 bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Filter by Campaign</label>
                <select value={missingCampaignFilter} onChange={(e) => setMissingCampaignFilter(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="all">All Active Campaigns</option>
                  {campaignsList.map(camp => <option key={camp.id} value={camp.name}>{camp.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Start Date</label>
                <input type="date" value={missingStartDate} onChange={(e) => setMissingStartDate(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">End Date</label>
                <input type="date" value={missingEndDate} onChange={(e) => setMissingEndDate(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
              </div>
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
                    missingExecutions.map((row, i) => (
                      <tr key={i} className="hover:bg-red-50 transition-colors">
                        <td className="p-4 font-bold text-slate-800">{row.store}</td>
                        <td className="p-4 text-slate-600 font-medium"><span className="inline-block w-2 h-2 rounded-full bg-red-400 mr-2 animate-pulse"></span>{row.campaign}</td>
                        <td className="p-4 text-right font-bold text-red-600">- ₹{row.payout}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="p-12 text-center">
                        <span className="text-4xl block mb-4">🏆</span>
                        <h3 className="text-lg font-bold text-slate-900">100% Compliance!</h3>
                        <p className="text-slate-500 mt-1">Every enrolled store has submitted their photos for the selected timeframe.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW: EXECUTION HISTORY */}
        {mainView === 'review' && (
          <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">Execution History</h2>
                <p className="text-slate-500 mt-1">Search, filter, and audit past store executions.</p>
              </div>
            </div>

            <div className="flex flex-col gap-4 mb-6 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
                  <input type="text" placeholder="Search caption or store name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="w-full md:w-64">
                  <select value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="all">All Stores</option>
                    {storesList.map(store => <option key={store.id} value={store.name}>{store.name}</option>)}
                  </select>
                </div>
                <div className="w-full md:w-64">
                  <select value={campaignFilter} onChange={(e) => setCampaignFilter(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
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
                    filteredReviewData.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-medium text-slate-800">{row.store_name || row.extracted_store || 'Unmapped Store'}</td>
                        <td className="p-4 text-slate-500 text-sm italic max-w-[200px] truncate">&quot;{row.raw_text}&quot;</td>
                        <td className="p-4 text-slate-600 text-sm font-medium">{row.campaign_name || '—'}</td>
                        <td className="p-4 text-slate-600 text-sm">{new Date(row.submission_date).toLocaleDateString()}</td>
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
                          <button onClick={() => setSelectedPhoto({ store: row.store_name || row.extracted_store || 'Unmapped', status: row.status === 'pending_admin' ? 'In Review' : row.status, image: row.image_url, date: new Date(row.submission_date).toLocaleString(), raw_text: row.raw_text })} className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={6} className="p-8 text-center text-slate-500">No executions found matching your filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW: MASTER SETTINGS */}
        {mainView === 'settings' && (
          <div className="max-w-5xl mx-auto animate-in fade-in duration-500">
            <div className="mb-8"><h2 className="text-3xl font-bold text-slate-900">Master Settings</h2><p className="text-slate-500 mt-1">Manage Store Roster and Active Campaigns.</p></div>

            <div className="flex space-x-1 bg-slate-200/50 p-1 rounded-xl mb-6 w-fit">
              <button onClick={() => setSettingsTab('stores')} className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${settingsTab === 'stores' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>🏢 Manage Stores</button>
              <button onClick={() => setSettingsTab('campaigns')} className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${settingsTab === 'campaigns' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>📢 Manage Campaigns</button>
            </div>

            {/* TAB: STORES */}
            {settingsTab === 'stores' && (
              <div className="space-y-6">
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
                        <th className="p-4 font-semibold">Store Name</th>
                        <th className="p-4 font-semibold text-right">Alignment Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {storesList.length === 0 && <tr><td colSpan={2} className="p-8 text-center text-slate-500">No stores configured. Add some above!</td></tr>}
                      {storesList.map(store => (
                        <tr key={store.id} className="hover:bg-slate-50">
                          <td className="p-4 font-medium text-slate-800">{store.name}</td>
                          <td className="p-4 text-right">
                            <button onClick={() => toggleStoreAlignment(store.id, store.aligned)} className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-colors border ${store.aligned ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'}`}>
                              {store.aligned ? '✓ Aligned' : '✕ Not Aligned'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: CAMPAIGNS */}
            {settingsTab === 'campaigns' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1 bg-white p-6 border border-slate-200 rounded-xl shadow-sm h-fit">
                  <h3 className="text-lg font-bold text-slate-900 mb-6 border-b border-slate-100 pb-2">Create Campaign</h3>
                  <div className="space-y-4">
                    <div><label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 block">Campaign Name</label><input type="text" value={newCampName} onChange={(e) => setNewCampName(e.target.value)} placeholder="e.g. Veeba Ketchup" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                    <div><label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 block">Weekly Payout (₹)</label><input type="number" value={newCampPayout} onChange={(e) => setNewCampPayout(Number(e.target.value))} placeholder="500" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                    
                    {/* NEW: Co-Campaign Dependencies */}
                    {campaignsList.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 block">Required Co-Campaigns</label>
                        <p className="text-[10px] text-slate-500 mb-2">If linked, payout requires both campaigns to be approved.</p>
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
                        <button type="button" onClick={selectAllAlignedStores} className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-1 rounded hover:bg-blue-100 transition-colors">+ Select All Aligned</button>
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
                  {campaignsList.map(campaign => (
                    <div key={campaign.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="text-lg font-bold text-slate-900">{campaign.name}</h4>
                          <p className="text-sm font-semibold text-green-600 mt-1">₹{campaign.payout} / week</p>
                          {campaign.dependencies && campaign.dependencies.length > 0 && (
                            <p className="text-xs font-semibold text-amber-600 mt-1 bg-amber-50 inline-block px-2 py-0.5 rounded border border-amber-200">
                              Requires: {campaign.dependencies.join(', ')}
                            </p>
                          )}
                        </div>
                        <span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">{campaign.stores?.length || 0} Stores Enrolled</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 max-h-24 overflow-y-auto flex flex-wrap gap-2">
                        {campaign.stores?.map((s: string, i: number) => (
                          <span key={i} className="text-xs bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded shadow-sm">{s}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                <p className="text-sm text-slate-700 italic mt-2">&quot;{selectedPhoto.raw_text}&quot;</p>
              </div>
              <button onClick={() => setSelectedPhoto(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 transition-colors">✕</button>
            </div>
            <div className="bg-slate-100 flex items-center justify-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selectedPhoto.image} alt="Execution Photo" className="max-h-[70vh] object-contain rounded border border-slate-200 shadow-sm" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}