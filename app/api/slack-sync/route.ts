import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient'; 

export async function POST(req: Request) {
  try {
    const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
    const CHANNEL_ID = process.env.SLACK_CHANNEL_ID;

    if (!SLACK_BOT_TOKEN || !CHANNEL_ID) {
      return NextResponse.json({ success: false, error: "Missing Slack tokens." });
    }

    const body = await req.json();
    const { startDate, endDate } = body;

    let slackUrl = `https://slack.com/api/conversations.history?channel=${CHANNEL_ID}&limit=100`;

    // Apply Date Filters (Fallback to 7 days if none provided)
    if (startDate) {
      slackUrl += `&oldest=${(new Date(startDate).getTime() / 1000).toString()}`;
    } else {
      const sevenDaysAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
      slackUrl += `&oldest=${sevenDaysAgo}`;
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      slackUrl += `&latest=${(end.getTime() / 1000).toString()}`;
    }

    const slackRes = await fetch(slackUrl, {
      headers: { 'Authorization': `Bearer ${SLACK_BOT_TOKEN}` },
      cache: 'no-store'
    });

    const slackData = await slackRes.json();
    if (!slackData.ok) return NextResponse.json({ success: false, error: slackData.error });

    const messages = slackData.messages || [];
    let importedCount = 0;

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
            const { data: existing } = await supabase.from('executions').select('id').eq('slack_message_id', uniqueId).single();

            if (!existing) {
              let finalCaption = msg.text || "";
              if (!finalCaption.trim() && messages[i + 1] && messages[i + 1].text) finalCaption = messages[i + 1].text;

              let finalImageUrl = file.url_private; // Fallback
              try {
                const imageRes = await fetch(file.url_private, { headers: { 'Authorization': `Bearer ${SLACK_BOT_TOKEN}` }});
                const imageBlob = await imageRes.blob();
                const fileName = `${uniqueId}-${file.name || 'image.jpg'}`;
                const { error: uploadError } = await supabase.storage.from('vm-images').upload(fileName, imageBlob, { contentType: file.mimetype });
                if (!uploadError) {
                  const { data } = supabase.storage.from('vm-images').getPublicUrl(fileName);
                  finalImageUrl = data.publicUrl;
                }
              } catch (e) { console.error("Upload error", e); }

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
    return NextResponse.json({ success: true, count: importedCount });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}