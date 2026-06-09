import { NextResponse } from 'next/server';
import { createServiceClient, getSupabaseConfig } from '@/lib/supabase/server';

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed. Use POST.' }, { status: 405 });
}

export async function POST(request: Request) {
  try {
    const { url, serviceRoleKey } = getSupabaseConfig();
    if (!url || !serviceRoleKey) {
      console.error('[register] Missing env:', {
        hasUrl: Boolean(url),
        hasServiceRoleKey: Boolean(serviceRoleKey),
      });
      return NextResponse.json(
        { error: 'Server configuration error. Contact administrator.' },
        { status: 500 }
      );
    }

    const { name, username, email, password, inviteCode } = await request.json();

    if (!name || !username || !email || !password || !inviteCode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!/^[a-z0-9_-]+$/.test(username)) {
      return NextResponse.json({ error: 'Invalid username format' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const supabase = await createServiceClient();

    const { data: invite, error: inviteError } = await supabase
      .from('invite_codes')
      .select('id, is_used')
      .eq('code', inviteCode.trim())
      .single();

    if (inviteError) {
      console.error('[register] invite_codes query failed:', inviteError.message, inviteError.code);
      if (inviteError.message?.includes('API key')) {
        return NextResponse.json(
          { error: 'Server configuration error. Contact administrator.' },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: 'Invalid or used invite code' }, { status: 400 });
    }

    if (!invite || invite.is_used) {
      return NextResponse.json({ error: 'Invalid or used invite code' }, { status: 400 });
    }

    const { data: authData, error: signUpError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (signUpError || !authData.user) {
      console.error('[register] createUser failed:', signUpError?.message);
      return NextResponse.json({ error: signUpError?.message ?? 'Registration failed' }, { status: 400 });
    }

    const userId = authData.user.id;

    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      name,
      username,
      preferred_language: 'hu',
    });

    if (profileError) {
      console.error('[register] profiles insert failed:', profileError.message);
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    const { error: inviteUpdateError } = await supabase
      .from('invite_codes')
      .update({ is_used: true, used_by: userId, used_at: new Date().toISOString() })
      .eq('id', invite.id);

    if (inviteUpdateError) {
      console.error('[register] invite_codes update failed:', inviteUpdateError.message);
    }

    const defaultUnlocks = [
      { user_id: userId, lesson_id: 1, section_id: 0 },
      { user_id: userId, lesson_id: 1, section_id: 1 },
      { user_id: userId, lesson_id: 1, section_id: 2 },
      { user_id: userId, lesson_id: 1, section_id: 5 },
    ];

    const { error: unlockError } = await supabase
      .from('angol_section_unlocks')
      .insert(defaultUnlocks);

    if (unlockError) {
      console.error('[register] angol_section_unlocks insert failed:', unlockError.message);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[register] unexpected error:', err);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}