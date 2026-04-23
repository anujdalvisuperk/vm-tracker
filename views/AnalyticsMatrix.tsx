'use client';
import { useState, useMemo, useEffect } from 'react';

const Pagination = ({ total, page, setPage, perPage = 10 }: any) => {
  const maxPages = Math.ceil(total / perPage);
  if (maxPages <= 1) return null;
  return (
    <div className="flex justify-between items-center mt-6 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
      <button disabled={page === 1} onClick={() => setPage(page - 1)} className="px-5 py-2 text-sm font-bold text-slate-600 disabled:opacity-30 hover:bg-slate-100 rounded-lg transition-all">← Previous</button>
      <span className="text-sm font-bold text-slate-400 tracking-widest uppercase">Page <span className="text-slate-800">{page}</span> of {maxPages}</span>
      <button disabled={page === maxPages} onClick={() => setPage(page + 1)} className="px-5 py-2 text-sm font-bold text-slate-600 disabled:opacity-30 hover:bg-slate-100 rounded-lg transition-all">Next →</button>
    </div>
  );
};

export default function AnalyticsMatrix({ campaignsList, generalMatrixData, matrixData, onPhotoClick }: any) {
  const [dashboardTab, setDashboardTab] = useState('general');
  const [matrixPage, setMatrixPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // --- 💾 CAMPAIGN FILTER STATE (For Executive Summary) ---
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>(['All']);
  const [isCampMenuOpen, setIsCampMenuOpen] = useState(false);

  useEffect(() => {
    const savedCamps = localStorage.getItem('vm_matrix_default_campaigns');
    if (savedCamps) {
      try { setSelectedCampaigns(JSON.parse(savedCamps)); } catch (e) {}
    }
  }, []);

  const toggleCampaign = (campName: string) => {
    let newSelection = [...selectedCampaigns];
    if (campName === 'All') newSelection = ['All'];
    else {
      newSelection = newSelection.filter((c: string) => c !== 'All');
      if (newSelection.includes(campName)) newSelection = newSelection.filter((c: string) => c !== campName);
      else newSelection.push(campName);
      if (newSelection.length === 0) newSelection = ['All'];
    }
    setSelectedCampaigns(newSelection);
    localStorage.setItem('vm_matrix_default_campaigns', JSON.stringify(newSelection));
    setMatrixPage(1); // Reset to page 1 when filtering
  };

  // --- DATA FILTERING LOGIC ---
  const filteredGeneralMatrixData = useMemo(() => {
    return generalMatrixData.filter((row: any) => 
      selectedCampaigns.includes('All') || selectedCampaigns.includes(row.campaign)
    );
  }, [generalMatrixData, selectedCampaigns]);

  const filteredDashboardData = useMemo(() => {
    if (dashboardTab === 'general') return matrixData; 
    return matrixData.filter((row: any) => row.campaign === dashboardTab);
  }, [matrixData, dashboardTab]);

  const dashboardTotalPayout = useMemo(() => {
    if (dashboardTab === 'general') {
      // If we are on the summary page, only sum the liability of the FILTERED campaigns
      return filteredGeneralMatrixData.reduce((sum: number, row: any) => sum + row.totalLiability, 0);
    }
    // If we are on a specific campaign page, sum that campaign's payouts
    return filteredDashboardData.reduce((sum: number, row: any) => sum + row.totalPayout, 0);
  }, [filteredGeneralMatrixData, filteredDashboardData, dashboardTab]);

  // --- PAGINATION SLICING ---
  const paginatedGeneralMatrix = filteredGeneralMatrixData.slice((matrixPage - 1) * ITEMS_PER_PAGE, matrixPage * ITEMS_PER_PAGE);
  const paginatedMatrix = filteredDashboardData.slice((matrixPage - 1) * ITEMS_PER_PAGE, matrixPage * ITEMS_PER_PAGE);

  // --- EXPORT TO CSV ---
  const exportMatrixToCSV = () => {
    let csvContent = '';
    
    if (dashboardTab === 'general') {
      csvContent = '"Campaign Name","Stores Enrolled","W1 Submitted","W1 Approved","W2 Submitted","W2 Approved","W3 Submitted","W3 Approved","W4 Submitted","W4 Approved","Total Liability"\n';
      filteredGeneralMatrixData.forEach((row: any) => {
        csvContent += `"${row.campaign}","${row.enrolled}","${row.w1.sub}%","${row.w1.app}%","${row.w2.sub}%","${row.w2.app}%","${row.w3.sub}%","${row.w3.app}%","${row.w4.sub}%","${row.w4.app}%","${row.totalLiability}"\n`;
      });
    } else {
      csvContent = '"Campaign Name","Store Name","Week 1","Week 2","Week 3","Week 4","Total Payout"\n';
      filteredDashboardData.forEach((row: any) => {
        csvContent += `"${row.campaign}","${row.store}","${row.w1.status}","${row.w2.status}","${row.w3.status}","${row.w4.status}","${row.totalPayout}"\n`;
      });
    }
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SuperK_VM_Analytics_${dashboardTab}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderWeekCell = (week: {sub: number, app: number, rej: number}) => (
    <div className="flex flex-col gap-0.5 text-[10px] w-24 mx-auto bg-slate-50 p-1.5 rounded-md border border-slate-100">
      <div className="flex justify-between items-center"><span className="text-slate-400 font-bold">SUB</span><span className="font-black text-blue-600">{week.sub}%</span></div>
      <div className="flex justify-between items-center"><span className="text-slate-400 font-bold">APP</span><span className="font-black text-green-600">{week.app}%</span></div>
      <div className="flex justify-between items-center"><span className="text-slate-400 font-bold">REJ</span><span className="font-black text-red-600">{week.rej}%</span></div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500 flex flex-col h-full">
      
      {/* HEADER SECTION */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Analytics Matrix</h2>
          <p className="text-slate-500 mt-2 font-medium text-lg">Track visual merchandising compliance across the network.</p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Liability</p>
            <p className="text-2xl font-black text-green-600">₹{dashboardTotalPayout.toLocaleString()}</p>
          </div>
          <button onClick={exportMatrixToCSV} className="bg-white border border-slate-200 text-slate-700 px-5 py-3 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2 h-fit active:scale-95">⬇️ Export CSV</button>
        </div>
      </div>

      {/* HORIZONTAL CAMPAIGN TABS */}
      <div className="flex overflow-x-auto space-x-2 bg-white p-1.5 rounded-2xl mb-6 w-full max-w-full border border-slate-100 shadow-sm">
        <button onClick={() => { setDashboardTab('general'); setMatrixPage(1); }} className={`whitespace-nowrap px-6 py-3 rounded-xl text-sm font-bold transition-all ${dashboardTab === 'general' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>Executive Summary</button>
        {campaignsList?.map((camp: any) => (
          <button key={camp.id} onClick={() => { setDashboardTab(camp.name); setMatrixPage(1); }} className={`whitespace-nowrap px-6 py-3 rounded-xl text-sm font-bold transition-all ${dashboardTab === camp.name ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>
            {camp.name}
          </button>
        ))}
      </div>

      {/* EXECUTIVE SUMMARY FILTER BAR */}
      {dashboardTab === 'general' && (
        <div className="flex justify-end mb-4 relative z-20">
          <div className="bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm flex items-center pr-1.5">
             <span className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-3 mr-2">Filter Summary:</span>
             <div className="relative">
               <button 
                 onClick={() => setIsCampMenuOpen(!isCampMenuOpen)}
                 className="bg-slate-50 border-2 border-slate-100 text-slate-700 text-sm font-bold rounded-xl px-4 py-2 hover:bg-slate-100 transition-colors flex items-center gap-2 min-w-[140px] justify-between"
               >
                 <span>{selectedCampaigns.includes('All') ? 'All Campaigns' : `${selectedCampaigns.length} Selected`}</span>
                 <span className="text-[10px] text-slate-400">▼</span>
               </button>

               {/* Dropdown Menu */}
               {isCampMenuOpen && (
                 <>
                   <div className="fixed inset-0 z-40" onClick={() => setIsCampMenuOpen(false)}></div>
                   <div className="absolute top-full mt-2 right-0 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-50 max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                     <label className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors">
                        <input type="checkbox" checked={selectedCampaigns.includes('All')} onChange={() => toggleCampaign('All')} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4" />
                        <span className="text-sm font-black text-slate-800">Select All Campaigns</span>
                     </label>
                     <div className="my-1 border-t border-slate-100"></div>
                     {campaignsList?.map((c: any) => (
                        <label key={c.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors">
                          <input type="checkbox" checked={selectedCampaigns.includes(c.name)} onChange={() => toggleCampaign(c.name)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4" />
                          <span className="text-sm font-medium text-slate-600">{c.name}</span>
                        </label>
                     ))}
                   </div>
                 </>
               )}
             </div>
          </div>
        </div>
      )}
      
      {/* DATA TABLES */}
      <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-xl shadow-slate-200/40 z-10">
        {dashboardTab === 'general' ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-widest">
                <th className="p-5 font-bold">Active Campaign</th>
                <th className="p-5 font-bold text-center">Stores</th>
                <th className="p-5 font-bold text-center w-28">W1 (1-7)</th>
                <th className="p-5 font-bold text-center w-28">W2 (8-14)</th>
                <th className="p-5 font-bold text-center w-28">W3 (15-21)</th>
                <th className="p-5 font-bold text-center w-28">W4 (22+)</th>
                <th className="p-5 font-bold text-right">Liability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {paginatedGeneralMatrix.length > 0 ? paginatedGeneralMatrix.map((row: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-5 font-bold text-slate-800">{row.campaign}</td>
                  <td className="p-5 text-center font-bold text-slate-500 bg-slate-50/30">{row.enrolled}</td>
                  <td className="p-5">{renderWeekCell(row.w1)}</td>
                  <td className="p-5">{renderWeekCell(row.w2)}</td>
                  <td className="p-5">{renderWeekCell(row.w3)}</td>
                  <td className="p-5">{renderWeekCell(row.w4)}</td>
                  <td className="p-5 text-right font-black text-green-600">₹{row.totalLiability.toLocaleString()}</td>
                </tr>
              )) : (
                <tr><td colSpan={7} className="p-16 text-center text-slate-400 font-bold">No campaigns match your filter.</td></tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left border-collapse">
             <thead className="bg-slate-50/80 border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-widest">
                <tr>
                  <th className="p-5 font-bold">Store</th>
                  <th className="p-5 font-bold text-center">W1 Status</th>
                  <th className="p-5 font-bold text-center">W2 Status</th>
                  <th className="p-5 font-bold text-center">W3 Status</th>
                  <th className="p-5 font-bold text-center">W4 Status</th>
                  <th className="p-5 font-bold text-right">Payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {paginatedMatrix.map((row: any, i: number) => (
                   <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                     <td className="p-5 font-bold text-slate-700">{row.store}</td>
                     <td className="p-5 text-center">
                        <span onClick={() => onPhotoClick(row.w1)} className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${row.w1.status === 'Approved' ? 'bg-green-100 text-green-700' : row.w1.status === 'Rejected' ? 'bg-red-100 text-red-700' : row.w1.status === 'Missed' ? 'bg-slate-100 text-slate-400' : 'bg-amber-100 text-amber-700'}`}>{row.w1.status}</span>
                     </td>
                     <td className="p-5 text-center">
                        <span onClick={() => onPhotoClick(row.w2)} className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${row.w2.status === 'Approved' ? 'bg-green-100 text-green-700' : row.w2.status === 'Rejected' ? 'bg-red-100 text-red-700' : row.w2.status === 'Missed' ? 'bg-slate-100 text-slate-400' : 'bg-amber-100 text-amber-700'}`}>{row.w2.status}</span>
                     </td>
                     <td className="p-5 text-center">
                        <span onClick={() => onPhotoClick(row.w3)} className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${row.w3.status === 'Approved' ? 'bg-green-100 text-green-700' : row.w3.status === 'Rejected' ? 'bg-red-100 text-red-700' : row.w3.status === 'Missed' ? 'bg-slate-100 text-slate-400' : 'bg-amber-100 text-amber-700'}`}>{row.w3.status}</span>
                     </td>
                     <td className="p-5 text-center">
                        <span onClick={() => onPhotoClick(row.w4)} className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${row.w4.status === 'Approved' ? 'bg-green-100 text-green-700' : row.w4.status === 'Rejected' ? 'bg-red-100 text-red-700' : row.w4.status === 'Missed' ? 'bg-slate-100 text-slate-400' : 'bg-amber-100 text-amber-700'}`}>{row.w4.status}</span>
                     </td>
                     <td className="p-5 text-right font-black text-green-600">₹{row.totalPayout}</td>
                   </tr>
                ))}
              </tbody>
          </table>
        )}
        <div className="p-5 bg-slate-50/50 border-t border-slate-100">
          <Pagination 
            total={dashboardTab === 'general' ? filteredGeneralMatrixData.length : filteredDashboardData.length} 
            page={matrixPage} 
            setPage={setMatrixPage} 
          />
        </div>
      </div>
    </div>
  );
}