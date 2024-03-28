const channels = {
  '#cyclebar': 'https://hooks.slack.com/services/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'
}

const sendMessage = async ({ message, channel }) => {
  await fetch(channels[channel], {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text: message })
  });
}

module.exports = { sendMessage };
