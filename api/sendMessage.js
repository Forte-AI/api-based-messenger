import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Destructure required fields from the request body.
  const { message, room, nickname, email, phone_number } = req.body;
  if (!message || !room || !nickname || !email || !phone_number) {
    return res.status(400).json({ 
      error: 'Missing required fields: message, room, nickname, email, or phone_number' 
    });
  }

  const token = process.env.ASKHANDLE_API_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Server misconfiguration: missing API token' });
  }

  try {
    // Send the message to the AskHandle API, including email and phone_number.
    const postResponse = await fetch('https://dashboard.askhandle.com/api/v1/messages/', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        body: message,
        nickname: nickname,
        email: email,
        phone_number: phone_number,
        room: { uuid: room },
      }),
    });

    if (!postResponse.ok) {
      throw new Error(`Failed to send message: ${postResponse.statusText}`);
    }

    // Parse the initial response.
    let data = await postResponse.json();

    // Use the returned message UUID to poll for the AI answer.
    const messageUuid = data.uuid;
    const maxRetries = 10; // Reduced polling duration (e.g. up to 10 seconds)
    let retries = 0;

    // Poll the GET endpoint until support_answer is non-empty.
    while ((!data.support_answer || data.support_answer.trim() === "") && retries < maxRetries) {
      // Wait 1 second before polling again.
      await new Promise(resolve => setTimeout(resolve, 1000));
      const pollResponse = await fetch(
        `https://dashboard.askhandle.com/api/v1/messages/${messageUuid}/`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Token ${token}`,
          },
          cache: 'no-store'
        }
      );
      if (pollResponse.ok) {
        data = await pollResponse.json();
      }
      retries++;
    }

    if (!data.support_answer || data.support_answer.trim() === "") {
      // If no answer is available after polling, return a fallback message.
      return res.status(200).json({ support_answer: 'No response received.' });
    }

    // Return the final support_answer to the client.
    res.status(200).json({ support_answer: data.support_answer });
  } catch (error) {
    console.error('Error in sendMessage API:', error);
    res.status(500).json({ error: error.message });
  }
}
