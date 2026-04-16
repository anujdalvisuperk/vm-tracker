import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient'; 

export async function POST(req: Request) {
  try {
    const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
    const CHANNEL_ID = process.env.SLACK_CHANNEL_ID;

    if (!SLACK_BOT_TOKEN || !CHANNEL_ID) {
      return NextResponse.json({ success: false, error: "Missing Slack tokens in environment variables." });
    }

    const body = await req.json();
    const { startDate, endDate } = body;

    // Base URL without the cursor
    let baseUrl = `https://slack.com/api/conversations.history?channel=${CHANNEL_ID}&limit=100`;

    // Apply Date Filters
    if (startDate) {
      baseUrl += `&oldest=${(new Date(startDate).getTime() / 1000).toString()}`;
    } else {
      // Fallback to 7 days if none provided to prevent massive accidental pulls
      const sevenDaysAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
      baseUrl += `&oldest=${sevenDaysAgo}`;
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      baseUrl += `&latest=${(end.getTime() / 1000).toString()}`;
    }

    // --- PAGINATION STATE ---
    let hasMore = true;
    let nextCursor = '';
    let importedCount = 0;
    let pageCount = 0;
    
    // Vercel Safeguard: Prevent the serverless function from timing out.
    // 10 pages * 100 messages = 1,000 messages evaluated per click.
    const MAX_PAGES = 10; 

    // Basic text cleaner for initial store guess
    const extractStoreName = (text: string) => {
      if (!text) return "";
      return text.replace(/done|sir|for|store|superk|check|vm|execution|implementation/gi, "").replace(/[!.,]/g, "").trim();
    };

    // --- THE CURSOR LOOP ---
    while (hasMore && pageCount < MAX_PAGES) {
      pageCount++;
      
      let fetchUrl = baseUrl;
      if (nextCursor) {
        fetchUrl += `&cursor=${encodeURIComponent(nextCursor)}`;
      }

      const slackRes = await fetch(fetchUrl, {
        headers: { 'Authorization': `Bearer ${SLACK_BOT_TOKEN}` },
        cache: 'no-store'
      });

      const slackData = await slackRes.json();
      
      if (!slackData.ok) {
        console.error("Slack API Error:", slackData.error);
        return NextResponse.json({ success: false, error: slackData.error, importedCount });
      }

      const messages = slackData.messages || [];

      // Process the batch of 100 messages
      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        
        if (msg.files && msg.files.length > 0) {
          for (const file of msg.files) {
            if (file.mimetype?.startsWith('image/')) {
              const uniqueId = `${msg.ts}-${file.id}`;
              
              // 1. Check if we already processed this exact image in a previous sync
              const { data: existing } = await supabase.from('executions').select('id').eq('slack_message_id', uniqueId).single();

              if (!existing) {
                let finalCaption = msg.text || "";
                
                // Sometimes store partners send the photo, and the text in the *next* message
                if (!finalCaption.trim() && messages[i + 1] && !messages[i+1].files) {
                    finalCaption = messages[i + 1].text;
                }

                let finalImageUrl = file.url_private; 
                
                // 2. Download from Slack and upload to Supabase Storage for permanent hosting
                try {
                  const imageRes = await fetch(file.url_private, { 
                    headers: { 'Authorization': `Bearer ${SLACK_BOT_TOKEN}` }
                  });
                  
                  // VALIDATION 1: Did Slack actually approve the download?
                  if (!imageRes.ok) {
                    throw new Error(`Slack refused download. Status: ${imageRes.status}`);
                  }

                  const contentType = imageRes.headers.get('content-type') || file.mimetype;
                  
                  // VALIDATION 2: Did Slack send an image, or an error page?
                  if (!contentType.startsWith('image/')) {
                    throw new Error(`Slack returned non-image content: ${contentType}`);
                  }

                  const imageBlob = await imageRes.blob();
                  
                  // VALIDATION 3: Sanitize the file name to prevent URL breaking
                  const safeFileName = `${uniqueId}-${file.name || 'image'}`.replace(/[^a-zA-Z0-9.\-_]/g, '_');
                  
                  const { error: uploadError } = await supabase.storage
                    .from('vm-images')
                    .upload(safeFileName, imageBlob, { 
                      contentType: contentType,
                      upsert: true // Overwrite if it somehow already exists
                    });
                  
                  if (!uploadError) {
                    const { data } = supabase.storage.from('vm-images').getPublicUrl(safeFileName);
                    finalImageUrl = data.publicUrl;
                  } else {
                    console.error("Supabase Storage Error:", uploadError.message);
                  }
                } catch (e: any) { 
                    console.error("Image Processing Error:", e.message); 
                    // If it fails, finalImageUrl falls back to the private Slack URL
                }

                // 3. Insert into Database
                const { error } = await supabase.from('executions').insert([{
                  slack_message_id: uniqueId,
                  raw_text: finalCaption || "No caption found",
                  extracted_store: extractStoreName(finalCaption),
                  image_url: finalImageUrl,
                  status: 'pending_admin',
                  submission_date: new Date(parseFloat(msg.ts) * 1000).toISOString(),
                }]);
                
                if (!error) importedCount++;
              }
            }
          }
        }
      }

      // Check if Slack has more pages to give us
      if (slackData.has_more && slackData.response_metadata && slackData.response_metadata.next_cursor) {
        nextCursor = slackData.response_metadata.next_cursor;
      } else {
        hasMore = false; // We hit the end of the history for this date range!
      }
    }

    return NextResponse.json({ 
      success: true, 
      count: importedCount, 
      pagesProcessed: pageCount,
      hitPageLimit: hasMore // Let the frontend know if we stopped early due to the MAX_PAGES safeguard
    });
    
  } catch (error: any) {
    console.error("Slack Sync Catch Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}