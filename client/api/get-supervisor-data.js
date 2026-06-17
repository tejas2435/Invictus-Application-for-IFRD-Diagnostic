import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { orgName, supervisorId } = req.body;

  if (!orgName || !supervisorId) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ success: false, message: 'Server configuration error.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Check if the organization exists and belongs to the supervisor
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('name, max_participants, supervisor_id')
      .eq('name', orgName)
      .single();

    if (orgError || !orgData) {
      return res.status(404).json({ success: false, message: 'Organization not found.' });
    }

    if (orgData.supervisor_id !== supervisorId) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to organization data.' });
    }

    const { data: participants, error: participantsError } = await supabaseAdmin
      .from('profiles')
      .select(`
        id, custom_id, full_name, preferred_name, role, created_at,
        evaluations (id, responses, status, created_at)
      `)
      .eq('organization', orgName)
      .eq('role', 'participant');

    if (participantsError) {
      throw participantsError;
    }

    const evalsList = [];
    if (participants) {
      participants.forEach(p => {
        if (p.evaluations && p.evaluations.length > 0) {
          evalsList.push({ ...p.evaluations[0], profiles: {
            id: p.id,
            custom_id: p.custom_id,
            full_name: p.full_name,
            preferred_name: p.preferred_name,
            role: p.role,
            created_at: p.created_at
          }});
        } else {
          evalsList.push({ status: 'in-progress', profiles: {
            id: p.id,
            custom_id: p.custom_id,
            full_name: p.full_name,
            preferred_name: p.preferred_name,
            role: p.role,
            created_at: p.created_at
          }});
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        maxParticipants: orgData.max_participants,
        evaluations: evalsList
      }
    });

  } catch (err) {
    console.error("Server API Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}
