'use client';
import { useState, useMemo } from 'react';

export default function Leaderboard({ personnelList, storesList, matrixData }: any) {
  const [roleFilter, setRoleFilter] = useState<'ASM' | 'SAE_PROMOTER'>('SAE_PROMOTER');
  const [metricFilter, setMetricFilter] = useState<'submission' | 'approval'>('submission');
  const [weekFilter, setWeekFilter] = useState<'All' | 'w1' | 'w2' | 'w3' | 'w4'>('All');

  // --- DYNAMIC CALCULATOR ENGINE ---
  const leaderboardData = useMemo(() => {
    if (!personnelList || !storesList || !matrixData) return [];

    const calculateScore = (pId: string, roleType: 'asm' | 'staff') => {
      // 1. Find all stores assigned to this person
      const assignedStores = storesList.filter((s: any) => 
        roleType === 'asm' ? s.asm_id === pId : s.field_staff_id === pId
      ).map((s: any) => s.name);

      if (assignedStores.length === 0) return null;

      // 2. Get all matrix rows for these stores
      const rows = matrixData.filter((r: any) => assignedStores.includes(r.store));
      if (rows.length === 0) return { submissionRate: 0, approvalRate: 0, totalStores: assignedStores.length };

      let totalSlots = 0;
      let totalSubmitted = 0;
      let totalApproved = 0;

      // 3. Calculate based on the selected Week Filter
      rows.forEach((r: any) => {
        const weeksToCheck = weekFilter === 'All' ? [r.w1, r.w2, r.w3, r.w4] : [r[weekFilter]];
        totalSlots += weeksToCheck.length;
        
        weeksToCheck.forEach((w: any) => {
          if (w.status !== 'Missed') totalSubmitted++;
          if (w.status === 'Approved') totalApproved++;
        });
      });

      return {
        submissionRate: totalSlots > 0 ? Math.round((totalSubmitted / totalSlots) * 100) : 0,
        approvalRate: totalSubmitted > 0 ? Math.round((totalApproved / totalSubmitted) * 100) : 0,
        totalStores: assignedStores.length
      };
    };

    return personnelList.map((person: any) => ({
      ...person,
      stats: calculateScore(person.id, person.role === 'ASM' ? 'asm' : 'staff')
    })).filter((p: any) => p.stats !== null);
  }, [personnelList, storesList, matrixData, weekFilter]);


  // --- SORTING & FILTERING LIST ---
  const filteredList = useMemo(() => {
    const list = leaderboardData.filter((p: any) => 
      roleFilter === 'ASM' ? p.role === 'ASM' : (p.role === 'SAE' || p.role === 'Promoter')
    );
    
    return [...list].sort((a: any, b: any) => {
      const valA = metricFilter === 'submission' ? a.stats.submissionRate : a.stats.approvalRate;
      const valB = metricFilter === 'submission' ? b.stats.submissionRate : b.stats.approvalRate;
      return valB - valA; // Sort highest to lowest
    });
  }, [leaderboardData, roleFilter, metricFilter]);

  const topThree = filteredList.slice(0, 3);
  const theRest = filteredList.slice(3);

  const RankCard = ({ person, rank }: { person: any, rank: number }) => (
    <div className={`relative bg-white p-6 rounded-3xl border-2 transition-all hover:scale-105 shadow-xl ${
      rank === 1 ? 'border-amber-400 scale-110 z-10' : rank === 2 ? 'border-slate-300' : 'border-orange-300'
    }`}>
      <div className={`absolute -top-4 -right-4 w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-lg font-black text-white ${
        rank === 1 ? 'bg-amber-400' : rank === 2 ? 'bg-slate-400' : 'bg-orange-500'
      }`}>
        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{person.role}</p>
      <h4 className="text-xl font-black text-slate-900 truncate mb-4">{person.name}</h4>
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-[10px] font-bold mb-1">
            <span className="text-slate-400">COMPLIANCE</span>
            <span className="text-blue-600">{metricFilter === 'submission' ? person.stats.submissionRate : person.stats.approvalRate}%</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ${rank === 1 ? 'bg-amber-400' : 'bg-blue-500'}`}
              style={{ width: `${metricFilter === 'submission' ? person.stats.submissionRate : person.stats.approvalRate}%` }}
            />
          </div>
        </div>
        <p className="text-[10px] font-bold text-slate-400">{person.stats.totalStores} Stores Managed</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Field Leaderboard</h2>
          <p className="text-slate-500 mt-2 font-medium text-lg">Real-time performance ranking of the field team.</p>
        </div>
        
        {/* FILTERS */}
        <div className="flex flex-wrap gap-3">
          {/* Week Filter Dropdown */}
          <div className="bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm flex items-center pr-3">
             <span className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-3 mr-2">Time:</span>
             <select 
               value={weekFilter} 
               onChange={(e) => setWeekFilter(e.target.value as any)}
               className="border-none bg-slate-50 text-slate-700 text-sm font-bold rounded-xl px-3 py-2 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
             >
                <option value="All">Full Month</option>
                <option value="w1">Week 1 (1st - 7th)</option>
                <option value="w2">Week 2 (8th - 14th)</option>
                <option value="w3">Week 3 (15th - 21st)</option>
                <option value="w4">Week 4 (22nd - End)</option>
             </select>
          </div>

          <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
            <button onClick={() => setRoleFilter('SAE_PROMOTER')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${roleFilter === 'SAE_PROMOTER' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>SAE / Promoters</button>
            <button onClick={() => setRoleFilter('ASM')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${roleFilter === 'ASM' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>ASMs</button>
          </div>
          
          <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
            <button onClick={() => setMetricFilter('submission')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${metricFilter === 'submission' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>By Submission</button>
            <button onClick={() => setMetricFilter('approval')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${metricFilter === 'approval' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>By Approval</button>
          </div>
        </div>
      </div>

      {/* TOP 3 CARDS */}
      {filteredList.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-20 px-4 md:px-0 mt-8">
            {topThree[1] && <div className="mt-8"><RankCard person={topThree[1]} rank={2} /></div>}
            {topThree[0] && <RankCard person={topThree[0]} rank={1} />}
            {topThree[2] && <div className="mt-12"><RankCard person={topThree[2]} rank={3} /></div>}
          </div>

          {/* THE REST LIST */}
          {theRest.length > 0 && (
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50">
                  <tr className="text-[10px] text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <th className="p-6 font-bold">Rank</th>
                    <th className="p-6 font-bold">Name</th>
                    <th className="p-6 font-bold">Role</th>
                    <th className="p-6 font-bold">Stores</th>
                    <th className="p-6 font-bold text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {theRest.map((person: any, i: number) => {
                    const score = metricFilter === 'submission' ? person.stats.submissionRate : person.stats.approvalRate;
                    return (
                      <tr key={person.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-6 font-black text-slate-300"># {i + 4}</td>
                        <td className="p-6 font-bold text-slate-800">{person.name}</td>
                        <td className="p-6 text-xs font-bold text-slate-500">{person.role}</td>
                        <td className="p-6 text-xs font-bold text-slate-500">{person.stats.totalStores}</td>
                        <td className="p-6 text-right">
                          <span className={`font-black ${score > 80 ? 'text-green-500' : score > 50 ? 'text-amber-500' : 'text-red-500'}`}>{score}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white p-16 rounded-[2rem] border border-slate-100 shadow-sm text-center">
          <div className="text-4xl mb-4">🤷‍♂️</div>
          <h3 className="text-2xl font-black text-slate-800 mb-2">No Roster Data Found</h3>
          <p className="text-slate-500 font-medium">Head over to the Master Settings to map your ASMs and Field Staff to their stores!</p>
        </div>
      )}
    </div>
  );
}