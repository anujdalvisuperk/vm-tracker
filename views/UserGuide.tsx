'use client';

export default function UserGuide() {
  return (
    <div className="max-w-7xl w-full mx-auto animate-in fade-in duration-500 pb-20 px-4 md:px-8">
      
      {/* Header */}
      <div className="mb-12 border-b border-slate-200 pb-8">
        <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">System Manual</h2>
        <p className="text-slate-500 mt-3 font-medium text-lg">Detailed workflows, data requirements, and feature guides for the Command Center.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-12">
        
        {/* Navigation Sidebar */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <div className="sticky top-8 space-y-2 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-3">Quick Links</p>
             <a href="#setup" className="block text-sm font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50 p-3 rounded-xl transition-colors">1. Initial Setup & Roster</a>
             <a href="#import" className="block text-sm font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50 p-3 rounded-xl transition-colors">2. Importing Submissions</a>
             <a href="#review" className="block text-sm font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50 p-3 rounded-xl transition-colors">3. Admin Review Workflow</a>
             <a href="#recovery" className="block text-sm font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50 p-3 rounded-xl transition-colors">4. Data Recovery</a>
             <a href="#analytics" className="block text-sm font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50 p-3 rounded-xl transition-colors">5. Matrix & Leaderboard</a>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 space-y-12">
           
           {/* Section 1 */}
           <section id="setup" className="bg-white p-8 md:p-10 rounded-[2rem] border border-slate-100 shadow-sm scroll-mt-8">
             <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center font-black text-xl mb-6">1</div>
             <h3 className="text-3xl font-black text-slate-900 mb-4">Initial Configuration</h3>
             <p className="text-slate-600 mb-8 text-lg">Before the system can track payouts or calculate the leaderboard, you must configure the Master Settings in this exact order:</p>
             
             <div className="space-y-8">
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                  <h4 className="text-lg font-black text-slate-800 mb-2">A. Build the Roster (Personnel Tab)</h4>
                  <p className="text-sm text-slate-600 mb-4">Add your team members first so they can be assigned to stores. Ensure you assign the correct role (ASM, SAE, or Promoter).</p>
                  <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto">
                    <p className="text-xs text-slate-400 font-mono mb-2">// Personnel CSV Format (Upload in Personnel Tab)</p>
                    <code className="text-sm text-blue-400 font-mono whitespace-nowrap">Name, Role<br/>Anuj, SAE<br/>Udit, ASM</code>
                  </div>
                </div>
                
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                  <h4 className="text-lg font-black text-slate-800 mb-2">B. Add Stores & Mapping (Stores Tab)</h4>
                  <p className="text-sm text-slate-600 mb-4">Upload your store list, then use the "Map Roster" CSV to automatically link the Personnel you created in Step A to their respective stores.</p>
                  <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto">
                    <p className="text-xs text-slate-400 font-mono mb-2">// Mapping CSV Format (Upload in Stores Tab)</p>
                    <code className="text-sm text-blue-400 font-mono whitespace-nowrap">Store Name, ASM Name, Field Staff Name<br/>SuperK Nellore, Udit, Anuj</code>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                  <h4 className="text-lg font-black text-slate-800 mb-2">C. Define Campaigns</h4>
                  <p className="text-sm text-slate-600">Create campaigns with exact Start/End dates. The <strong className="text-slate-900">Campaign Name MUST exactly match</strong> the text used in Slack tags or PAZO descriptions. After creating, use the "Manage Setup" button to select which stores are required to execute it.</p>
                </div>
             </div>
           </section>

           {/* Section 2 */}
           <section id="import" className="bg-white p-8 md:p-10 rounded-[2rem] border border-slate-100 shadow-sm scroll-mt-8">
             <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl mb-6">2</div>
             <h3 className="text-3xl font-black text-slate-900 mb-4">Importing Executions</h3>
             <p className="text-slate-600 mb-6 text-lg">How to pull field data into the Command Center.</p>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="p-6 border border-slate-200 bg-slate-50 rounded-2xl">
                 <h4 className="font-black text-slate-800 mb-3 flex items-center gap-2"><span>⚡️</span> Slack Integration</h4>
                 <p className="text-sm text-slate-600">Select your Start and End dates in the Admin Queue and click "Pull Slack". The system prevents duplicate downloads, so you can safely pull the same date range multiple times.</p>
               </div>
               <div className="p-6 border border-slate-200 bg-slate-50 rounded-2xl">
                 <h4 className="font-black text-slate-800 mb-3 flex items-center gap-2"><span>📤</span> PAZO Import</h4>
                 <p className="text-sm text-slate-600 mb-4">Ensure your PAZO CSV export contains the exact columns: <code>Store Name, Submitted Date, Submitted Time, Image 1</code>.</p>
                 <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto">
                    <p className="text-xs text-slate-400 font-mono mb-2">// Auto-deduplication</p>
                    <code className="text-xs text-blue-400 font-mono">The tool generates deterministic IDs to prevent accidental duplicate uploads.</code>
                  </div>
               </div>
             </div>
           </section>

           {/* Section 3 */}
           <section id="review" className="bg-white p-8 md:p-10 rounded-[2rem] border border-slate-100 shadow-sm scroll-mt-8">
             <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center font-black text-xl mb-6">3</div>
             <h3 className="text-3xl font-black text-slate-900 mb-4">Admin Review Workflow</h3>
             <p className="text-slate-600 mb-8 text-lg">Reviewing photos in the queue determines the Payout Matrix and Leaderboard standings.</p>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               <div className="p-6 border-2 border-green-100 bg-green-50 rounded-2xl">
                 <h4 className="text-xl font-black text-green-700 mb-3">Approving</h4>
                 <p className="text-sm text-green-900 font-medium">Immediately logs the execution as successful for the specific calendar week it was submitted. Satisfies dependency requirements.</p>
               </div>
               <div className="p-6 border-2 border-red-100 bg-red-50 rounded-2xl">
                 <h4 className="text-xl font-black text-red-700 mb-3">Rejecting</h4>
                 <p className="text-sm text-red-900 font-medium">Requires selecting a reason from the dropdown. Logs execution as failed for that week. Field staff must re-upload a corrected photo before the week ends.</p>
               </div>
             </div>
           </section>

           {/* Section 4 */}
           <section id="recovery" className="bg-white p-8 md:p-10 rounded-[2rem] border border-slate-100 shadow-sm scroll-mt-8">
             <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center font-black text-xl mb-6">4</div>
             <h3 className="text-3xl font-black text-slate-900 mb-4">Data Recovery (Fixing Errors)</h3>
             <p className="text-slate-600 mb-6 text-lg">The Recovery tab automatically catches human error from the field.</p>
             <div className="space-y-4">
               <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                 <h4 className="text-lg font-black text-slate-800 mb-2">🚑 Orphans (Bad Mapping)</h4>
                 <p className="text-sm text-slate-600">Photos submitted with typos in the Store Name. Use the interface to select the correct store and campaign to push it back into the Matrix.</p>
               </div>
               <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                 <h4 className="text-lg font-black text-slate-800 mb-2">👻 Ghosts (Not Enrolled)</h4>
                 <p className="text-sm text-slate-600">Photos reviewed and approved, but the store is NOT formally enrolled in that campaign's roster. Click "Auto-Enroll All" to add them to the roster and guarantee their payout.</p>
               </div>
             </div>
           </section>

           {/* Section 5 */}
           <section id="analytics" className="bg-white p-8 md:p-10 rounded-[2rem] border border-slate-100 shadow-sm scroll-mt-8">
             <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center font-black text-xl mb-6">5</div>
             <h3 className="text-3xl font-black text-slate-900 mb-4">Matrix & Leaderboard</h3>
             <p className="text-slate-600 mb-6 text-lg">Understanding the public-facing dashboards.</p>
             
             <div className="space-y-6">
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                  <h4 className="text-lg font-black text-slate-800 mb-3">Public Access</h4>
                  <p className="text-sm text-slate-600">The Analytics Matrix and Field Leaderboard are strictly read-only but accessible to anyone. Field staff can click on status badges to view execution photos and rejection reasons without needing an admin password.</p>
                </div>

                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                  <h4 className="text-lg font-black text-slate-800 mb-3">The Weekly Matrix</h4>
                  <p className="text-sm text-slate-600 mb-4">Compliance is grouped into strict calendar weeks:</p>
                  <ul className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm font-bold text-slate-700">
                    <li className="bg-white p-3 rounded-lg border border-slate-200 text-center">W1: 1st - 7th</li>
                    <li className="bg-white p-3 rounded-lg border border-slate-200 text-center">W2: 8th - 14th</li>
                    <li className="bg-white p-3 rounded-lg border border-slate-200 text-center">W3: 15th - 21st</li>
                    <li className="bg-white p-3 rounded-lg border border-slate-200 text-center">W4: 22nd - End</li>
                  </ul>
                  <p className="text-xs text-slate-500 mt-4 bg-emerald-50 border border-emerald-100 p-3 rounded-lg">Note: Payouts are only calculated if an Approved photo exists within that specific date range AND all co-campaign dependencies are also approved.</p>
                </div>

                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                  <h4 className="text-lg font-black text-slate-800 mb-3">Leaderboard Logic</h4>
                  <p className="text-sm text-slate-600 mb-4">Scores are dynamically calculated based on the selected Time and Campaign filters.</p>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li><strong className="text-slate-900">By Submission:</strong> Ranks staff on whether they submitted <i>anything</i> (even if rejected). Formula: <code>Total Submissions / Expected Slots</code></li>
                    <li><strong className="text-slate-900">By Approval:</strong> Ranks staff on execution quality. Formula: <code>Total Approved / Expected Slots</code></li>
                  </ul>
                </div>
             </div>
           </section>

        </div>
      </div>
    </div>
  );
}