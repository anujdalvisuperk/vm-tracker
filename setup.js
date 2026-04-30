fetch('https://slack.com/api/chat.postMessage', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer xoxb-975376712565-10505994485090-HfiiHy4pKM5X7rFunLcdfbuD' // <--- Paste your token here
  },
  body: JSON.stringify({
    channel: '#visual-merchandising-implementation',
    text: "📸 VM Command Center",
    blocks: [
      {
        "type": "header",
        "text": {
          "type": "plain_text",
          "text": "📸 VM Command Center"
        }
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "Welcome to the new submission portal. Please use the button below to upload your store execution photos for review."
        }
      },
      {
        "type": "actions",
        "elements": [
          {
            "type": "button",
            "text": {
              "type": "plain_text",
              "text": "➕ Submit Execution Photo",
              "emoji": true
            },
            "style": "primary",
            "action_id": "open_vm_submission_modal"
          }
        ]
      }
    ]
  })
})
.then(res => res.json())
.then(data => console.log(data))
.catch(err => console.error(err));