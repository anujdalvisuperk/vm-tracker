'use client';
import { useState } from 'react';

export default function ExecutionCard({ execution, onUpdate }: { execution: any, onUpdate: () => void }) {
  const [mappedStore, setMappedStore] = useState('');

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
              <p className="text-slate-700 italic">"{execution.raw_text || 'No caption provided'}"</p>
            </div>
            <p className="text-xs text-slate-400">
              {new Date(execution.submission_date).toLocaleString()}
            </p>
          </div>

          <div className="mb-4">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Mapped Store</label>
            <input 
              type="text"
              placeholder="Search store name..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={mappedStore}
              onChange={(e) => setMappedStore(e.target.value)}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button className="flex-1 bg-green-50 text-green-700 font-semibold py-2 px-4 rounded-lg border border-green-200 hover:bg-green-100 transition-colors">
            Approve & Tag →
          </button>
          <button className="flex-1 bg-red-50 text-red-700 font-semibold py-2 px-4 rounded-lg border border-red-200 hover:bg-red-100 transition-colors">
            Reject & Tag →
          </button>
        </div>
      </div>
    </div>
  );
}