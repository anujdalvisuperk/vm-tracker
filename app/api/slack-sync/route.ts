import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient'; // Adjust path if needed

// Stops Vercel from caching the URL
export const dynamic = 'force-dynamic'; 

export async function GET(req: Request) {
  try {
    const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
    const CHANNEL_ID = process.env.SLACK_CHANNEL_ID;

    if (!SLACK_BOT_TOKEN || !CHANNEL_ID) {
      return NextResponse.json({ success: false, error: "Missing Slack tokens." });
    }

    // Look back 7 days
    const oldestTimestamp = (Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60)).toString();
    const slackUrl = `https://slack.com/api/conversations.history?channel=${CHANNEL_ID}&limit=100&oldest=${oldestTimestamp}`;

    const slackRes = await fetch(slackUrl, {
      headers: {
        'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });

    const slackData = await slackRes.json();

    if (!slackData.ok) {
      return NextResponse.json({ success: false, error: slackData.error });
    }

    const messages = slackData.messages || [];
    let importedCount = 0;
    let errors: string[] = [];

    const extractStoreName = (text: string) => {
      if (!text) return "";
      return text.replace(/done|sir|for|store|superk|check|vm|execution|implementation/gi, "").replace(/[!.,]/g, "").trim();
    };

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];

      if (msg.files && msg.files.length > 0) {
        for (const file of msg.files) {
          if (file.mimetype?.startsWith('image/')) {
            
            const uniqueId = `${msg.ts}-${file.id}`;
            const { data: existing } = await supabase
              .from('executions')
              .select('id')
              .eq('slack_message_id', uniqueId)
              .single();

            if (!existing) {
              
              let finalCaption = msg.text || "";

              if (!finalCaption.trim() && messages[i + 1] && messages[i + 1].text) {
                finalCaption = messages[i + 1].text;
              }

              // --- THE MISSING PIECE: Download & Upload Image ---
              let finalImageUrl = "";
              try {
                // 1. Download from Slack
                const imageRes = await fetch(file.url_private, {
                  headers: { 'Authorization': `Bearer ${SLACK_BOT_TOKEN}` }
                });
                const imageBlob = await imageRes.blob();

                // 2. Upload to Supabase Storage
                const fileName = `${uniqueId}-${file.name || 'image.jpg'}`;
                const { error: uploadError } = await supabase.storage
                  .from('vm-images')
                  .upload(fileName, imageBlob, {
                    contentType: file.mimetype,
                    upsert: true
                  });

                if (uploadError) throw uploadError;

                // 3. Get the permanent Public URL
                const { data: publicUrlData } = supabase.storage
                  .from('vm-images')
                  .getPublicUrl(fileName);

                finalImageUrl = publicUrlData.publicUrl;
              } catch (imgError: any) {
                console.error("Storage Error:", imgError);
                errors.push(`Image upload failed for ${uniqueId}`);
                continue; // Skip saving to database if the image failed to upload
              }
              // --------------------------------------------------

              const { error } = await supabase.from('executions').insert([{
                slack_message_id: uniqueId,
                raw_text: finalCaption || "No caption found",
                extracted_store: extractStoreName(finalCaption),
                image_url: finalImageUrl, // Uses the public Supabase URL!
                status: 'pending_admin',
                submission_date: new Date(parseFloat(msg.ts) * 1000).toISOString(),
              }]);

              if (!error) {
                importedCount++;
              } else {
                errors.push(error.message);
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      count: importedCount, 
      scanned: messages.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}