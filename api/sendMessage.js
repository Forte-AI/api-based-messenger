import fetch from 'node-fetch';

// Helper function to fetch with retry logic.
async function fetchWithRetry(url, options, retries, delay) {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      } else {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      attempt++;
      if (attempt > retries) {
        throw error;
      }
      // Wait for a specified delay before retrying.
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

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
    // POST: Retry up to 3 times with a 1-second delay if the call fails.
    const postResponse = await fetchWithRetry(
      'https://dashboard.askhandle.com/api/v1/messages/',
      {
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
      },
      3, // maximum number of retries for POST
      1000 // delay in milliseconds between POST retries
    );

    // Parse the initial response.
    let data = await postResponse.json();

    // Use the returned message UUID to poll for the AI answer.
    const messageUuid = data.uuid;
    const maxRetries = 10; // total polling iterations
    let retries = 0;

    // Poll the GET endpoint until support_answer is non-empty.
    while ((!data.support_answer || data.support_answer.trim() === "") && retries < maxRetries) {
      // Wait 1.5 seconds before each poll.
      await new Promise(resolve => setTimeout(resolve, 1500));
      try {
        // GET: Use fetchWithRetry to retry GET calls up to 2 times with a 1-second delay.
        const pollResponse = await fetchWithRetry(
          `https://dashboard.askhandle.com/api/v1/messages/${messageUuid}/`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Token ${token}`,
            },
            cache: 'no-store'
          },
          2, // maximum retries for each GET poll
          1000 // delay between GET retries
        );
        data = await pollResponse.json();
      } catch (error) {
        console.error(`Polling GET failed on attempt ${retries}:`, error);
      }
      retries++;
    }

    if (!data.support_answer || data.support_answer.trim() === "") {
      // Fallback if no answer is available after polling.
      return res.status(200).json({ support_answer: 'No response received.' });
    }

    // Return the final support_answer to the client.
    res.status(200).json({ support_answer: data.support_answer });
  } catch (error) {
    console.error('Error in sendMessage API:', error);
    res.status(500).json({ error: error.message });
  }
}
