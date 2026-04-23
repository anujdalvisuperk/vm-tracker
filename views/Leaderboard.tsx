'use client';
import { useState, useMemo, useEffect } from 'react';

// 👈 NEW: Accepts global time props and generalMatrixData for dynamic dropdowns
export default function Leaderboard({ personnelList, storesList, matrixData, generalMatrixData, matrixYear, setMatrixYear, matrixMonth, setMatrixMonth }: any) {
  const [roleFilter, setRoleFilter] = useState<'ASM' | 'SAE' | 'Promoter'>('SAE'); 
  const [sortFilter, setSortFilter] = useState<'approval' | 'submission'>('approval');
  const [weekFilter, setWeekFilter] = useState<'All' | 'w1' | 'w2' | 'w3' | 'w4'>('All');
  
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>(['All']);
  const [isCampMenuOpen, setIsCampMenuOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<any | null>(null);

  const years = [2024, 2025, 2026, 2027];
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  useEffect(() => {
    const savedWeek = localStorage.getItem('vm_default_week');
    if (savedWeek) setWeekFilter(savedWeek as any);
    const savedCamps = localStorage.getItem('vm_default_campaigns');
    if (savedCamps) { try { setSelectedCampaigns(JSON.parse(savedCamps)); } catch (e) {} }
  }, []);

  const handleWeekChange = (val: string) => { setWeekFilter(val as any); localStorage.setItem('vm_default_week', val); };
  
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
    localStorage.setItem('vm_default_campaigns', JSON.stringify(newSelection));
  };

  const leaderboardData = useMemo(() => {
    if (!personnelList || !storesList || !matrixData) return [];

    const calculateScore = (pId: string, roleType: 'asm' | 'staff') => {
      const assignedStores = storesList.filter((s: any) => roleType === 'asm' ? s.asm_id === pId : s.field_staff_id === pId).map((s: any) => s.name);
      if (assignedStores.length === 0) return null;

      const rows = matrixData.filter((r: any) => assignedStores.includes(r.store) && (selectedCampaigns.includes('All') || selectedCampaigns.includes(r.campaign)));
      
      let expected = 0; let submitted = 0; let approved = 0; let rejected = 0;
      if (rows.length === 0) return { submissionRate: 0, approvalRate: 0, totalStores: assignedStores.length, details: { expected, submitted, approved, rejected, missed: 0, rows: [] } };

      rows.forEach((r: any) => {
        const weeksToCheck = weekFilter === 'All' ? [r.w1, r.w2, r.w3, r.w4] : [r[weekFilter]];
        expected += weeksToCheck.length;
        weeksToCheck.forEach((w: any) => {
          if (w && w.status) {
             if (w.status !== 'Missed' && w.status !== 'Unassigned') submitted++;
             if (w.status === 'Approved') approved++;
             if (w.status === 'Rejected') rejected++;
          }
        });
      });

      return {
        submissionRate: expected > 0 ? Math.round((submitted / expected) * 100) : 0,
        approvalRate: expected > 0 ? Math.round((approved / expected) * 100) : 0,
        totalStores: assignedStores.length,
        details: { expected, submitted, approved, rejected, missed: expected - submitted, rows }
      };
    };

    return personnelList.map((person: any) => ({ ...person, stats: calculateScore(person.id, person.role === 'ASM' ? 'asm' : 'staff') })).filter((p: any) => p.stats !== null);
  }, [personnelList, storesList, matrixData, weekFilter, selectedCampaigns]); 

  const filteredList = useMemo(() => {
    return [...leaderboardData.filter((p: any) => p.role === roleFilter)].sort((a: any, b: any) => {
      if (sortFilter === 'approval') {
        if (b.stats.approvalRate !== a.stats.approvalRate) return b.stats.approvalRate - a.stats.approvalRate;
        return b.stats.submissionRate - a.stats.submissionRate;
      } else {
        if (b.stats.submissionRate !== a.stats.submissionRate) return b.stats.submissionRate - a.stats.submissionRate;
        return b.stats.approvalRate - a.stats.approvalRate;
      }
    });
  }, [leaderboardData, roleFilter, sortFilter]);

  const renderStatus = (status: string) => {
    if (!status || status === 'Missed') return <span className="text-slate-400 font-bold">Missed</span>;
    if (status === 'Approved') return <span className="text-green-600 font-black">Approved</span>;
    if (status === 'Rejected') return <span className="text-red-600 font-black">Rejected</span>;
    return <span className="text-amber-500 font-bold">Pending</span>;
  };

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500 pb-20 px-4 sm:px-0">
      
      {/* --- HEADER & FILTERS --- */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end mb-8 xl:mb-12 gap-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Field Leaderboard</h2>
          <p className="text-slate-500 mt-2 font-medium text-sm md:text-lg">Real-time performance ranking of the field team.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full xl:w-auto relative">
          
          <div className="bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm flex items-center pr-1.5 w-full sm:w-auto z-20">
             <span className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-3 mr-2 hidden sm:inline-block">Campaigns:</span>
             <div className="relative w-full sm:w-auto">
               <button onClick={() => setIsCampMenuOpen(!isCampMenuOpen)} className="w-full bg-slate-50 border-2 border-slate-100 text-slate-700 text-sm font-bold rounded-xl px-4 py-2 hover:bg-slate-100 transition-colors flex items-center gap-2 min-w-[140px] justify-between">
                 <span>{selectedCampaigns.includes('All') ? 'All Campaigns' : `${selectedCampaigns.length} Selected`}</span>
                 <span className="text-[10px] text-slate-400">▼</span>
               </button>
               {isCampMenuOpen && (
                 <>
                   <div className="fixed inset-0 z-40" onClick={() => setIsCampMenuOpen(false)}></div>
                   <div className="absolute top-full mt-2 left-0 w-full sm:w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-50 max-h-72 overflow-y-auto">
                     <label className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl cursor-pointer">
                        <input type="checkbox" checked={selectedCampaigns.includes('All')} onChange={() => toggleCampaign('All')} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4" />
                        <span className="text-sm font-black text-slate-800">Select All Campaigns</span>
                     </label>
                     <div className="my-1 border-t border-slate-100"></div>
                     {generalMatrixData?.map((c: any) => (
                        <label key={c.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl cursor-pointer">
                          <input type="checkbox" checked={selectedCampaigns.includes(c.campaign)} onChange={() => toggleCampaign(c.campaign)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4" />
                          <span className="text-sm font-medium text-slate-600">{c.campaign}</span>
                        </label>
                     ))}
                   </div>
                 </>
               )}
             </div>
          </div>

          <div className="bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm flex items-center pr-2 w-full sm:w-auto">
             <span className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-3 mr-2 hidden md:inline-block">Time:</span>
             <select value={matrixYear} onChange={(e) => setMatrixYear(e.target.value)} className="w-full sm:w-auto border-none bg-slate-50 text-slate-700 text-sm font-bold rounded-xl px-2 py-2 outline-none cursor-pointer mr-1 hover:bg-slate-100 transition-colors">
                {years.map(y => <option key={y} value={y}>{y}</option>)}
             </select>
             <select value={matrixMonth} onChange={(e) => setMatrixMonth(e.target.value)} className="w-full sm:w-auto border-none bg-slate-50 text-slate-700 text-sm font-bold rounded-xl px-2 py-2 outline-none cursor-pointer mr-1 hover:bg-slate-100 transition-colors">
                {months.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
             </select>
             <select value={weekFilter} onChange={(e) => handleWeekChange(e.target.value)} className="w-full sm:w-auto border-none bg-slate-50 text-slate-700 text-sm font-bold rounded-xl px-2 py-2 outline-none cursor-pointer hover:bg-slate-100 transition-colors">
                <option value="All">Full Month</option>
                <option value="w1">W1 (1-7)</option>
                <option value="w2">W2 (8-14)</option>
                <option value="w3">W3 (15-21)</option>
                <option value="w4">W4 (22+)</option>
             </select>
          </div>

          <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm w-full sm:w-auto overflow-x-auto">
            <button onClick={() => setRoleFilter('SAE')} className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${roleFilter === 'SAE' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>SAEs</button>
            <button onClick={() => setRoleFilter('Promoter')} className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${roleFilter === 'Promoter' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>Promoters</button>
            <button onClick={() => setRoleFilter('ASM')} className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${roleFilter === 'ASM' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>ASMs</button>
          </div>

          <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm w-full sm:w-auto overflow-x-auto">
            <button onClick={() => setSortFilter('approval')} className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${sortFilter === 'approval' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>Sort: Approval</button>
            <button onClick={() => setSortFilter('submission')} className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${sortFilter === 'submission' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>Sort: Submission</button>
          </div>
        </div>
      </div>

      {/* --- MAIN TABLE --- */}
      {filteredList.length > 0 ? (
        <div className="bg-white rounded-2xl sm:rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden relative z-10">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[900px]">
              <thead className="bg-slate-50">
                <tr className="text-[10px] text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="p-4 sm:p-6 font-bold w-16 sm:w-20">Rank</th>
                  <th className="p-4 sm:p-6 font-bold">Name</th>
                  <th className="p-4 sm:p-6 font-bold">Role</th>
                  <th className="p-4 sm:p-6 font-bold text-center">Stores</th>
                  <th className="p-4 sm:p-6 font-bold w-32 sm:w-40">Submission %</th>
                  <th className="p-4 sm:p-6 font-bold w-32 sm:w-40">Approval %</th>
                  <th className="p-4 sm:p-6 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredList.map((person: any, i: number) => (
                  <tr key={person.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="p-4 sm:p-6">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${i === 0 ? 'bg-amber-100 text-amber-600' : i === 1 ? 'bg-slate-200 text-slate-600' : i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-400'}`}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                      </div>
                    </td>
                    <td className="p-4 sm:p-6 font-black text-slate-900 text-base sm:text-lg">{person.name}</td>
                    <td className="p-4 sm:p-6"><span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider">{person.role}</span></td>
                    <td className="p-4 sm:p-6 font-bold text-slate-500 text-center">{person.stats.totalStores}</td>
                    
                    <td className="p-4 sm:p-6 pr-8">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                           <span>SUB</span><span className="text-blue-600">{person.stats.submissionRate}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                           <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${person.stats.submissionRate}%` }} />
                        </div>
                      </div>
                    </td>

                    <td className="p-4 sm:p-6 pr-8">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                           <span>APP</span><span className="text-green-600">{person.stats.approvalRate}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                           <div className="h-full bg-green-500 rounded-full transition-all duration-1000" style={{ width: `${person.stats.approvalRate}%` }} />
                        </div>
                      </div>
                    </td>

                    <td className="p-4 sm:p-6 text-right">
                      <button onClick={() => setSelectedPerson(person)} className="px-3 sm:px-4 py-2 bg-white border-2 border-slate-100 text-slate-600 font-bold text-xs rounded-xl hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all">Details</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white p-8 sm:p-16 rounded-2xl sm:rounded-[2rem] border border-slate-100 shadow-sm text-center">
          <div className="text-4xl mb-4">🤷‍♂️</div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-800 mb-2">No Data Found</h3>
          <p className="text-sm sm:text-base text-slate-500 font-medium">No {roleFilter}s match your current mappings or filters.</p>
        </div>
      )}

      {/* --- DRILL-DOWN MODAL --- */}
      {selectedPerson && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-100">
            <div className="p-6 sm:p-8 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
              <div>
                <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{selectedPerson.role} Performance</p>
                <h3 className="font-black text-2xl sm:text-3xl text-slate-900">{selectedPerson.name}</h3>
              </div>
              <button onClick={() => setSelectedPerson(null)} className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold transition-all">✕</button>
            </div>
            <div className="overflow-y-auto">
               <div className="p-4 sm:p-8 bg-white border-b border-slate-100">
                 <h4 className="text-xs sm:text-sm font-black text-slate-800 mb-4 uppercase tracking-widest">Aggregate Metrics ({weekFilter === 'All' ? 'Full Month' : weekFilter.toUpperCase()})</h4>
                 <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
                   <div className="bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-100 text-center"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Expected</p><p className="text-xl sm:text-3xl font-black text-slate-800">{selectedPerson.stats.details.expected}</p></div>
                   <div className="bg-blue-50 p-3 sm:p-4 rounded-xl border border-blue-100 text-center"><p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Submitted</p><p className="text-xl sm:text-3xl font-black text-blue-600">{selectedPerson.stats.details.submitted}</p></div>
                   <div className="bg-green-50 p-3 sm:p-4 rounded-xl border border-green-100 text-center"><p className="text-[10px] font-bold text-green-500 uppercase tracking-widest mb-1">Approved</p><p className="text-xl sm:text-3xl font-black text-green-600">{selectedPerson.stats.details.approved}</p></div>
                   <div className="bg-red-50 p-3 sm:p-4 rounded-xl border border-red-100 text-center"><p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">Rejected</p><p className="text-xl sm:text-3xl font-black text-red-600">{selectedPerson.stats.details.rejected}</p></div>
                   <div className="bg-slate-800 p-3 sm:p-4 rounded-xl border border-slate-900 text-center"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Missed</p><p className="text-xl sm:text-3xl font-black text-white">{selectedPerson.stats.details.missed}</p></div>
                 </div>
               </div>
               <div className="p-4 sm:p-8 bg-slate-50/30">
                 <h4 className="text-xs sm:text-sm font-black text-slate-800 mb-4 uppercase tracking-widest">Execution Breakdown</h4>
                 <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                   <div className="overflow-x-auto">
                     <table className="w-full text-left min-w-[600px]">
                       <thead className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-widest">
                         <tr>
                           <th className="p-3 sm:p-4 font-bold">Store</th>
                           <th className="p-3 sm:p-4 font-bold">Campaign</th>
                           {weekFilter === 'All' ? (
                             <>
                               <th className="p-3 sm:p-4 font-bold text-center">W1 Status</th>
                               <th className="p-3 sm:p-4 font-bold text-center">W2 Status</th>
                               <th className="p-3 sm:p-4 font-bold text-center">W3 Status</th>
                               <th className="p-3 sm:p-4 font-bold text-center">W4 Status</th>
                             </>
                           ) : (
                             <th className="p-3 sm:p-4 font-bold text-center">Target Week Status</th>
                           )}
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50 text-xs sm:text-sm">
                         {selectedPerson.stats.details.rows.map((row: any, idx: number) => (
                           <tr key={idx} className="hover:bg-slate-50/50">
                             <td className="p-3 sm:p-4 font-bold text-slate-800">{row.store}</td>
                             <td className="p-3 sm:p-4 font-bold text-slate-500">{row.campaign}</td>
                             {weekFilter === 'All' ? (
                               <>
                                 <td className="p-3 sm:p-4 text-center">{renderStatus(row.w1?.status)}</td>
                                 <td className="p-3 sm:p-4 text-center">{renderStatus(row.w2?.status)}</td>
                                 <td className="p-3 sm:p-4 text-center">{renderStatus(row.w3?.status)}</td>
                                 <td className="p-3 sm:p-4 text-center">{renderStatus(row.w4?.status)}</td>
                               </>
                             ) : (
                               <td className="p-3 sm:p-4 text-center">{renderStatus(row[weekFilter]?.status)}</td>
                             )}
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}