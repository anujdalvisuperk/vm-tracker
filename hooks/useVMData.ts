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

  const fetchData = async () => {
    setIsLoading(true);
    
    const { data: qData } = await supabase.from('executions')
      .select('*')
      .eq('status', 'pending_admin')
      .order('submission_date', { ascending: false })
      .limit(10000);
    if (qData) setPendingExecutions(qData);

    const { data: hData } = await supabase.from('executions')
      .select('*')
      .order('submission_date', { ascending: false })
      .limit(50000);
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

    const { data: pData } = await supabase.from('personnel')
      .select('*')
      .order('name');
    if (pData) setPersonnelList(pData);

    setIsLoading(false);
  };

  useEffect(() => { 
    fetchData(); 
  }, []);

  // --- ENGINE: ORPHANS ---
  const orphanExecutions = useMemo(() => {
    const validStoreNames = storesList.map(s => s.name);
    return allExecutions.filter(e => e.store_name && !validStoreNames.includes(e.store_name));
  }, [allExecutions, storesList]);

  // --- ENGINE: GHOSTS ---
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

  // --- ENGINE: MATRIX CALCULATOR ---
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

  return {
    pendingExecutions, setPendingExecutions,
    allExecutions, setAllExecutions,
    storesList, setStoresList,
    campaignsList, setCampaignsList,
    reasonsList, setReasonsList,
    isLoading, setIsLoading,
    personnelList, setPersonnelList,
    fetchData,
    orphanExecutions,
    ghostExecutions,
    matrixData,
    generalMatrixData
  };
}