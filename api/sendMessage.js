import fetch from 'node-fetch';

// Helper function that retries a fetch call up to a maximum number of times.
async function fetchWithRetry(url, options, maxRetries, delayMs) {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      } else {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      attempt++;
      if (attempt > maxRetries) {
        throw error;
      }
      // Wait for the specified delay before retrying.
      await new Promise(resolve => setTimeout(resolve, delayMs));
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

  // Set common headers for both POST and GET requests.
  // Note: We override the User-Agent header so that the API doesn't see a mobile user agent.
  const commonHeaders = {
    'Authorization': `Token ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'AskHandleClient/1.0'
  };

  try {
    // POST request: Retry up to 3 times with a 1-second delay between attempts.
    const postResponse = await fetchWithRetry(
      'https://dashboard.askhandle.com/api/v1/messages/',
      {
        method: 'POST',
        headers: commonHeaders,
        body: JSON.stringify({
          body: message,
          nickname: nickname,
          email: email,
          phone_number: phone_number,
          room: { uuid: room }
        }),
      },
      3,    // maxRetries for POST
      1000  // delay in milliseconds between POST retries
    );

    let data = await postResponse.json();

    // Use the returned message UUID to poll for the AI answer.
    const messageUuid = data.uuid;
    const maxPolls = 10;  // Total number of polling iterations
    let polls = 0;

    // Poll the GET endpoint until support_answer is non-empty or polling attempts are exhausted.
    while ((!data.support_answer || data.support_answer.trim() === "") && polls < maxPolls) {
      // Wait 1.5 seconds before each poll.
      await new Promise(resolve => setTimeout(resolve, 1500));
      try {
        // GET request: Retry each poll up to 2 times with a 1-second delay.
        const pollResponse = await fetchWithRetry(
          `https://dashboard.askhandle.com/api/v1/messages/${messageUuid}/`,
          {
            method: 'GET',
            headers: commonHeaders,
            cache: 'no-store'
          },
          2,    // maxRetries for each GET poll
          1000  // delay between GET retries in milliseconds
        );
        data = await pollResponse.json();
      } catch (error) {
        console.error(`Polling GET failed on attempt ${polls + 1}:`, error);
      }
      polls++;
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
