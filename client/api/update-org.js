import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { id, name, supervisorName, supervisorEmail, password, maxParticipants, oldSupervisorId } = req.body;

  if (!id || !name || maxParticipants === undefined || !oldSupervisorId) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ success: false, message: 'Server configuration error.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    // 1. Check if org exists
    const { data: orgData, error: orgFetchErr } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();

    if (orgFetchErr || !orgData) {
      return res.status(404).json({ success: false, message: 'Organization not found.' });
    }

    // Capture changes
    const shouldUpdateAuth = supervisorEmail && supervisorEmail !== orgData.supervisor_email;
    const shouldUpdatePassword = password && password.length > 0;
    const shouldUpdateProfileName = supervisorName && supervisorName !== orgData.supervisor_name;

    // 2. Update Auth User if email or password changed
    let userUpdateData = {};
    if (shouldUpdateAuth) userUpdateData.email = supervisorEmail;
    if (shouldUpdatePassword) userUpdateData.password = password;
    if (shouldUpdateProfileName) {
      userUpdateData.user_metadata = { full_name: supervisorName, role: 'supervisor' };
    }

    if (Object.keys(userUpdateData).length > 0) {
      const { error: authUpdateErr } = await supabaseAdmin.auth.admin.updateUserById(oldSupervisorId, userUpdateData);
      if (authUpdateErr) {
        return res.status(400).json({ success: false, message: `Failed to update supervisor authentication: ${authUpdateErr.message}` });
      }
    }

    // 3. Update Profile Table explicitely if name or email changed
    if (shouldUpdateAuth || shouldUpdateProfileName || orgData.name !== name) {
      const { error: profileUpdateErr } = await supabaseAdmin
        .from('profiles')
        .update({
          email: supervisorEmail || orgData.supervisor_email,
          full_name: supervisorName || orgData.supervisor_name,
          organization: name
        })
        .eq('id', oldSupervisorId);
        
      if (profileUpdateErr) {
        console.warn("Profile update warned/failed:", profileUpdateErr);
      }
    }

    // 4. Update Organization Table
    const { error: orgUpdateErr } = await supabaseAdmin
      .from('organizations')
      .update({
        name: name,
        supervisor_name: supervisorName || orgData.supervisor_name,
        supervisor_email: supervisorEmail || orgData.supervisor_email,
        max_participants: parseInt(maxParticipants, 10)
      })
      .eq('id', id);

    if (orgUpdateErr) {
      return res.status(500).json({ success: false, message: `Failed to update organization: ${orgUpdateErr.message}` });
    }

    res.status(200).json({ success: true, message: 'Organization updated successfully.' });

  } catch (err) {
    console.error("Server API Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}
