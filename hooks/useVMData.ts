'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useVMData() {
  const [pendingExecutions, setPendingExecutions] = useState<any[]>([]);
  const [allExecutions, setAllExecutions] = useState<any[]>([]);
  const [storesList, setStoresList] = useState<any[]>([]);
  const [campaignsList, setCampaignsList] = useState<any[]>([]);
  const [reasonsList, setReasonsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [personnelList, setPersonnelList] = useState<any[]>([]);

  // --- GLOBAL TIME STATE ---
  const [matrixYear, setMatrixYear] = useState<string>(new Date().getFullYear().toString());
  const [matrixMonth, setMatrixMonth] = useState<string>((new Date().getMonth() + 1).toString());

  useEffect(() => {
    const savedYear = localStorage.getItem('vm_global_year');
    if (savedYear) setMatrixYear(savedYear);
    const savedMonth = localStorage.getItem('vm_global_month');
    if (savedMonth) setMatrixMonth(savedMonth);
  }, []);

  const updateYear = (y: string) => { setMatrixYear(y); localStorage.setItem('vm_global_year', y); };
  const updateMonth = (m: string) => { setMatrixMonth(m); localStorage.setItem('vm_global_month', m); };

  const fetchData = async () => {
    setIsLoading(true);
    
    const { data: qData } = await supabase.from('executions').select('*').eq('status', 'pending_admin').order('submission_date', { ascending: false }).limit(10000);
    if (qData) setPendingExecutions(qData);

    const { data: hData } = await supabase.from('executions').select('*').order('submission_date', { ascending: false }).limit(50000);
    if (hData) setAllExecutions(hData);

    const { data: sData } = await supabase.from('stores').select('*').order('name').limit(5000);
    if (sData) setStoresList(sData);

    const { data: cData } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false });
    if (cData) setCampaignsList(cData);
    
    const { data: rData } = await supabase.from('rejection_reasons').select('*').order('id', { ascending: true });
    if (rData) setReasonsList(rData);

    const { data: pData } = await supabase.from('personnel').select('*').order('name');
    if (pData) setPersonnelList(pData);

    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // --- ENGINE: ORPHANS & GHOSTS ---
  const orphanExecutions = useMemo(() => {
    const validStoreNames = storesList.map(s => s.name);
    return allExecutions.filter(e => e.store_name && !validStoreNames.includes(e.store_name));
  }, [allExecutions, storesList]);

  const ghostExecutions = useMemo(() => {
    const ghosts: { execution: any, campaignId: number, campaignName: string, storeName: string }[] = [];
    const validStoreNames = storesList.map(s => s.name);
    
    allExecutions.forEach(e => {
      if ((e.status === 'approved' || e.status === 'rejected') && e.campaign_name && e.store_name && validStoreNames.includes(e.store_name)) {
          const taggedCamps = e.campaign_name.split(', ');
          taggedCamps.forEach((cName: string) => {
              const campObj = campaignsList.find(c => c.name === cName);
              if (campObj && (!campObj.stores || !campObj.stores.includes(e.store_name))) {
                  ghosts.push({ execution: e, campaignId: campObj.id, campaignName: campObj.name, storeName: e.store_name });
              }
          });
      }
    });
    return ghosts;
  }, [allExecutions, storesList, campaignsList]);

  // --- ENGINE: HISTORICAL SNAPSHOT CALCULATOR ---
  const timeFilteredExecutions = useMemo(() => {
    return allExecutions.filter(e => {
      if (!e.submission_date) return false;
      const d = new Date(e.submission_date);
      return d.getFullYear().toString() === matrixYear && (d.getMonth() + 1).toString() === matrixMonth;
    });
  }, [allExecutions, matrixMonth, matrixYear]);

  const matrixData = useMemo(() => {
    const rows: any[] = [];
    const isCurrentMonth = matrixYear === new Date().getFullYear().toString() && matrixMonth === (new Date().getMonth() + 1).toString();

    // 1. Gather all actual (Campaign, Store) pairs from executions in this timeframe
    const campaignStoreMap = new Map<string, Set<string>>();

    timeFilteredExecutions.forEach(e => {
      if (!e.campaign_name) return;
      const cNames = e.campaign_name.split(',').map((s:string) => s.trim());
      const storeName = e.store_name || e.extracted_store;
      if (!storeName) return;

      cNames.forEach((cName:string) => {
        if (!campaignStoreMap.has(cName)) campaignStoreMap.set(cName, new Set());
        campaignStoreMap.get(cName)!.add(storeName);
      });
    });

    // 2. If looking at current month, ALSO include the Master Roster so 0% stores show up
    if (isCurrentMonth) {
      campaignsList.forEach(camp => {
         if (!campaignStoreMap.has(camp.name)) campaignStoreMap.set(camp.name, new Set());
         if (camp.stores) camp.stores.forEach((s:string) => campaignStoreMap.get(camp.name)!.add(s));
      });
    }

    // 3. Generate the immutable matrix
    const getWeekStatusForCamp = (storeName: string, campName: string, weekNum: number) => {
      const storeExecs = timeFilteredExecutions.filter(e => 
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
      if (execForWeek.status === 'approved' || execForWeek.status === 'Approved') statusStr = 'Approved';
      if (execForWeek.status === 'rejected' || execForWeek.status === 'Rejected') statusStr = 'Rejected';
      return { status: statusStr, execution: execForWeek };
    };

    campaignStoreMap.forEach((storeSet, campName) => {
      const campObj = campaignsList.find(c => c.name === campName);
      const payout = campObj ? (campObj.payout || 0) : 0;
      
      storeSet.forEach(storeName => {
        const w1 = getWeekStatusForCamp(storeName, campName, 1);
        const w2 = getWeekStatusForCamp(storeName, campName, 2);
        const w3 = getWeekStatusForCamp(storeName, campName, 3);
        const w4 = getWeekStatusForCamp(storeName, campName, 4);

        let approvedCount = 0;
        const weeks = [w1, w2, w3, w4];
        
        weeks.forEach((weekObj, index) => {
          const weekNum = index + 1;
          if (weekObj.status === 'Approved') {
            let depsSatisfied = true;
            const deps = campObj ? (campObj.dependencies || []) : [];
            deps.forEach((depCampName: string) => {
              if (getWeekStatusForCamp(storeName, depCampName, weekNum).status !== 'Approved') depsSatisfied = false;
            });
            if (depsSatisfied) approvedCount++;
          }
        });

        rows.push({
          campaign: campName, store: storeName,
          w1, w2, w3, w4,
          totalPayout: approvedCount * payout
        });
      });
    });

    return rows;
  }, [campaignsList, timeFilteredExecutions, matrixMonth, matrixYear]);

  // --- ENGINE: DYNAMIC SUMMARY ---
  const generalMatrixData = useMemo(() => {
    // Dynamically build based on what's ACTUALLY in the matrixData (historical reality)
    const activeCampaigns = Array.from(new Set(matrixData.map(r => r.campaign)));
    
    return activeCampaigns.map(campName => {
      const campRows = matrixData.filter(r => r.campaign === campName);
      const enrolledCount = campRows.length; // Actual number of stores involved

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
        id: campName, campaign: campName, enrolled: enrolledCount,
        w1: calcWeek('w1'), w2: calcWeek('w2'), w3: calcWeek('w3'), w4: calcWeek('w4'),
        totalLiability: campRows.reduce((sum, r) => sum + r.totalPayout, 0)
      };
    });
  }, [matrixData]);

  return {
    pendingExecutions, setPendingExecutions,
    allExecutions, setAllExecutions,
    storesList, setStoresList,
    campaignsList, setCampaignsList,
    reasonsList, setReasonsList,
    personnelList, setPersonnelList,
    isLoading, setIsLoading, fetchData,
    orphanExecutions, ghostExecutions,
    matrixData, generalMatrixData,
    
    // EXPORT TIME STATE
    matrixYear, setMatrixYear: updateYear,
    matrixMonth, setMatrixMonth: updateMonth
  };
}