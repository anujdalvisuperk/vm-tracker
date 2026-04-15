// app/api/slack-sync/route.ts
import { NextResponse } from 'next/server';
import { getLatestVMExecutions } from '../../../lib/slackApi';
import { supabase } from '../../../lib/supabaseClient';

export const dynamic = 'force-dynamic'; // Prevents Next.js from caching this route

export async function GET() {
  console.log('🚀 [1] Engine Started! Reaching out to Slack...');

  try {
    const executions = await getLatestVMExecutions();
    console.log(
      `✅ [2] Slack responded. Found ${executions?.length || 0} photos.`
    );

    if (!executions || executions.length === 0) {
      return NextResponse.json({ message: 'No new VM photos found in Slack.' });
    }

    let processedCount = 0;

    for (const exec of executions) {
      console.log(`⏳ [3] Processing message ID: ${exec.slack_message_id}`);

      const { data: existingRecord } = await supabase
        .from('executions')
        .select('id')
        .eq('slack_message_id', exec.slack_message_id)
        .single();

      if (existingRecord) {
        console.log(`⏭️ [4] Duplicate found. Skipping.`);
        continue;
      }

      console.log(`⬇️ [5] Downloading secure image from Slack...`);
      const imageResponse = await fetch(exec.image_url, {
        headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` },
      });
      const imageBuffer = await imageResponse.arrayBuffer();

      console.log(`☁️ [6] Uploading to Supabase Storage...`);
      const fileName = `${exec.slack_message_id}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('vm-images')
        .upload(fileName, imageBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        console.error('❌ Storage Upload Failed:', uploadError);
        continue;
      }

      const { data: publicUrlData } = supabase.storage
        .from('vm-images')
        .getPublicUrl(fileName);

      console.log(`💾 [7] Saving database record...`);
      const { error: dbError } = await supabase.from('executions').insert({
        slack_message_id: exec.slack_message_id,
        slack_thread_ts: exec.slack_thread_ts,
        image_url: publicUrlData.publicUrl,
        submission_date: exec.submission_date,
        status: 'pending_admin',
      });

      if (dbError) {
        console.error('❌ Database Insert Failed:', dbError);
      } else {
        processedCount++;
        console.log(`🎉 [8] Successfully saved execution!`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${processedCount} new executions!`,
    });
  } catch (error: any) {
    console.error('💥 CRITICAL ERROR:', error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
