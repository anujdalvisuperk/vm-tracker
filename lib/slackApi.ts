// lib/slackApi.ts

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;

export interface SlackMessage {
  type: string;
  user: string;
  text: string;
  ts: string;
  thread_ts?: string;
  reply_count?: number;
  files?: Array<{
    id: string;
    url_private: string;
    mimetype: string;
  }>;
}

/**
 * Clean up the raw Slack text to attempt to isolate the Store Name
 */
const extractStoreName = (text: string) => {
  if (!text || text.trim() === "" || text.toLowerCase().includes("pazo")) return "";
  
  return text
    .replace(/done|sir|for|store|superk|check|vm|execution|implementation/gi, "")
    .replace(/[!.,]/g, "") // Remove punctuation
    .replace(/\s+/g, " ")  // Remove extra spaces
    .trim();
};

/**
 * Fetch main channel messages
 */
async function fetchChannelHistory(cursor?: string) {
  let url = `https://slack.com/api/conversations.history?channel=${SLACK_CHANNEL_ID}&limit=100`;
  if (cursor) url += `&cursor=${cursor}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
  });

  const data = await response.json();
  if (!data.ok) throw new Error(`Slack API Error: ${data.error}`);

  return data;
}

/**
 * MAIN ENGINE
 */
export async function getLatestVMExecutions() {
  let allMessages: SlackMessage[] = [];
  let nextCursor: string | undefined = undefined;
  let hasMore = true;

  while (hasMore) {
    const data = await fetchChannelHistory(nextCursor);
    allMessages = allMessages.concat(data.messages);
    if (data.response_metadata?.next_cursor) {
      nextCursor = data.response_metadata.next_cursor;
    } else {
      hasMore = false;
    }
  }

  const processedExecutions = [];

  for (const msg of allMessages) {
    if (msg.files && msg.files.length > 0) {
      for (const file of msg.files) {
        if (file.mimetype?.startsWith('image/')) {
          
          // --- NEW CAPTION LOGIC ---
          let finalCaption = msg.text || "";

          // If current message is empty, but part of a thread/group, 
          // fetch the thread to find the first message with text.
          if ((!finalCaption || finalCaption.trim() === "") && msg.thread_ts) {
            const replies = await fetchThreadReplies(msg.thread_ts);
            // Find the first message in the thread that actually has text
            const textFound = replies.find(r => r.text && r.text.trim().length > 0);
            if (textFound) finalCaption = textFound.text;
          }
          // -------------------------

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