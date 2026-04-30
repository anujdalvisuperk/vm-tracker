import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  // Slack sends data as URL-encoded form data, so we have to parse it
  console.log("🚨 SLACK BUTTON WAS CLICKED!");
  const body = await req.text();
  const params = new URLSearchParams(body);
  const payloadString = params.get('payload');

  if (!payloadString) {
    return NextResponse.json({ error: 'No payload found' }, { status: 400 });
  }

  const payload = JSON.parse(payloadString);

  // 1. Catch the Button Click
  if (payload.type === 'block_actions' && payload.actions[0].action_id === 'open_vm_submission_modal') {
    const triggerId = payload.trigger_id;

    // 2. Fire back the Modal UI
    await fetch('https://slack.com/api/views.open', {
      method: 'POST',
      
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}` 
      },
      body: JSON.stringify({
        trigger_id: triggerId,
        view: {
          type: "modal",
          callback_id: "vm_modal_submit",
          title: { type: "plain_text", "text": "New VM Submission" },
          submit: { type: "plain_text", "text": "Submit" },
          close: { type: "plain_text", "text": "Cancel" },
          blocks: [
            {
              type: "input",
              block_id: "store_block",
              element: {
                type: "plain_text_input",
                action_id: "store_input",
                placeholder: { type: "plain_text", "text": "e.g., SuperK Nellore" }
              },
              label: { type: "plain_text", "text": "Store Name" }
            },
            {
              type: "input",
              block_id: "campaign_block",
              element: {
                type: "static_select",
                action_id: "campaign_select",
                placeholder: { type: "plain_text", "text": "Select Campaign" },
                options: [
                  { text: { type: "plain_text", "text": "Surf Excel" }, value: "Surf Excel" },
                  { text: { type: "plain_text", "text": "BOGO" }, value: "BOGO" }
                ]
              },
              label: { type: "plain_text", "text": "Campaign" }
            },
            {
              type: "input",
              block_id: "photo_block",
              element: {
                type: "file_input",
                action_id: "photo_upload",
                filetypes: ["jpg", "jpeg", "png"],
                max_files: 1
              },
              label: { type: "plain_text", "text": "Execution Photo" }
            }
          ]
        }
      })
    });
  }

  // Slack requires a 200 OK response within 3 seconds
  return NextResponse.json({ ok: true });
}