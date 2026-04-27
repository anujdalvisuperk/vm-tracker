'use client';
import { useState, useMemo, useEffect } from 'react';

export default function AnalyticsMatrix({ campaignsList, generalMatrixData, matrixData, matrixYear, setMatrixYear, matrixMonth, setMatrixMonth, onPhotoClick }: any) {
  const [dashboardTab, setDashboardTab] = useState('general');

  const years = [2024, 2025, 2026, 2027];
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>(['All']);
  const [isCampMenuOpen, setIsCampMenuOpen] = useState(false);

  useEffect(() => {
    const savedCamps = localStorage.getItem('vm_matrix_default_campaigns');
    if (savedCamps) { try { setSelectedCampaigns(JSON.parse(savedCamps)); } catch (e) {} }
  }, []);

  const handleYearChange = (val: string) => { setMatrixYear(val); localStorage.setItem('vm_matrix_default_year', val); };
  const handleMonthChange = (val: string) => { setMonthMonth(val); localStorage.setItem('vm_matrix_default_month', val); };

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
  };

  const filteredGeneralMatrixData = useMemo(() => {
    return generalMatrixData.filter((row: any) => selectedCampaigns.includes('All') || selectedCampaigns.includes(row.campaign));
  }, [generalMatrixData, selectedCampaigns]);

  const filteredDashboardData = useMemo(() => {
    if (dashboardTab === 'general') return matrixData; 
    return matrixData.filter((row: any) => row.campaign === dashboardTab);
  }, [matrixData, dashboardTab]);

  const dashboardTotalPayout = useMemo(() => {
    if (dashboardTab === 'general') return filteredGeneralMatrixData.reduce((sum: number, row: any) => sum + row.totalLiability, 0);
    return filteredDashboardData.reduce((sum: number, row: any) => sum + row.totalPayout, 0);
  }, [filteredGeneralMatrixData, filteredDashboardData, dashboardTab]);

  const exportMatrixToCSV = () => {
    let csvContent = '"Campaign Name","Store Name","Week 1 Status","Week 2 Status","Week 3 Status","Week 4 Status","Total Payout"\n';
    
    let dataToExport = [];
    if (dashboardTab === 'general') {
      dataToExport = matrixData.filter((row: any) => 
        selectedCampaigns.includes('All') || selectedCampaigns.includes(row.campaign)
      );
    } else {
      dataToExport = filteredDashboardData;
    }

    dataToExport.forEach((row: any) => {
      csvContent += `"${row.campaign}","${row.store}","${row.w1.status}","${row.w2.status}","${row.w3.status}","${row.w4.status}","${row.totalPayout}"\n`;
    });
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SuperK_VM_Execution_Data_${dashboardTab === 'general' ? 'Global' : dashboardTab}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderWeekCell = (week: {sub: number, app: number, rej: number}) => (
    <div className="flex flex-col gap-0.5 text-[9px] sm:text-[10px] w-20 sm:w-24 mx-auto bg-slate-50 p-1.5 rounded-md border border-slate-100">
      <div className="flex justify-between items-center"><span className="text-slate-400 font-bold">SUB</span><span className="font-black text-blue-600">{week.sub}%</span></div>
      <div className="flex justify-between items-center"><span className="text-slate-400 font-bold">APP</span><span className="font-black text-green-600">{week.app}%</span></div>
      <div className="flex justify-between items-center"><span className="text-slate-400 font-bold">REJ</span><span className="font-black text-red-600">{week.rej}%</span></div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500 flex flex-col pb-20 px-4 sm:px-0">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 md:mb-8 gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Analytics Matrix</h2>
          <p className="text-slate-500 mt-1 md:mt-2 font-medium text-sm md:text-lg">Track visual merchandising compliance across the network.</p>
        </div>
        <div className="flex w-full md:w-auto justify-between md:justify-end gap-4 items-center bg-white md:bg-transparent p-4 md:p-0 rounded-2xl border border-slate-100 md:border-none shadow-sm md:shadow-none">
          <div className="text-left md:text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Liability</p>
            <p className="text-xl md:text-2xl font-black text-green-600">₹{dashboardTotalPayout.toLocaleString()}</p>
          </div>
          <button onClick={exportMatrixToCSV} className="bg-slate-50 md:bg-white border border-slate-200 text-slate-700 px-4 py-2 md:px-5 md:py-3 rounded-xl text-xs md:text-sm font-bold hover:bg-slate-100 transition-all shadow-sm active:scale-95">⬇️ CSV</button>
        </div>
      </div>

      {/* HORIZONTAL CAMPAIGN TABS */}
      <div className="flex overflow-x-auto space-x-2 bg-white p-1.5 rounded-2xl mb-4 w-full border border-slate-100 shadow-sm scrollbar-hide flex-shrink-0">
        <button onClick={() => setDashboardTab('general')} className={`whitespace-nowrap px-4 md:px-6 py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-bold transition-all ${dashboardTab === 'general' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>Executive Summary</button>
        {generalMatrixData.map((camp: any) => (
          <button key={camp.id} onClick={() => setDashboardTab(camp.campaign)} className={`whitespace-nowrap px-4 md:px-6 py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-bold transition-all ${dashboardTab === camp.campaign ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>
            {camp.campaign}
          </button>
        ))}
      </div>

      {/* GLOBAL FILTERS ROW */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 relative z-30 w-full flex-shrink-0">
        
        {/* GLOBAL TIME FILTERS */}
        <div className="bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm flex items-center pr-2 w-full sm:w-auto">
           <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest pl-3 mr-2 hidden sm:inline-block">Time:</span>
           <select value={matrixYear} onChange={(e) => handleYearChange(e.target.value)} className="w-full sm:w-auto border-none bg-slate-50 text-slate-700 text-xs md:text-sm font-bold rounded-xl px-3 py-2 outline-none cursor-pointer mr-1 hover:bg-slate-100 transition-colors">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
           </select>
           <select value={matrixMonth} onChange={(e) => handleMonthChange(e.target.value)} className="w-full sm:w-auto border-none bg-slate-50 text-slate-700 text-xs md:text-sm font-bold rounded-xl px-3 py-2 outline-none cursor-pointer hover:bg-slate-100 transition-colors">
              {months.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
           </select>
        </div>

        {/* CAMPAIGN FILTER (Only for Executive Summary) */}
        {dashboardTab === 'general' && (
          <div className="bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm flex items-center pr-1.5 w-full sm:w-auto">
             <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest pl-3 mr-2 hidden sm:inline-block">Filter:</span>
             <div className="relative w-full sm:w-auto">
               <button onClick={() => setIsCampMenuOpen(!isCampMenuOpen)} className="w-full bg-slate-50 border-2 border-slate-100 text-slate-700 text-xs md:text-sm font-bold rounded-xl px-3 md:px-4 py-2 flex items-center gap-2 justify-between">
                 <span>{selectedCampaigns.includes('All') ? 'All Campaigns' : `${selectedCampaigns.length} Selected`}</span>
                 <span className="text-[10px] text-slate-400">▼</span>
               </button>
               {isCampMenuOpen && (
                 <>
                   <div className="fixed inset-0 z-40" onClick={() => setIsCampMenuOpen(false)}></div>
                   <div className="absolute top-full mt-2 left-0 md:right-0 w-full md:w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-50 max-h-72 overflow-y-auto">
                     <label className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl cursor-pointer">
                        <input type="checkbox" checked={selectedCampaigns.includes('All')} onChange={() => toggleCampaign('All')} className="rounded border-slate-300 text-blue-600 w-4 h-4" />
                        <span className="text-sm font-black text-slate-800">Select All</span>
                     </label>
                     <div className="my-1 border-t border-slate-100"></div>
                     {generalMatrixData.map((c: any) => (
                        <label key={c.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl cursor-pointer">
                          <input type="checkbox" checked={selectedCampaigns.includes(c.campaign)} onChange={() => toggleCampaign(c.campaign)} className="rounded border-slate-300 text-blue-600 w-4 h-4" />
                          <span className="text-sm font-medium text-slate-600">{c.campaign}</span>
                        </label>
                     ))}
                   </div>
                 </>
               )}
             </div>
          </div>
        )}
      </div>
      
      {/* DATA TABLES WITH SCROLL & STICKY HEADER */}
      <div className="bg-white border border-slate-100 rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/40 z-10 flex flex-col overflow-hidden">
        
        {/* Scrollable Container */}
        <div className="overflow-auto max-h-[65vh] w-full relative">
          {dashboardTab === 'general' ? (
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-slate-50/95 backdrop-blur-md sticky top-0 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                <tr className="text-[10px] text-slate-500 uppercase tracking-widest">
                  <th className="p-4 sm:p-5 font-black border-b border-slate-200">Active Campaign</th>
                  <th className="p-4 sm:p-5 font-black text-center border-b border-slate-200">Stores</th>
                  <th className="p-4 sm:p-5 font-black text-center w-24 sm:w-28 border-b border-slate-200">W1 (1-7)</th>
                  <th className="p-4 sm:p-5 font-black text-center w-24 sm:w-28 border-b border-slate-200">W2 (8-14)</th>
                  <th className="p-4 sm:p-5 font-black text-center w-24 sm:w-28 border-b border-slate-200">W3 (15-21)</th>
                  <th className="p-4 sm:p-5 font-black text-center w-24 sm:w-28 border-b border-slate-200">W4 (22+)</th>
                  <th className="p-4 sm:p-5 font-black text-right border-b border-slate-200">Liability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {filteredGeneralMatrixData.length > 0 ? filteredGeneralMatrixData.map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="p-4 sm:p-5 font-bold text-slate-800">{row.campaign}</td>
                    <td className="p-4 sm:p-5 text-center font-bold text-slate-500 bg-slate-50/30">{row.enrolled}</td>
                    <td className="p-4 sm:p-5">{renderWeekCell(row.w1)}</td>
                    <td className="p-4 sm:p-5">{renderWeekCell(row.w2)}</td>
                    <td className="p-4 sm:p-5">{renderWeekCell(row.w3)}</td>
                    <td className="p-4 sm:p-5">{renderWeekCell(row.w4)}</td>
                    <td className="p-4 sm:p-5 text-right font-black text-green-600">₹{row.totalLiability.toLocaleString()}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={7} className="p-16 text-center text-slate-400 font-bold">No campaigns match your filter.</td></tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse min-w-[800px]">
               <thead className="bg-slate-50/95 backdrop-blur-md sticky top-0 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                  <tr className="text-[10px] text-slate-500 uppercase tracking-widest">
                    <th className="p-4 sm:p-5 font-black border-b border-slate-200">Store</th>
                    <th className="p-4 sm:p-5 font-black text-center border-b border-slate-200">W1 Status</th>
                    <th className="p-4 sm:p-5 font-black text-center border-b border-slate-200">W2 Status</th>
                    <th className="p-4 sm:p-5 font-black text-center border-b border-slate-200">W3 Status</th>
                    <th className="p-4 sm:p-5 font-black text-center border-b border-slate-200">W4 Status</th>
                    <th className="p-4 sm:p-5 font-black text-right border-b border-slate-200">Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {filteredDashboardData.map((row: any, i: number) => (
                     <tr key={i} className="hover:bg-blue-50/30 transition-colors group">
                       <td className="p-4 sm:p-5 font-bold text-slate-700">{row.store}</td>
                       <td className="p-4 sm:p-5 text-center">
                          <span onClick={() => onPhotoClick(row.w1)} className={`cursor-pointer px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-transform hover:scale-105 inline-block ${row.w1.status === 'Approved' ? 'bg-green-100 text-green-700' : row.w1.status === 'Rejected' ? 'bg-red-100 text-red-700' : row.w1.status === 'Missed' ? 'bg-slate-100 text-slate-400' : 'bg-amber-100 text-amber-700'}`}>{row.w1.status}</span>
                       </td>
                       <td className="p-4 sm:p-5 text-center">
                          <span onClick={() => onPhotoClick(row.w2)} className={`cursor-pointer px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-transform hover:scale-105 inline-block ${row.w2.status === 'Approved' ? 'bg-green-100 text-green-700' : row.w2.status === 'Rejected' ? 'bg-red-100 text-red-700' : row.w2.status === 'Missed' ? 'bg-slate-100 text-slate-400' : 'bg-amber-100 text-amber-700'}`}>{row.w2.status}</span>
                       </td>
                       <td className="p-4 sm:p-5 text-center">
                          <span onClick={() => onPhotoClick(row.w3)} className={`cursor-pointer px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-transform hover:scale-105 inline-block ${row.w3.status === 'Approved' ? 'bg-green-100 text-green-700' : row.w3.status === 'Rejected' ? 'bg-red-100 text-red-700' : row.w3.status === 'Missed' ? 'bg-slate-100 text-slate-400' : 'bg-amber-100 text-amber-700'}`}>{row.w3.status}</span>
                       </td>
                       <td className="p-4 sm:p-5 text-center">
                          <span onClick={() => onPhotoClick(row.w4)} className={`cursor-pointer px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-transform hover:scale-105 inline-block ${row.w4.status === 'Approved' ? 'bg-green-100 text-green-700' : row.w4.status === 'Rejected' ? 'bg-red-100 text-red-700' : row.w4.status === 'Missed' ? 'bg-slate-100 text-slate-400' : 'bg-amber-100 text-amber-700'}`}>{row.w4.status}</span>
                       </td>
                       <td className="p-4 sm:p-5 text-right font-black text-green-600 group-hover:text-green-700 transition-colors">₹{row.totalPayout}</td>
                     </tr>
                  ))}
                </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}