'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ExecutionCard({ execution, onUpdate }: { execution: any, onUpdate: () => void }) {
  const [mappedStore, setMappedStore] = useState(execution.extracted_store || '');
  const [selectedCampaign, setSelectedCampaign] = useState(execution.campaign_name || '');
  
  // LIVE DATA STATES
  const [officialStores, setOfficialStores] = useState<string[]>([]);
  const [activeCampaigns, setActiveCampaigns] = useState<string[]>([]);
  
  const isProcessed = execution.status === 'approved' || execution.status === 'rejected';

  // Fetch live stores and campaigns from Supabase on mount
  useEffect(() => {
    const fetchMasterData = async () => {
      const { data: stores } = await supabase.from('stores').select('name').order('name');
      if (stores) setOfficialStores(stores.map(s => s.name));

      const { data: campaigns } = await supabase.from('campaigns').select('name').order('name');
      if (campaigns) setActiveCampaigns(campaigns.map(c => c.name));
    };
    fetchMasterData();
  }, []);

  const handleAction = async (newStatus: 'approved' | 'rejected' | 'pending_admin') => {
    // Optional: Force user to pick a campaign if approving
    if (newStatus === 'approved' && !selectedCampaign) {
      alert("Please select a Campaign before approving.");
      return;
    }

    const { error } = await supabase
      .from('executions')
      .update({ 
        status: newStatus,
        store_name: newStatus === 'approved' ? mappedStore : execution.store_name, 
        campaign_name: newStatus === 'approved' ? selectedCampaign : execution.campaign_name,
        reviewed_at: newStatus === 'pending_admin' ? null : new Date().toISOString()
      })
      .eq('id', execution.id);

    if (!error) {
      onUpdate();
    } else {
      alert("Error updating record: " + error.message);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex mb-6">
      
      {/* Image Section */}
      <div className="w-[350px] bg-slate-100 flex-shrink-0 relative group">
        <img 
          src={execution.image_url} 
          alt="Execution" 
          className="w-full h-full object-cover cursor-zoom-in"
          onClick={() => window.open(execution.image_url, '_blank')}
        />
        {/* Overlay hint for expanding */}
        <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center justify-center">
            <span className="bg-slate-900/70 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm shadow-lg">Click to Expand</span>
        </div>
      </div>

      {/* Details Section */}
      <div className="flex-1 p-6 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Slack Submission</p>
              <p className="text-slate-700 italic font-medium leading-relaxed">
                &quot;{execution.raw_text || 'No caption provided'}&quot;
              </p>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              {new Date(execution.submission_date).toLocaleString()}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Mapped Store Input */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                Mapped Store
              </label>
              <input 
                type="text"
                placeholder="Search store name..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-600 disabled:font-semibold disabled:border-slate-100"
                value={isProcessed ? (execution.store_name || mappedStore) : mappedStore}
                onChange={(e) => setMappedStore(e.target.value)}
                list={`store-options-${execution.id}`} 
                disabled={isProcessed}
              />
              <datalist id={`store-options-${execution.id}`}>
                {officialStores.map((storeName, index) => (
                  <option key={index} value={storeName} />
                ))}
              </datalist>
            </div>

            {/* Campaign Dropdown */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                Assigned Campaign
              </label>
              {isProcessed ? (
                <div className="w-full border border-slate-100 bg-slate-50 rounded-lg px-3 py-2 text-sm text-slate-600 font-semibold truncate">
                  {execution.campaign_name || 'No Campaign Assigned'}
                </div>
              ) : (
                <select
                  value={selectedCampaign}
                  onChange={(e) => setSelectedCampaign(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="" disabled>Select a campaign...</option>
                  {activeCampaigns.map((campName, index) => (
                    <option key={index} value={campName}>{campName}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6 pt-6 border-t border-slate-100">
          {!isProcessed ? (
            <>
              <button 
                onClick={() => handleAction('approved')}
                className="flex-1 bg-green-50 text-green-700 font-bold py-2.5 px-4 rounded-lg border border-green-200 hover:bg-green-100 transition-colors flex items-center justify-center gap-2"
              >
                <span>✓</span> Approve & Tag
              </button>
              <button 
                onClick={() => handleAction('rejected')}
                className="w-32 bg-red-50 text-red-700 font-bold py-2.5 px-4 rounded-lg border border-red-200 hover:bg-red-100 transition-colors"
              >
                Reject
              </button>
            </>
          ) : (
            <button 
              onClick={() => handleAction('pending_admin')}
              className="flex-1 bg-slate-50 text-slate-600 font-bold py-2.5 px-4 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
            >
              <span className="text-lg leading-none">↺</span> Undo & Move to Queue
            </button>
          )}
        </div>
        
      </div>
    </div>
  );
}