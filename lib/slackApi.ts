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

  // 1. Fetch historical messages (Loop handles pagination)
  while (hasMore) {
    const data = await fetchChannelHistory(nextCursor);
    allMessages = allMessages.concat(data.messages);
    
    if (data.response_metadata && data.response_metadata.next_cursor) {
      nextCursor = data.response_metadata.next_cursor;
    } else {
      hasMore = false;
    }
  }

  const processedExecutions = [];

  // 2. Process messages into individual records
  for (const msg of allMessages) {
    // Check if the message contains files (images)
    if (msg.files && msg.files.length > 0) {
      
      for (const file of msg.files) {
        // Only process actual images
        if (file.mimetype && typeof file.mimetype === 'string' && file.mimetype.startsWith('image/')) {
          
          // CAPTION LOGIC: Use the message text as the caption.
          // In Slack, if 3 photos are uploaded at once, msg.text contains the caption for all 3.
          const rawCaption = msg.text || "";

          processedExecutions.push({
            // Create a unique ID combining message timestamp and file ID
            slack_message_id: `${msg.ts}-${file.id}`, 
            slack_thread_ts: msg.thread_ts || null,
            raw_text: rawCaption || "No caption provided",
            extracted_store: extractStoreName(rawCaption),
            image_url: file.url_private,
            submission_date: new Date(parseFloat(msg.ts) * 1000).toISOString(),
          });
        }
      }
    }
  }

  return processedExecutions;
}