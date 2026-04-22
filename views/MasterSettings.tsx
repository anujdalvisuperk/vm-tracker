'use client';
import { useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

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

export default function MasterSettings({ storesList, campaignsList, reasonsList, personnelList, fetchData }: any) {
  const [settingsTab, setSettingsTab] = useState<'stores' | 'campaigns' | 'reasons' | 'personnel'>('stores');
  const ITEMS_PER_PAGE = 10;
  
  // --- STATE: STORES ---
  const [newStoreName, setNewStoreName] = useState('');
  const [editingStoreId, setEditingStoreId] = useState<number | null>(null);
  const [editingStoreName, setEditingStoreName] = useState('');
  const [storesPage, setStoresPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mappingFileInputRef = useRef<HTMLInputElement>(null);

  // --- STATE: PERSONNEL ---
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonRole, setNewPersonRole] = useState<'ASM' | 'SAE' | 'Promoter'>('SAE');
  const personnelFileInputRef = useRef<HTMLInputElement>(null);

  // --- STATE: CAMPAIGNS ---
  const [campaignsPage, setCampaignsPage] = useState(1);
  const [newCampName, setNewCampName] = useState('');
  const [newCampPayout, setNewCampPayout] = useState<number | ''>('');
  const [newCampStores, setNewCampStores] = useState<string[]>([]);
  const [newCampDependencies, setNewCampDependencies] = useState<string[]>([]);
  const [newCampStart, setNewCampStart] = useState('');
  const [newCampEnd, setNewCampEnd] = useState('');
  const [editingCampaign, setEditingCampaign] = useState<any | null>(null);

  // --- STATE: REASONS ---
  const [newReason, setNewReason] = useState('');

  // ==========================================
  // LOGIC: PERSONNEL & MAPPING
  // ==========================================
  const handleMapStore = async (storeId: number, fieldName: 'asm_id' | 'field_staff_id', personId: string) => {
    const val = personId === 'none' ? null : personId;
    await supabase.from('stores').update({ [fieldName]: val }).eq('id', storeId);
    fetchData();
  };

  const handleBulkPersonnelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const lines = (event.target?.result as string).split('\n').filter(l => l.trim());
      // Skip header row
      const newPersonnel = lines.slice(1).map(line => {
        const [name, role] = line.split(',').map(s => s.trim());
        return { name, role: role.toUpperCase() };
      });
      await supabase.from('personnel').upsert(newPersonnel, { onConflict: 'name' });
      fetchData();
      alert("Personnel uploaded successfully!");
    };
    reader.readAsText(file);
    if(personnelFileInputRef.current) personnelFileInputRef.current.value = '';
  };

  const handleBulkMappingUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const lines = (event.target?.result as string).split('\n').filter(l => l.trim());
      // Skip header row
      for (const line of lines.slice(1)) {
        const parts = line.split(',');
        if (parts.length < 3) continue; // Skip bad rows
        const [sName, asmName, fsName] = parts.map(s => s.trim());
        const store = storesList.find((s:any) => s.name === sName);
        const asm = personnelList?.find((p:any) => p.name === asmName);
        const fs = personnelList?.find((p:any) => p.name === fsName);
        
        if (store) {
          await supabase.from('stores').update({ asm_id: asm?.id || null, field_staff_id: fs?.id || null }).eq('id', store.id);
        }
      }
      fetchData();
      alert("Store Mapping updated successfully!");
    };
    reader.readAsText(file);
    if(mappingFileInputRef.current) mappingFileInputRef.current.value = '';
  };

  // ==========================================
  // LOGIC: STORES
  // ==========================================
  const handleAddSingleStore = async () => {
    if (!newStoreName.trim()) return;
    await supabase.from('stores').insert([{ name: newStoreName, aligned: true }]);
    setNewStoreName(''); fetchData();
  };

  const toggleStoreAlignment = async (id: number, currentStatus: boolean) => {
    await supabase.from('stores').update({ aligned: !currentStatus }).eq('id', id); fetchData();
  };

  const handleDeleteStore = async (id: number, storeName: string) => {
    if (confirm(`Permanently delete ${storeName}?`)) { await supabase.from('stores').delete().eq('id', id); fetchData(); }
  };

  const saveEditStore = async (id: number, oldName: string) => {
    if (!editingStoreName.trim()) return setEditingStoreId(null);
    await supabase.from('stores').update({ name: editingStoreName }).eq('id', id);
    if (editingStoreName !== oldName) await supabase.from('executions').update({ store_name: editingStoreName }).eq('store_name', oldName);
    setEditingStoreId(null); fetchData();
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const rows = text.split('\n').map(row => row.trim()).filter(row => row);
      // Skip header row assuming it says "Store Name"
      const dataRows = rows[0].toLowerCase().includes("store name") ? rows.slice(1) : rows;
      const newStores = dataRows.map(name => ({ name: name.replace(/,/g, ''), aligned: true }));
      await supabase.from('stores').insert(newStores); fetchData();
      alert("Stores imported successfully!");
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ==========================================
  // LOGIC: CAMPAIGNS & REASONS
  // ==========================================
  const handleAddCampaign = async () => {
    if (!newCampName.trim() || newCampPayout === '' || !newCampStart || !newCampEnd) return alert("Please fill all required fields.");
    await supabase.from('campaigns').insert([{ name: newCampName, payout: Number(newCampPayout), stores: newCampStores, dependencies: newCampDependencies, start_date: newCampStart, end_date: newCampEnd }]);
    setNewCampName(''); setNewCampPayout(''); setNewCampStores([]); setNewCampDependencies([]); setNewCampStart(''); setNewCampEnd(''); fetchData();
  };

  const handleDeleteCampaign = async (id: number, campName: string) => {
    if (confirm(`Permanently delete campaign "${campName}"?`)) { await supabase.from('campaigns').delete().eq('id', id); fetchData(); }
  };

  const saveEditCampaign = async () => {
    if (!editingCampaign.name.trim() || editingCampaign.payout === '' || !editingCampaign.start_date || !editingCampaign.end_date) return alert("Fill all fields.");
    await supabase.from('campaigns').update({
      name: editingCampaign.name, payout: Number(editingCampaign.payout), start_date: editingCampaign.start_date, end_date: editingCampaign.end_date,
      stores: editingCampaign.stores || [], dependencies: editingCampaign.dependencies || []
    }).eq('id', editingCampaign.id);
    setEditingCampaign(null); fetchData();
  };

  const toggleStoreInCampaign = (storeName: string, isEditing = false) => {
    if (isEditing && editingCampaign) {
      const stores = editingCampaign.stores || [];
      setEditingCampaign({ ...editingCampaign, stores: stores.includes(storeName) ? stores.filter((s: string) => s !== storeName) : [...stores, storeName] });
    } else {
      setNewCampStores(prev => prev.includes(storeName) ? prev.filter(s => s !== storeName) : [...prev, storeName]);
    }
  };

  const toggleDependency = (campName: string, isEditing = false) => {
    if (isEditing && editingCampaign) {
      const deps = editingCampaign.dependencies || [];
      setEditingCampaign({ ...editingCampaign, dependencies: deps.includes(campName) ? deps.filter((c: string) => c !== campName) : [...deps, campName] });
    } else {
      setNewCampDependencies(prev => prev.includes(campName) ? prev.filter(c => c !== campName) : [...prev, campName]);
    }
  };

  const handleAddReason = async () => {
    if (!newReason.trim()) return;
    await supabase.from('rejection_reasons').insert([{ reason: newReason.trim() }]);
    setNewReason(''); fetchData();
  };

  const handleDeleteReason = async (id: number) => {
    if (confirm("Delete this reason?")) { await supabase.from('rejection_reasons').delete().eq('id', id); fetchData(); }
  };

  // Derived Values
  const alignedStoresCount = storesList.filter((s: any) => s.aligned).length;
  const paginatedStores = storesList.slice((storesPage - 1) * ITEMS_PER_PAGE, storesPage * ITEMS_PER_PAGE);
  const paginatedCampaigns = campaignsList.slice((campaignsPage - 1) * ITEMS_PER_PAGE, campaignsPage * ITEMS_PER_PAGE);

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="mb-8">
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">Master Settings</h2>
        <p className="text-slate-500 mt-2 font-medium text-lg">Manage Roster, Personnel Mapping, Campaigns, and Settings.</p>
      </div>

      <div className="flex space-x-2 bg-white p-1.5 rounded-2xl mb-8 w-fit border border-slate-100 shadow-sm">
        <button onClick={() => setSettingsTab('stores')} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${settingsTab === 'stores' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>🏢 Manage Stores</button>
        <button onClick={() => setSettingsTab('personnel')} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${settingsTab === 'personnel' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>👥 Personnel Roster</button>
        <button onClick={() => setSettingsTab('campaigns')} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${settingsTab === 'campaigns' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>📢 Manage Campaigns</button>
        <button onClick={() => setSettingsTab('reasons')} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${settingsTab === 'reasons' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>❌ Rejection Reasons</button>
      </div>

      {/* ========================================== */}
      {/* TAB 1: STORES & MAPPING */}
      {/* ========================================== */}
      {settingsTab === 'stores' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
             {/* Stats Cards ... kept intact */}
             <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Total Stores</p><p className="text-4xl font-black text-slate-800">{storesList.length}</p></div>
             <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Aligned</p><p className="text-4xl font-black text-green-500">{alignedStoresCount}</p></div>
             <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Unaligned</p><p className="text-4xl font-black text-amber-500">{storesList.length - alignedStoresCount}</p></div>
             <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Alignment %</p><p className="text-4xl font-black text-blue-500">{storesList.length ? Math.round((alignedStoresCount / storesList.length) * 100) : 0}%</p></div>
          </div>

          <div className="bg-white p-6 border border-slate-100 rounded-3xl shadow-sm flex flex-col md:flex-row gap-6 items-start">
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 block">Add Single Store</label>
              <p className="text-[10px] text-slate-500 mb-3 font-medium">Add a single store to the network manually.</p>
              <div className="flex gap-3">
                <input type="text" value={newStoreName} onChange={(e) => setNewStoreName(e.target.value)} placeholder="e.g. SuperK Anantapur" className="flex-1 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:border-blue-400 focus:ring-4 focus:ring-blue-50 outline-none transition-all" />
                <button onClick={handleAddSingleStore} className="bg-slate-900 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-blue-600 transition-all shadow-md active:scale-95">Add Store</button>
              </div>
            </div>
            <div className="hidden md:block w-px h-24 bg-slate-100 mx-4"></div>
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 block">Bulk Import & Mapping</label>
              <p className="text-[10px] text-slate-500 mb-3 font-medium">Upload a CSV to quickly build your store list or link personnel.</p>
              
              <div className="space-y-4">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800">1. Upload Store List</p>
                    <p className="text-[10px] text-slate-500">Must contain 1 column with header: <b>Store Name</b></p>
                  </div>
                  <input type="file" accept=".csv" ref={fileInputRef} onChange={handleCSVUpload} className="hidden" />
                  <button onClick={() => fileInputRef.current?.click()} className="border border-slate-200 bg-white text-slate-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-50 shadow-sm active:scale-95">📁 Import Stores</button>
                </div>
                
                <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-blue-900">2. Upload Mapping Roster</p>
                    <p className="text-[10px] text-blue-700">Format: <b>Store Name, ASM Name, Field Staff Name</b></p>
                  </div>
                  <input type="file" accept=".csv" ref={mappingFileInputRef} onChange={handleBulkMappingUpload} className="hidden" />
                  <button onClick={() => mappingFileInputRef.current?.click()} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md hover:bg-blue-700 transition-all active:scale-95">📤 Map Roster</button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
             <div className="p-4 bg-slate-50/80 border-b border-slate-100">
               <h4 className="text-sm font-black text-slate-800">Store Directory & Manual Mapping</h4>
               <p className="text-xs text-slate-500">Edit store names, set alignment status, or manually assign ASMs and Field Staff below.</p>
             </div>
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-widest">
                  <th className="p-5 font-bold w-1/4">Store Name</th>
                  <th className="p-5 font-bold w-1/4">ASM Assigned</th>
                  <th className="p-5 font-bold w-1/4">Field Staff Assigned</th>
                  <th className="p-5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginatedStores.map((store: any) => (
                  <tr key={store.id} className="hover:bg-slate-50/50 transition-colors">
                    {editingStoreId === store.id ? (
                      <td className="p-4"><input type="text" value={editingStoreName} onChange={(e) => setEditingStoreName(e.target.value)} className="w-full border-2 border-blue-200 rounded-lg px-4 py-2 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none" autoFocus /></td>
                    ) : (<td className="p-5 font-bold text-slate-800">{store.name}</td>)}
                    
                    <td className="p-5">
                      <select value={store.asm_id || 'none'} onChange={(e) => handleMapStore(store.id, 'asm_id', e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-xs font-bold outline-none focus:border-blue-400 bg-white">
                        <option value="none">-- Select ASM --</option>
                        {personnelList?.filter((p:any) => p.role === 'ASM').map((p:any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </td>

                    <td className="p-5">
                      <select value={store.field_staff_id || 'none'} onChange={(e) => handleMapStore(store.id, 'field_staff_id', e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-xs font-bold outline-none focus:border-blue-400 bg-white">
                        <option value="none">-- Select Field Staff --</option>
                        {personnelList?.filter((p:any) => p.role !== 'ASM').map((p:any) => <option key={p.id} value={p.id}>{p.name} ({p.role})</option>)}
                      </select>
                    </td>

                    <td className="p-5 text-right flex justify-end gap-2">
                      {editingStoreId === store.id ? (
                        <button onClick={() => saveEditStore(store.id, store.name)} className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm">💾 Save</button>
                      ) : (
                        <button onClick={() => { setEditingStoreId(store.id); setEditingStoreName(store.name); }} className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-all">✏️ Edit</button>
                      )}
                      <button onClick={() => toggleStoreAlignment(store.id, store.aligned)} className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${store.aligned ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>
                        {store.aligned ? '✓ Aligned' : '✕ Unaligned'}
                      </button>
                      <button onClick={() => handleDeleteStore(store.id, store.name)} className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-all">🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-4 bg-slate-50/50 border-t border-slate-100"><Pagination total={storesList.length} page={storesPage} setPage={setStoresPage} /></div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 2: PERSONNEL ROSTER */}
      {/* ========================================== */}
      {settingsTab === 'personnel' && (
        <div className="space-y-6">
          <div className="bg-white p-8 border border-slate-100 rounded-3xl shadow-sm flex flex-col md:flex-row gap-6 items-start">
            <div className="flex-1 space-y-4">
              <div>
                 <h3 className="text-lg font-black text-slate-800">Add Field Staff</h3>
                 <p className="text-xs text-slate-500 font-medium">Add individuals to your roster before mapping them to stores.</p>
              </div>
              <div className="flex gap-4">
                <input type="text" value={newPersonName} onChange={e => setNewPersonName(e.target.value)} placeholder="Full Name" className="flex-1 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:border-blue-400 outline-none" />
                <select value={newPersonRole} onChange={e => setNewPersonRole(e.target.value as any)} className="w-40 border-2 border-slate-100 rounded-xl px-4 text-sm focus:border-blue-400 outline-none bg-white">
                  <option value="ASM">ASM</option>
                  <option value="SAE">SAE</option>
                  <option value="Promoter">Promoter</option>
                </select>
                <button onClick={async () => {
                  if(!newPersonName) return;
                  await supabase.from('personnel').insert([{ name: newPersonName, role: newPersonRole }]);
                  setNewPersonName(''); fetchData();
                }} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-600 transition-all">Add Person</button>
              </div>
            </div>
            <div className="w-px h-24 bg-slate-100 mx-4 hidden md:block"></div>
            <div className="flex-1">
              <div>
                 <h3 className="text-lg font-black text-slate-800">Bulk Upload Roster</h3>
                 <p className="text-xs text-slate-500 font-medium mb-3">Upload a CSV to quickly populate your entire field team.</p>
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-700 font-bold mb-1">CSV Format Requirements:</p>
                    <p className="text-[10px] text-slate-500">Row 1 (Headers): <b>Name, Role</b></p>
                    <p className="text-[10px] text-slate-500">Valid Roles: <b>ASM, SAE, Promoter</b></p>
                    <input type="file" accept=".csv" ref={personnelFileInputRef} onChange={handleBulkPersonnelUpload} className="hidden" />
                    <button onClick={() => personnelFileInputRef.current?.click()} className="mt-3 bg-white border border-slate-200 text-slate-700 px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-100 transition-all shadow-sm">📁 Upload Personnel CSV</button>
                 </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-slate-50">
                <tr className="text-[10px] text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="p-5 font-bold">Name</th>
                  <th className="p-5 font-bold">Role</th>
                  <th className="p-5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {personnelList?.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="p-5 font-bold text-slate-800">{p.name}</td>
                    <td className="p-5">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${p.role === 'ASM' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>{p.role}</span>
                    </td>
                    <td className="p-5 text-right">
                      <button onClick={async () => { if(confirm("Delete person?")) { await supabase.from('personnel').delete().eq('id', p.id); fetchData(); } }} className="text-red-500 font-bold text-xs hover:underline">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 3: CAMPAIGNS */}
      {/* ========================================== */}
      {settingsTab === 'campaigns' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1 bg-white p-8 border border-slate-100 rounded-3xl shadow-sm h-fit">
            <h3 className="text-xl font-black text-slate-900 mb-2">Create Campaign</h3>
            <p className="text-xs text-slate-500 mb-6 border-b border-slate-100 pb-4 font-medium">Define new visual merchandising requirements and payout rules.</p>
            <div className="space-y-5">
              <div>
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Campaign Name</label>
                 <p className="text-[9px] text-slate-500 mb-1">Must exactly match the tag used in Slack/PAZO.</p>
                 <input type="text" value={newCampName} onChange={(e) => setNewCampName(e.target.value)} className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:border-blue-400 focus:ring-4 focus:ring-blue-50 outline-none transition-all" />
              </div>
              <div>
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Weekly Payout (₹)</label>
                 <p className="text-[9px] text-slate-500 mb-1">Amount paid per week if approved.</p>
                 <input type="number" value={newCampPayout} onChange={(e) => setNewCampPayout(e.target.value === '' ? '' : Number(e.target.value))} className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:border-blue-400 focus:ring-4 focus:ring-blue-50 outline-none transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Start Date</label><input type="date" value={newCampStart} onChange={(e) => setNewCampStart(e.target.value)} className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:border-blue-400 focus:ring-4 focus:ring-blue-50 outline-none transition-all" /></div>
                <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">End Date</label><input type="date" value={newCampEnd} onChange={(e) => setNewCampEnd(e.target.value)} className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:border-blue-400 focus:ring-4 focus:ring-blue-50 outline-none transition-all" /></div>
              </div>
              <button onClick={handleAddCampaign} className="w-full bg-blue-600 text-white font-black py-4 rounded-xl hover:bg-blue-700 transition-all shadow-md active:scale-95 mt-4">Publish Campaign</button>
            </div>
          </div>
          
          <div className="md:col-span-2 space-y-6">
            {paginatedCampaigns.map((campaign: any) => (
              <div key={campaign.id} className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all">
                {campaign.end_date && new Date(campaign.end_date) < new Date() ? (
                  <div className="absolute top-0 right-0 bg-slate-200 text-slate-600 text-[10px] font-bold px-4 py-1.5 rounded-bl-2xl uppercase tracking-widest">Expired</div>
                ) : (
                  <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-4 py-1.5 rounded-bl-2xl uppercase tracking-widest shadow-sm">Live Now</div>
                )}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h4 className="text-2xl font-black text-slate-900 tracking-tight">{campaign.name}</h4>
                    <p className="text-sm font-bold text-green-500 mt-1">₹{campaign.payout} / week</p>
                    <p className="text-xs text-slate-400 font-medium mt-1">
                      {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : 'N/A'} - {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString() : 'Ongoing'}
                    </p>
                  </div>
                  <span className="bg-blue-50 text-blue-600 text-xs font-black px-4 py-1.5 rounded-full border border-blue-100">{campaign.stores?.length || 0} Stores Enrolled</span>
                </div>
                
                <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                  <button onClick={() => setEditingCampaign(campaign)} className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-all flex items-center gap-2">✏️ Manage Setup (Stores & Rules)</button>
                  <button onClick={() => handleDeleteCampaign(campaign.id, campaign.name)} className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-all flex items-center gap-2">🗑️</button>
                </div>
              </div>
            ))}
            <Pagination total={campaignsList.length} page={campaignsPage} setPage={setCampaignsPage} />
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 4: REASONS */}
      {/* ========================================== */}
      {settingsTab === 'reasons' && (
        <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm max-w-3xl">
           <div className="p-8 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Standard Rejections</h3>
              <p className="text-sm text-slate-500 mb-6 font-medium">Add predefined reasons that admins can quickly select from a dropdown during photo review (e.g. "Blurry photo", "Product missing").</p>
              <div className="flex gap-3">
                <input type="text" value={newReason} onChange={(e) => setNewReason(e.target.value)} placeholder="Type new rejection reason..." className="flex-1 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-red-400 focus:ring-4 focus:ring-red-50 outline-none transition-all" />
                <button onClick={handleAddReason} className="bg-slate-900 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-red-500 transition-all active:scale-95 shadow-md">Add Reason</button>
              </div>
           </div>
           <table className="w-full text-left border-collapse">
              <tbody className="divide-y divide-slate-50 text-sm">
                {reasonsList.map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-5 font-bold text-slate-700">{r.reason}</td>
                    <td className="p-5 text-right">
                      <button onClick={() => handleDeleteReason(r.id)} className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-all">🗑️ Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
           </table>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: EDIT CAMPAIGN */}
      {/* ========================================== */}
      {editingCampaign && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
           <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
              <h3 className="font-black text-xl text-slate-900 flex items-center gap-2">✏️ Manage Campaign</h3>
              <button onClick={() => setEditingCampaign(null)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 transition-all font-bold">✕</button>
            </div>
            <div className="p-8 overflow-y-auto space-y-6">
               <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Campaign Name</label><input type="text" value={editingCampaign.name} onChange={e => setEditingCampaign({...editingCampaign, name: e.target.value})} className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:border-blue-400 focus:ring-4 focus:ring-blue-50 outline-none transition-all" /></div>
               <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Weekly Payout (₹)</label><input type="number" value={editingCampaign.payout} onChange={e => setEditingCampaign({...editingCampaign, payout: e.target.value === '' ? '' : Number(e.target.value)})} className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:border-blue-400 focus:ring-4 focus:ring-blue-50 outline-none transition-all" /></div>
               <div className="grid grid-cols-2 gap-4">
                 <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Start Date</label><input type="date" value={editingCampaign.start_date || ''} onChange={e => setEditingCampaign({...editingCampaign, start_date: e.target.value})} className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:border-blue-400 focus:ring-4 focus:ring-blue-50 outline-none transition-all" /></div>
                 <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">End Date</label><input type="date" value={editingCampaign.end_date || ''} onChange={e => setEditingCampaign({...editingCampaign, end_date: e.target.value})} className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:border-blue-400 focus:ring-4 focus:ring-blue-50 outline-none transition-all" /></div>
               </div>
               
               <div className="pt-6 border-t border-slate-100">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">🔗 Required Co-Campaigns (Dependencies)</label>
                  <p className="text-[10px] text-slate-500 mb-3">If selected, this campaign will NOT payout unless the selected co-campaigns are also approved for that week.</p>
                  <div className="max-h-32 overflow-y-auto border-2 border-slate-100 rounded-xl p-2 bg-slate-50 space-y-1">
                     {campaignsList.filter((c:any) => c.id !== editingCampaign.id).map((camp:any) => (
                       <label key={camp.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer text-sm font-medium transition-colors">
                         <input type="checkbox" checked={(editingCampaign.dependencies || []).includes(camp.name)} onChange={() => toggleDependency(camp.name, true)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4" />
                         {camp.name}
                       </label>
                     ))}
                  </div>
               </div>

               <div className="pt-6 border-t border-slate-100">
                  <div className="mb-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Assigned Stores Roster</label>
                    <p className="text-[10px] text-slate-500">Only stores checked below are expected to submit photos for this campaign.</p>
                  </div>
                  <div className="max-h-48 overflow-y-auto border-2 border-slate-100 rounded-xl p-2 bg-slate-50 space-y-1">
                    {storesList.map((store:any) => (
                      <label key={store.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors">
                        <input type="checkbox" checked={(editingCampaign.stores || []).includes(store.name)} onChange={() => toggleStoreInCampaign(store.name, true)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4" />
                        <span className={`text-sm font-medium ${!store.aligned && 'text-slate-400 italic'}`}>{store.name} {!store.aligned && '(Unassigned)'}</span>
                      </label>
                    ))}
                  </div>
               </div>
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50/80 flex justify-end gap-3">
               <button onClick={() => setEditingCampaign(null)} className="px-6 py-3 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-all shadow-sm">Cancel</button>
               <button onClick={saveEditCampaign} className="px-8 py-3 rounded-xl text-sm font-black text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all active:scale-95">Save Campaign</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}