'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient'; // Ensure this path matches your project structure

// Your official master list of stores. 
// You can copy/paste your full list of stores right here.
const OFFICIAL_STORES = [
  "Lakshmi Supermarket Kalyanadhurgam",
  "Sidhout One Stop Store",
  "SuperK Chittoor 1",
  "SuperK Chittoor 2",
  "SuperK Tirupati Main"
];

export default function ExecutionCard({ execution, onUpdate }: { execution: any, onUpdate: () => void }) {
  // Pre-fill the input with the extracted name from the Slack engine
  const [mappedStore, setMappedStore] = useState(execution.extracted_store || '');

  // Saves the final decision to Supabase
  const handleAction = async (newStatus: 'approved' | 'rejected') => {
    const { error } = await supabase
      .from('executions')
      .update({ 
        status: newStatus,
        store_name: mappedStore, // Saves whatever is currently in the input box
        reviewed_at: new Date().toISOString()
      })
      .eq('id', execution.id);

    if (!error) {
      onUpdate(); // Refreshes the queue so this card disappears
    } else {
      alert("Error updating record: " + error.message);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex mb-6">
      
      {/* Image Section */}
      <div className="w-1/3 bg-slate-100 flex items-center justify-center border-r border-slate-100">
        <img 
          src={execution.image_url} 
          alt="Execution" 
          className="object-contain h-64 w-full cursor-zoom-in"
          onClick={() => window.open(execution.image_url, '_blank')}
        />
      </div>

      {/* Details Section */}
      <div className="w-2/3 p-6 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Slack Submission</p>
              <p className="text-slate-700 italic">
                &quot;{execution.raw_text || 'No caption provided'}&quot;
              </p>
            </div>
            <p className="text-xs text-slate-400">
              {new Date(execution.submission_date).toLocaleString()}
            </p>
          </div>

          {/* Mapped Store Input & Dropdown */}
          <div className="mb-4">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
              Mapped Store
            </label>
            <input 
              type="text"
              placeholder="Search official store name..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={mappedStore}
              onChange={(e) => setMappedStore(e.target.value)}
              list={`store-options-${execution.id}`} 
            />
            
            {/* The hidden datalist that powers the searchable dropdown */}
            <datalist id={`store-options-${execution.id}`}>
              {OFFICIAL_STORES.map((storeName, index) => (
                <option key={index} value={storeName} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button 
            onClick={() => handleAction('approved')}
            className="flex-1 bg-green-50 text-green-700 font-semibold py-2 px-4 rounded-lg border border-green-200 hover:bg-green-100 transition-colors"
          >
            Approve & Tag →
          </button>
          <button 
            onClick={() => handleAction('rejected')}
            className="flex-1 bg-red-50 text-red-700 font-semibold py-2 px-4 rounded-lg border border-red-200 hover:bg-red-100 transition-colors"
          >
            Reject
          </button>
        </div>
        
      </div>
    </div>
  );
}