// lib/slackApi.ts

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;
const DAYS_TO_SYNC = 7; 

export interface SlackMessage {
  type: string;
  user: string;
  text?: string;
  ts: string;
  thread_ts?: string;
  blocks?: any[];
  attachments?: any[];
  files?: Array<{ id: string; url_private: string; mimetype: string; title?: string; initial_comment?: any }>;
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

// Deep text extraction function
function getDeepText(msg: SlackMessage): string {
  let foundText = "";
  if (msg.text) foundText += msg.text + " ";
  
  if (msg.blocks) {
    msg.blocks.forEach((block: any) => {
      if (block.text && block.text.text) foundText += block.text.text + " ";
    });
  }
  
  if (msg.attachments) {
    msg.attachments.forEach((att: any) => {
      if (att.text) foundText += att.text + " ";
      if (att.fallback) foundText += att.fallback + " ";
    });
  }
  return foundText.trim();
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
          
          let finalCaption = getDeepText(msg);

          // Check file object itself
          if (!finalCaption) {
            if (file.title && !file.title.toLowerCase().includes('image') && !file.title.toLowerCase().includes('.jpg')) {
              finalCaption = file.title;
            } else if (file.initial_comment && file.initial_comment.comment) {
              finalCaption = file.initial_comment.comment;
            }
          }

          // Check previous message (older message)
          if (!finalCaption && allMessages[i + 1]) {
            const prevMsg = allMessages[i + 1];
            if (!prevMsg.files || prevMsg.files.length === 0) {
              finalCaption = getDeepText(prevMsg);
            }
          }

          // X-RAY FALLBACK: If absolutely empty, dump the Slack JSON so you can see it
          if (!finalCaption) {
            finalCaption = "DEBUG JSON: " + JSON.stringify({
              text: msg.text,
              blocks: !!msg.blocks,
              attachments: !!msg.attachments,
              file_title: file.title
            });
          }

          processedExecutions.push({
            slack_message_id: `${msg.ts}-${file.id}`, 
            slack_thread_ts: msg.thread_ts || null, 
            raw_text: finalCaption,
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