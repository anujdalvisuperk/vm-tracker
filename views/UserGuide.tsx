'use client';

export default function UserGuide() {
  return (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-500 pb-12">
      <div className="mb-10">
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">System Manual</h2>
        <p className="text-slate-500 mt-2 font-medium text-lg">Detailed workflows and data requirements for managing the Command Center.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Navigation Sidebar */}
        <div className="md:col-span-1 space-y-2 sticky top-8 h-fit">
           <a href="#setup" className="block text-sm font-bold text-slate-500 hover:text-blue-600 hover:bg-blue-50 p-3 rounded-xl transition-colors">1. Initial Setup</a>
           <a href="#import" className="block text-sm font-bold text-slate-500 hover:text-blue-600 hover:bg-blue-50 p-3 rounded-xl transition-colors">2. Importing Data</a>
           <a href="#review" className="block text-sm font-bold text-slate-500 hover:text-blue-600 hover:bg-blue-50 p-3 rounded-xl transition-colors">3. Reviewing Executions</a>
           <a href="#recovery" className="block text-sm font-bold text-slate-500 hover:text-blue-600 hover:bg-blue-50 p-3 rounded-xl transition-colors">4. Data Recovery</a>
           <a href="#analytics" className="block text-sm font-bold text-slate-500 hover:text-blue-600 hover:bg-blue-50 p-3 rounded-xl transition-colors">5. Matrix Analytics</a>
        </div>

        {/* Content Body */}
        <div className="md:col-span-3 space-y-12">
           
           {/* Section 1 */}
           <section id="setup" className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
             <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-black text-lg mb-4">1</div>
             <h3 className="text-2xl font-black text-slate-900 mb-4">Initial Configuration</h3>
             <p className="text-slate-600 mb-6">Before the system can track payouts, you must configure the Master Settings in this exact order:</p>
             
             <div className="space-y-6">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <h4 className="font-bold text-slate-800 mb-2">A. Build the Roster (Personnel Tab)</h4>
                  <p className="text-sm text-slate-600 mb-2">Add your team members first so they can be assigned to stores.</p>
                  <code className="block bg-slate-800 text-slate-200 p-3 rounded-lg text-xs font-mono">CSV Headers: Name, Role<br/>Example Row: Anuj, SAE</code>
                </div>
                
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <h4 className="font-bold text-slate-800 mb-2">B. Add Stores & Mapping (Stores Tab)</h4>
                  <p className="text-sm text-slate-600 mb-2">Upload your store list, then use the "Map Roster" CSV to automatically link the Personnel you created in Step A.</p>
                  <code className="block bg-slate-800 text-slate-200 p-3 rounded-lg text-xs font-mono">Store List CSV Header: Store Name<br/><br/>Mapping CSV Headers: Store Name, ASM Name, Field Staff Name<br/>Example Row: SuperK Nellore, Neeraj, Anuj</code>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <h4 className="font-bold text-slate-800 mb-2">C. Define Campaigns</h4>
                  <p className="text-sm text-slate-600">Create campaigns with exact Start/End dates. The <b>Campaign Name MUST exactly match</b> the text used in Slack tags or PAZO descriptions. Make sure to assign specific stores to the campaign roster via the "Manage Setup" button.</p>
                </div>
             </div>
           </section>

           {/* Section 2 */}
           <section id="import" className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
             <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center font-black text-lg mb-4">2</div>
             <h3 className="text-2xl font-black text-slate-900 mb-4">Importing Executions</h3>
             <p className="text-slate-600 mb-6">How to get field data into the Command Center.</p>
             <ul className="space-y-4 text-sm text-slate-600 list-disc pl-5">
               <li><b>Slack Integration (Admin Queue):</b> Select your Start and End dates and click "Pull Slack". The system prevents duplicate downloads, so you can safely pull the same date range multiple times.</li>
               <li><b>PAZO Import:</b> Ensure your PAZO CSV export contains the specific columns: <code>Store Name, Submitted Date, Submitted Time, Image 1</code>. The tool will generate deterministic IDs to prevent accidental duplicate uploads.</li>
             </ul>
           </section>

           {/* Section 3 */}
           <section id="review" className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
             <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center font-black text-lg mb-4">3</div>
             <h3 className="text-2xl font-black text-slate-900 mb-4">Admin Review Workflow</h3>
             <p className="text-slate-600 mb-6">Reviewing photos in the queue dictates your payout Matrix.</p>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="p-5 border-2 border-green-100 bg-green-50 rounded-2xl">
                 <h4 className="font-black text-green-700 mb-2">Approving</h4>
                 <p className="text-xs text-green-800">Immediately logs the execution as successful for the specific calendar week it was submitted. Satisfies dependency requirements.</p>
               </div>
               <div className="p-5 border-2 border-red-100 bg-red-50 rounded-2xl">
                 <h4 className="font-black text-red-700 mb-2">Rejecting</h4>
                 <p className="text-xs text-red-800">Requires selecting a reason. Logs execution as failed for that week. Field staff must re-upload a fixed photo before the week ends.</p>
               </div>
             </div>
           </section>

           {/* Section 4 */}
           <section id="recovery" className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
             <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center font-black text-lg mb-4">4</div>
             <h3 className="text-2xl font-black text-slate-900 mb-4">Data Recovery (Fixing Errors)</h3>
             <p className="text-slate-600 mb-4">The Recovery tab automatically catches human error from the field.</p>
             <ul className="space-y-4 text-sm text-slate-600">
               <li className="p-4 bg-slate-50 rounded-xl border border-slate-100"><b>Orphans:</b> Photos submitted with typos in the Store Name. Use the interface to select the correct store and campaign to push it back into the queue.</li>
               <li className="p-4 bg-slate-50 rounded-xl border border-slate-100"><b>Ghosts:</b> Photos reviewed and approved, but the store is NOT formally enrolled in that campaign's roster. Click "Auto-Enroll All" to add them to the roster and guarantee their payout.</li>
             </ul>
           </section>

           {/* Section 5 */}
           <section id="analytics" className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
             <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center font-black text-lg mb-4">5</div>
             <h3 className="text-2xl font-black text-slate-900 mb-4">Understanding the Matrix</h3>
             <p className="text-slate-600 mb-4">The Analytics Matrix calculates compliance based on calendar weeks:</p>
             <ul className="text-sm text-slate-600 space-y-2 list-inside list-disc">
               <li><b>W1:</b> 1st to 7th of the month</li>
               <li><b>W2:</b> 8th to 14th</li>
               <li><b>W3:</b> 15th to 21st</li>
               <li><b>W4:</b> 22nd to end of month</li>
             </ul>
             <p className="text-sm text-slate-600 mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl italic">Note: Payouts are only calculated if an Approved photo exists within that specific date range AND all co-campaign dependencies are also approved for that same week.</p>
           </section>

        </div>
      </div>
    </div>
  );
}