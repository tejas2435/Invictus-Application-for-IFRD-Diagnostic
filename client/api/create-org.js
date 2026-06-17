import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { name, supervisorName, supervisorEmail, password, maxParticipants } = req.body;

  if (!name || !supervisorName || !supervisorEmail || !password || maxParticipants === undefined) {
    return res.status(400).json({ success: false, message: 'Missing required configuration fields.' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ 
      success: false, 
      message: 'Server configuration error: Please provide VITE_SUPABASE_SERVICE_ROLE_KEY in your environment variables to create user authenticated records.' 
    });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    // 1. Generate Custom Organization ID: ORG-YYYYMMDD-X
    const today = new Date();
    const year = today.getUTCFullYear();
    const month = String(today.getUTCMonth() + 1).padStart(2, '0');
    const day = String(today.getUTCDate()).padStart(2, '0');
    const datePrefix = `ORG-${year}${month}${day}`;

    const { data: latestOrgs, error: fetchOrgError } = await supabaseAdmin
      .from('organizations')
      .select('custom_id')
      .like('custom_id', `${datePrefix}-%`)
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchOrgError) {
       console.error("Error fetching latest org:", fetchOrgError);
       return res.status(500).json({ success: false, message: 'Database Error searching existing organisations.' });
    }

    let increment = 1;
    if (latestOrgs && latestOrgs.length > 0) {
      const match = latestOrgs[0].custom_id.match(/-(\d+)$/);
      if (match) {
        increment = parseInt(match[1], 10) + 1;
      }
    }
    const custom_id = `${datePrefix}-${increment}`;

    // 2. Generate unique Signup URL Random Number
    const signup_token = Math.floor(10000000 + Math.random() * 90000000).toString();

    // 3. Create Supervisor Auth User
    const { data: userRecord, error: userCreateError } = await supabaseAdmin.auth.admin.createUser({
      email: supervisorEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: supervisorName,
        role: 'supervisor'
      }
    });

    if (userCreateError) {
      console.error("User Auth Create Error:", userCreateError);
      return res.status(400).json({ success: false, message: `Failed to create Supervisor authentication: ${userCreateError.message}` });
    }

    const supervisor_id = userRecord.user.id;

    // Wait a brief moment to allow any DB triggers to create the profile automatically
    await new Promise(resolve => setTimeout(resolve, 500));

    // Update or Insert the profile explicitly
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: supervisor_id,
        email: supervisorEmail,
        full_name: supervisorName,
        role: 'supervisor',
        organization: name
      }, { onConflict: 'id' });
    
    if (profileError) {
       console.warn("Profile upsert warned/failed (could be expected due to trigger):", profileError);
    }

    // 4. Create the Organization Record
    const { error: orgInsertError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: name,
        custom_id: custom_id,
        signup_token: signup_token,
        supervisor_id: supervisor_id,
        supervisor_name: supervisorName,
        supervisor_email: supervisorEmail,
        max_participants: parseInt(maxParticipants, 10)
      });

    if (orgInsertError) {
      console.error("Org Insert Error:", orgInsertError);
      // Clean up user if org creation fails
      await supabaseAdmin.auth.admin.deleteUser(supervisor_id);
      return res.status(500).json({ success: false, message: `Failed to insert organization record: ${orgInsertError.message}` });
    }

    res.status(200).json({
      success: true,
      data: {
        custom_id,
        signup_token,
        supervisor_id,
        name
      }
    });

  } catch (err) {
    console.error("Server API Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}
