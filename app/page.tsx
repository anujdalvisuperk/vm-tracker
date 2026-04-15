'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import ExecutionCard from '../components/ExecutionCard';

export default function QueuePage() {
  const [executions, setExecutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQueue = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('executions')
      .select('*')
      .eq('status', 'pending_admin')
      .order('submission_date', { ascending: false });
    
    setExecutions(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Pending Approvals</h1>
            <p className="text-slate-500">Review and map store executions from Slack</p>
          </div>
          <button 
            onClick={fetchQueue}
            className="bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50"
          >
            🔄 Refresh Queue
          </button>
        </header>

        {loading ? (
          <div className="text-center py-20 text-slate-400">Loading your queue...</div>
        ) : executions.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300 text-slate-400">
            Inbox Zero! No pending executions found.
          </div>
        ) : (
          <div>
            {executions.map(exec => (
              <ExecutionCard key={exec.id} execution={exec} onUpdate={fetchQueue} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}