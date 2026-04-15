// lib/slackApi.ts

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;

// Define what a Slack message looks like for TypeScript
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
 * Helper 1: Fetch main channel messages (with pagination)
 */
async function fetchChannelHistory(cursor?: string, oldest?: string) {
  let url = `https://slack.com/api/conversations.history?channel=${SLACK_CHANNEL_ID}&limit=1000`;

  if (cursor) url += `&cursor=${cursor}`;
  if (oldest) url += `&oldest=${oldest}`; // Used to only fetch new messages since last sync

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
  });

  const data = await response.json();
  if (!data.ok) throw new Error(`Slack API Error: ${data.error}`);

  return data;
}

/**
 * Helper 2: Fetch replies inside a specific thread
 */
async function fetchThreadReplies(thread_ts: string) {
  const url = `https://slack.com/api/conversations.replies?channel=${SLACK_CHANNEL_ID}&ts=${thread_ts}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
  });

  const data = await response.json();
  if (!data.ok) return [];

  // Return all messages in the thread
  return data.messages as SlackMessage[];
}

/**
 * MAIN ENGINE: Orchestrates the fetch, thread checking, and image extraction
 */
export async function getLatestVMExecutions(lastSyncTimestamp?: string) {
  let allMessages: SlackMessage[] = [];
  let nextCursor: string | undefined = undefined;
  let hasMore = true;

  // 1. Pagination Loop: Keep fetching until Slack says there are no more messages
  while (hasMore) {
    const data = await fetchChannelHistory(nextCursor, lastSyncTimestamp);
    allMessages = allMessages.concat(data.messages);

    if (data.response_metadata && data.response_metadata.next_cursor) {
      nextCursor = data.response_metadata.next_cursor;
    } else {
      hasMore = false;
    }
  }

  const processedExecutions = [];

  // 2. Process each message to find images and handle threads
  for (const msg of allMessages) {
    let finalMessageToUse = msg;

    // Check if this message has a thread (replies)
    if (msg.thread_ts && msg.reply_count && msg.reply_count > 0) {
      const threadMessages = await fetchThreadReplies(msg.thread_ts);

      // Look for the LAST message in the thread that contains an image attachment
      const repliesWithImages = threadMessages.filter(
        (reply) => reply.files && reply.files.length > 0
      );

      if (repliesWithImages.length > 0) {
        // Override the main message with the corrected reply from the store partner
        finalMessageToUse = repliesWithImages[repliesWithImages.length - 1];
      }
    }

    // 3. Extract the data if an image exists
    if (finalMessageToUse.files && finalMessageToUse.files.length > 0) {
      // Find the first valid image file (jpeg/png)
      const imageFile = finalMessageToUse.files.find((f) =>
        f.mimetype.startsWith('image/')
      );

      if (imageFile) {
        processedExecutions.push({
          slack_message_id: finalMessageToUse.ts, // Unique ID
          slack_thread_ts: msg.thread_ts || null, // Keep track if it was a thread
          raw_text: msg.text, // The store name they typed
          image_url: imageFile.url_private, // The secure Slack image URL
          submission_date: new Date(
            parseFloat(finalMessageToUse.ts) * 1000
          ).toISOString(),
        });
      }
    }
  }

  return processedExecutions;
}
