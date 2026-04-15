// lib/slackApi.ts

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;
const DAYS_TO_SYNC = 1; // <--- You can change this number (e.g., 2, 7, 30)

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
    .trim();
};

async function fetchChannelHistory(cursor?: string, oldest?: string) {
  let url = `https://slack.com/api/conversations.history?channel=${SLACK_CHANNEL_ID}&limit=100`;
  if (cursor) url += `&cursor=${cursor}`;
  if (oldest) url += `&oldest=${oldest}`; // Only fetch messages since X days ago

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
  });
  const data = await response.json();
  if (!data.ok) throw new Error(`Slack API Error: ${data.error}`);
  return data;
}

async function fetchThreadReplies(thread_ts: string) {
  const url = `https://slack.com/api/conversations.replies?channel=${SLACK_CHANNEL_ID}&ts=${thread_ts}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` } });
  const data = await response.json();
  return data.ok ? data.messages : [];
}

export async function getLatestVMExecutions() {
  let allMessages: SlackMessage[] = [];
  let nextCursor: string | undefined = undefined;
  let hasMore = true;

  // Calculate the timestamp for X days ago
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
        if (file.mimetype?.startsWith('image/')) {
          
          let finalCaption = msg.text || "";

          // --- SMART CAPTION FALLBACK ---
          // 1. If empty, check the Thread
          if (!finalCaption.trim() && msg.thread_ts) {
            const replies = await fetchThreadReplies(msg.thread_ts);
            const textFound = replies.find((r: any) => r.text && r.text.trim().length > 0);
            if (textFound) finalCaption = textFound.text;
          }

          // 2. If STILL empty, check the message immediately BEFORE this one (common in Slack)
          if (!finalCaption.trim() && allMessages[i + 1]) {
            const prevMsg = allMessages[i + 1];
            if (prevMsg.text && !prevMsg.files) { // Only take it if it's a text-only message
              finalCaption = prevMsg.text;
            }
          }

          processedExecutions.push({
            slack_message_id: `${msg.ts}-${file.id}`, 
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