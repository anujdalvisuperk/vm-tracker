// lib/slackApi.ts

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;
const DAYS_TO_SYNC = 2; 

export interface SlackMessage {
  type: string;
  user: string;
  text: string;
  ts: string;
  thread_ts?: string;
  files?: Array<{ id: string; url_private: string; mimetype: string; }>;
}

const extractStoreName = (text: string) => {
  if (!text || text.trim() === "" || text.toLowerCase().includes("pazo")) return "";
  return text
    .replace(/done|sir|for|store|superk|check|vm|execution|implementation/gi, "")
    .replace(/[!.,]/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

async function fetchChannelHistory(cursor?: string, oldest?: string) {
  let url = `https://slack.com/api/conversations.history?channel=${SLACK_CHANNEL_ID}&limit=100`;
  if (cursor) url += `&cursor=${cursor}`;
  if (oldest) url += `&oldest=${oldest}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
  });
  const data = await response.json();
  if (!data.ok) throw new Error(`Slack API Error: ${data.error}`);
  return data;
}

async function fetchThreadReplies(thread_ts: string) {
  const url = `https://slack.com/api/conversations.replies?channel=${SLACK_CHANNEL_ID}&ts=${thread_ts}`;
  const response = await fetch(url, { 
    headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` } 
  });
  const data = await response.json();
  return data.ok ? data.messages : [];
}

export async function getLatestVMExecutions() {
  let allMessages: SlackMessage[] = [];
  let nextCursor: string | undefined = undefined;
  let hasMore = true;

  const oldestTimestamp = (Math.floor(Date.now() / 1000) - (DAYS_TO_SYNC * 24 * 60 * 60)).toString();

  while (hasMore) {
    const data = await fetchChannelHistory(nextCursor, oldestTimestamp);
    allMessages = allMessages.concat(data.messages);
    if (data.response_metadata?.next_cursor) {
      nextCursor = data.response_metadata.next_cursor;
    } else {
      hasMore = false;
    }
  }

  const processedExecutions = [];

  for (let i = 0; i < allMessages.length; i++) {
    const msg = allMessages[i];

    if (msg.files && msg.files.length > 0) {
      for (const file of msg.files) {
        
        if (file.mimetype && typeof file.mimetype === 'string' && file.mimetype.startsWith('image/')) {
          
          // --- THE ULTIMATE CAPTION VACUUM ---
          let finalCaption = msg.text || "";

          // 1. Did Slack hide it inside the file object itself? (Common for mobile uploads)
          if (!finalCaption.trim()) {
            const fileTitle = (file as any).title || "";
            const fileComment = (file as any).initial_comment?.comment || "";
            
            // Only use the file title if it's not an auto-generated garbage name like "IMG_1234.JPG"
            if (fileTitle && !fileTitle.toLowerCase().includes('image') && !fileTitle.toLowerCase().includes('.jpg')) {
              finalCaption = fileTitle;
            } else if (fileComment) {
              finalCaption = fileComment;
            }
          }

          // 2. Is it a reply in a thread?
          if (!finalCaption.trim() && msg.thread_ts) {
            const replies = await fetchThreadReplies(msg.thread_ts);
            const textFound = replies.find((r: any) => r.text && r.text.trim().length > 0);
            if (textFound) finalCaption = textFound.text;
          }

          // 3. Did they type text IMMEDIATELY BEFORE uploading the photo? (Older message)
          // Slack returns newest first, so [i + 1] is older.
          if (!finalCaption.trim() && allMessages[i + 1]) {
            const prevMsg = allMessages[i + 1];
            if (prevMsg.text && (!prevMsg.files || prevMsg.files.length === 0)) {
              finalCaption = prevMsg.text;
            }
          }

          // 4. Did they type text IMMEDIATELY AFTER uploading the photo? (Newer message)
          // [i - 1] is the newer message.
          if (!finalCaption.trim() && i > 0 && allMessages[i - 1]) {
            const nextMsg = allMessages[i - 1];
            if (nextMsg.text && (!nextMsg.files || nextMsg.files.length === 0)) {
              finalCaption = nextMsg.text;
            }
          }
          // ------------------------------------

          processedExecutions.push({
            slack_message_id: `${msg.ts}-${file.id}`, 
            slack_thread_ts: msg.thread_ts || null, 
            raw_text: finalCaption || "No caption found",
            extracted_store: extractStoreName(finalCaption),
            image_url: file.url_private,
            submission_date: new Date(parseFloat(msg.ts) * 1000).toISOString(),
          });
        }
      }
    }
  }
  return processedExecutions;
}