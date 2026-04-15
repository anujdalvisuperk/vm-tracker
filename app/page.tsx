'use client';
import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient'; // Make sure path matches
import ExecutionCard from '../components/ExecutionCard'; // Make sure path matches

// --- MOCK DATA FOR PROTOTYPING UI (Matrix & History Tabs) ---
const MONTHS = ['January', 'February', 'March', 'April'];
const CAMPAIGNS = ['Lion Dates BOGO', 'Surf Excel Endcap', 'Sprite Summer Display'];
const STORES = ['SuperK Chittoor 1', 'SuperK Chittoor 2', 'Lakshmi Supermarket Kalyanadhurgam', 'Sidhout One Stop Store'];

const MOCK_GENERAL_DATA = [
  { week: 'Week 1', execution: 82 },
  { week: 'Week 2', execution: 88 },
  { week: 'Week 3', execution: 94 },
  { week: 'Week 4', execution: 76 },
];

const MOCK_CAMPAIGN_MATRIX = STORES.map(store => ({
  store,
  w1: { status: Math.random() > 0.2 ? 'approved' : 'rejected', image: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=600&q=80' },
  w2: { status: Math.random() > 0.3 ? 'approved' : 'rejected', image: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&w=600&q=80' },
  w3: { status: Math.random() > 0.5 ? 'in_review' : 'pending_photo', image: Math.random() > 0.5 ? 'https://images.unsplash.com/photo-1588964895597-cfccd6e2a099?auto=format&fit=crop&w=600&q=80' : null },
  w4: { status: 'pending_photo', image: null },
}));

const MOCK_REVIEW_DATA = [
  { id: 1, store: 'Lakshmi Supermarket Kalyanadhurgam', campaign: 'Lion Dates BOGO', date: 'Apr 15, 2026', status: 'approved', image: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a' },
  { id: 2, store: 'Lakshmi Supermarket Kalyanadhurgam', campaign: 'Surf Excel Endcap', date: 'Apr 14, 2026', status: 'rejected', image: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d' },
  { id: 3, store: 'SuperK Chittoor 1', campaign: 'Lion Dates BOGO', date: 'Apr 14, 2026', status: 'approved', image: 'https://images.unsplash.com/photo-1588964895597-cfccd6e2a099' },
  { id: 4, store: 'Sidhout One Stop Store', campaign: 'Sprite Summer Display', date: 'Apr 13, 2026', status: 'in_review', image: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a' },
  { id: 5, store: 'SuperK Chittoor 2', campaign: 'Surf Excel Endcap', date: '-', status: 'pending_photo', image: null },
];

// --- MAIN COMPONENT ---
export default function VMDashboard() {
  const [mainView, setMainView] = useState<'dashboard' | 'queue' | 'review'>('queue'); // Default to queue for now
  const [dashboardTab, setDashboardTab] = useState<'general' | string>('general');
  const [selectedMonth, setSelectedMonth] = useState('April');
  
  // Execution History Filters
  const [reviewFilter, setReviewFilter] = useState<'all' | 'approved' | 'rejected' | 'in_review' | 'pending_photo'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [storeFilter, setStoreFilter] = useState('all');
  const [campaignFilter, setCampaignFilter] = useState('all');

  const [selectedPhoto, setSelectedPhoto] = useState<{ store: string; week?: string; status: string; image: string } | null>(null);

  // --- LIVE SUPABASE DATA STATE ---
  const [pendingExecutions, setPendingExecutions] = useState<any[]>([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch pending records from Supabase
  const fetchPendingExecutions = async () => {
    setIsLoadingQueue(true);
    const { data, error } = await supabase
      .from('executions')
      .select('*')
      .eq('status', 'pending_admin')
      .order('submission_date', { ascending: false });

    if (!error && data) {
      setPendingExecutions(data);
    } else if (error) {
      console.error("Error fetching data:", error);
    }
    setIsLoadingQueue(false);
  };

  // Run the slack sync API route
  const handleSyncSlack = async () => {
    setIsSyncing(true);
    try {
      await fetch('/api/slack-sync');
      await fetchPendingExecutions();
    } catch (error) {
      console.error("Failed to sync:", error);
    }
    setIsSyncing(false);
  };

  // Fetch data when the component loads or when switching to the queue tab
  useEffect(() => {
    if (mainView === 'queue') {
      fetchPendingExecutions();
    }
  }, [mainView]);

  const renderCircle = (storeName: string, weekName: string, data: { status: string, image: string | null }) => {
    let bgColor = 'bg-slate-200 border-2 border-slate-300 border-dashed'; 
    if (data.status === 'approved') bgColor = 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]';
    if (data.status === 'rejected') bgColor = 'bg-red-500';
    if (data.status === 'in_review') bgColor = 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.4)]'; 

    return (
      <button 
        onClick={() => { if (data.image) setSelectedPhoto({ store: storeName, week: weekName, status: data.status, image: data.image }); }}
        disabled={!data.image}
        title={data.status.replace('_', ' ').toUpperCase()}
        className={`mx-auto w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-125 focus:outline-none ${bgColor} ${!data.image && 'cursor-not-allowed opacity-60'}`}
      />
    );
  };

  const filteredReviewData = useMemo(() => {
    return MOCK_REVIEW_DATA.filter(item => {
      const matchesStatus = reviewFilter === 'all' || item.status === reviewFilter;
      const matchesStore = storeFilter === 'all' || item.store === storeFilter;
      const matchesCampaign = campaignFilter === 'all' || item.campaign === campaignFilter;
      const matchesSearch = item.store.toLowerCase().includes(searchQuery.toLowerCase()) || item.campaign.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesStatus && matchesStore && matchesCampaign && matchesSearch;
    });
  }, [reviewFilter, searchQuery, storeFilter, campaignFilter]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900 font-sans relative">
      
      {/* SIDEBAR NAVIGATION */}
      <div className="w-full md:w-64 bg-slate-900 text-white flex flex-col z-10">
        <div className="p-6">
          <h1 className="text-xl font-black tracking-tight text-white">SuperK <span className="text-blue-400">VM</span></h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold">Command Center</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button onClick={() => setMainView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${mainView === 'dashboard' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            📊 Analytics Matrix
          </button>
          <button onClick={() => setMainView('queue')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${mainView === 'queue' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <div className="flex items-center gap-3"><span>📋 Admin Queue</span></div>
            {/* Live count from Supabase! */}
            {pendingExecutions.length > 0 && (
              <span className="bg-amber-500 text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded-full">{pendingExecutions.length}</span>
            )}
          </button>
          <button onClick={() => setMainView('review')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${mainView === 'review' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            🗂️ Execution History
          </button>
        </nav>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 p-8 overflow-y-auto z-0">
        
        {/* VIEW 1: ANALYTICS DASHBOARD (Mocked) */}
        {mainView === 'dashboard' && (
          <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
             {/* ... existing dashboard code ... */}
             <div className="flex justify-between items-end mb-8">
              <div><h2 className="text-3xl font-bold text-slate-900">Execution Overview</h2><p className="text-slate-500 mt-1">Track visual merchandising compliance across the network.</p></div>
            </div>
            {/* Keeping it abbreviated here so you can focus on the Queue. The rest of the dashboard code from earlier remains exactly the same! */}
            <div className="text-slate-500 bg-white p-12 text-center rounded-xl border border-slate-200 shadow-sm">
                (Analytics Matrix Active)
            </div>
          </div>
        )}

        {/* =========================================
            VIEW 2: ADMIN QUEUE (LIVE SUPABASE DATA)
            ========================================= */}
        {mainView === 'queue' && (
          <div className="max-w-5xl mx-auto animate-in fade-in duration-500">
            
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-1">Admin Queue</h2>
                <p className="text-slate-500">Review and map store executions from Slack</p>
              </div>
              
              <button 
                onClick={handleSyncSlack}
                disabled={isSyncing}
                className="flex items-center gap-2 border border-slate-200 bg-white text-slate-600 px-4 py-2 rounded-lg text-sm hover:bg-slate-50 shadow-sm disabled:opacity-50"
              >
                {isSyncing ? (
                  <span className="animate-spin text-blue-600 font-bold">↻</span>
                ) : (
                  <span className="text-blue-600 font-bold">↻</span>
                )}
                {isSyncing ? 'Syncing...' : 'Sync Slack'}
              </button>
            </div>

            {/* Content Area */}
            {isLoadingQueue ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : pendingExecutions.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm flex flex-col items-center">
                <span className="text-4xl mb-4">🎉</span>
                <h3 className="text-lg font-bold text-slate-900">Inbox Zero!</h3>
                <p className="text-slate-500 font-medium mt-1">There are no pending executions to review.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {pendingExecutions.map((exec) => (
                  <ExecutionCard 
                    key={exec.id} 
                    execution={exec} 
                    // Pass the fetch function so the card can tell the parent to refresh when approved/rejected!
                    onUpdate={fetchPendingExecutions} 
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: EXECUTION HISTORY (Mocked) */}
        {mainView === 'review' && (
          <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
            {/* ... existing review history code ... */}
            <div className="flex justify-between items-end mb-8">
              <div><h2 className="text-3xl font-bold text-slate-900">Execution History</h2><p className="text-slate-500 mt-1">Search, filter, and audit past store executions.</p></div>
            </div>
             <div className="text-slate-500 bg-white p-12 text-center rounded-xl border border-slate-200 shadow-sm">
                (Execution History Active)
            </div>
          </div>
        )}

      </div>

      {/* PHOTO VIEWER MODAL */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in">
           {/* ... exact same modal code ... */}
        </div>
      )}

    </div>
  );
}