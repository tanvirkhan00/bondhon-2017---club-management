/**
 * Netlify Function: admin-invite
 * Secure server-side invitation function for authorized club administrators.
 * Uses SUPABASE_SERVICE_ROLE_KEY securely on the server side (never in client).
 */

import { createClient } from '@supabase/supabase-js';

interface NetlifyEvent {
  httpMethod: string;
  headers: Record<string, string | undefined>;
  body: string | null;
}

interface NetlifyResponse {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
}

export const handler = async (event: NetlifyEvent): Promise<NetlifyResponse> => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Supabase URL or Service Role Key missing in server environment variables.',
      }),
    };
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const authHeader = event.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized: Invalid token' }),
      };
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Forbidden: Admin access required' }),
      };
    }

    const { email, full_name } = JSON.parse(event.body || '{}');
    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Email is required' }),
      };
    }

    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { full_name },
    });

    if (inviteError) throw inviteError;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, message: `Invitation sent to ${email}`, data: inviteData }),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: msg }),
    };
  }
};
