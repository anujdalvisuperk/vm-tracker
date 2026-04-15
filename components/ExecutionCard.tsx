'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const OFFICIAL_STORES = [
  "Lakshmi Supermarket Kalyanadhurgam",
  "Sidhout One Stop Store",
  "SuperK Chittoor 1",
  "SuperK Chittoor 2",
  "SuperK Tirupati Main"
];

export default function ExecutionCard({ execution, onUpdate }: { execution: any, onUpdate: () => void }) {
  const [mappedStore, setMappedStore] = useState(execution.extracted_store || '');
  
  const isProcessed = execution.status === 'approved' || execution.status === 'rejected';

  const handleAction = async (newStatus: 'approved' | 'rejected' | 'pending_admin') => {
    const { error } = await supabase
      .from('executions')
      .update({ 
        status: newStatus,
        store_name: newStatus === 'approved' ? mappedStore : execution.store_name, 
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
      
      {/* Exact Image Section from your screenshot */}
      <div className="w-[350px] bg-slate-100 flex-shrink-0">
        <img 
          src={execution.image_url} 
          alt="Execution" 
          className="w-full h-full object-cover cursor-zoom-in"
          onClick={() => window.open(execution.image_url, '_blank')}
        />
      </div>

      {/* Details Section */}
      <div className="flex-1 p-6 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Slack Submission</p>
              <p className="text-slate-700 italic">
                &quot;{execution.raw_text || 'No caption provided'}&quot;
              </p>
            </div>
            <p className="text-xs text-slate-400">
              {new Date(execution.submission_date).toLocaleString()}
            </p>
          </div>

          <div className="mb-4">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
              Mapped Store
            </label>
            
            {/* The input with the text-slate-900 fix so you can actually read it */}
            <input 
              type="text"
              placeholder="Search store name..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
              value={isProcessed ? (execution.store_name || mappedStore) : mappedStore}
              onChange={(e) => setMappedStore(e.target.value)}
              list={`store-options-${execution.id}`} 
              disabled={isProcessed}
            />
            <datalist id={`store-options-${execution.id}`}>
              {OFFICIAL_STORES.map((storeName, index) => (
                <option key={index} value={storeName} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Exact Buttons from your screenshot */}
        <div className="flex gap-3 mt-4">
          {!isProcessed ? (
            <>
              <button 
                onClick={() => handleAction('approved')}
                className="flex-1 bg-green-50 text-green-700 font-semibold py-2 px-4 rounded-lg border border-green-200 hover:bg-green-100"
              >
                Approve & Tag →
              </button>
              <button 
                onClick={() => handleAction('rejected')}
                className="flex-1 bg-red-50 text-red-700 font-semibold py-2 px-4 rounded-lg border border-red-200 hover:bg-red-100"
              >
                Reject
              </button>
            </>
          ) : (
            <button 
              onClick={() => handleAction('pending_admin')}
              className="flex-1 bg-slate-50 text-slate-600 font-semibold py-2 px-4 rounded-lg border border-slate-200 hover:bg-slate-100"
            >
              ↺ Undo & Move back to Pending
            </button>
          )}
        </div>
        
      </div>
    </div>
  );
}