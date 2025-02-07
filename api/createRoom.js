// pages/api/createRoom.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  
  const token = process.env.ASKHANDLE_API_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Server misconfiguration: missing API token' });
  }
  
  try {
    // Create the chat room via AskHandle API
    const roomResponse = await fetch('https://dashboard.askhandle.com/api/v1/rooms/', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
    });
  
    if (!roomResponse.ok) {
      throw new Error(`Failed to create chat room: ${roomResponse.statusText}`);
    }
  
    const data = await roomResponse.json();
    // data is expected to have fields like: label, uuid, name, greeting_message, created_at
    res.status(200).json({ room: data });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: error.message });
  }
}
