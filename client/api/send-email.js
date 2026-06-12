export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { to, subject, html, apiKey } = req.body;
  if (!to || !subject || !html || !apiKey) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Invictus Diagnostics <onboarding@resend.dev>',
        to,
        subject,
        html
      })
    });
    
    const result = await response.json();
    if (response.ok) {
       res.status(200).json({ success: true, data: result });
    } else {
       res.status(response.status).json({ success: false, message: result.message || 'Error occurred' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}
