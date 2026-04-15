// lib/slackApi.ts

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;

// Controls how far back the crawler looks to save database space
const DAYS_TO_SYNC = 1; 

export interface SlackMessage {
  type: string;
  user: string;
  text: string;
  ts: string;
  thread_ts?: string;
  files?: Array<{ id: string; url_private: string; mimetype: string; }>;
}

/**
 * Cleans up the raw Slack text to attempt to isolate the Store Name
 */
const extractStoreName = (text: string) => {
  if (!text || text.trim() === "" || text.toLowerCase().includes("pazo")) return "";
  return text
    .replace(/done|sir|for|store|superk|check|vm|execution|implementation/gi, "")
    .replace(/[!.,]/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

/**
 * Fetch main channel history with a time limit
 */
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

/**
 * Fetch replies inside a specific thread
 */
async function fetchThreadReplies(thread_ts: string) {
  const url = `https://slack.com/api/conversations.replies?channel=${SLACK_CHANNEL_ID}&ts=${thread_ts}`;
  const response = await fetch(url, { 
    headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` } 
  });
  const data = await response.json();
  return data.ok ? data.messages : [];
}

/**
 * MAIN CRAWLER ENGINE
 */
export async function getLatestVMExecutions() {
  let allMessages: SlackMessage[] = [];
  let nextCursor: string | undefined = undefined;
  let hasMore = true;

  // Calculate the UNIX timestamp for 7 days ago
  const oldestTimestamp = (Math.floor(Date.now() / 1000) - (DAYS_TO_SYNC * 24 * 60 * 60)).toString();

  // 1. Fetch all messages in the last 7 days
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

  // 2. Process messages into individual records
  for (let i = 0; i < allMessages.length; i++) {
    const msg = allMessages[i];

    // Check if the message contains files (images)
    if (msg.files && msg.files.length > 0) {
      for (const file of msg.files) {
        
        // Ensure it is actually an image
        if (file.mimetype && typeof file.mimetype === 'string' && file.mimetype.startsWith('image/')) {
          
          let finalCaption = msg.text || "";

          // --- SMART CAPTION FALLBACK LOGIC ---
          
          // Fallback A: If empty, check the Thread for replies
          if (!finalCaption.trim() && msg.thread_ts) {
            const replies = await fetchThreadReplies(msg.thread_ts);
            // Find the first reply that actually has text
            const textFound = replies.find((r: any) => r.text && r.text.trim().length > 0);
            if (textFound) finalCaption = textFound.text;
          }

          // Fallback B: If STILL empty, check the message immediately BEFORE this one
          // (Slack API returns messages in reverse chronological order, so [i + 1] is the older message)
          if (!finalCaption.trim() && allMessages[i + 1]) {
            const prevMsg = allMessages[i + 1];
            if (prevMsg.text && (!prevMsg.files || prevMsg.files.length === 0)) {
              finalCaption = prevMsg.text;
            }
          }

          // 3. Push to final array to be inserted into Database
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