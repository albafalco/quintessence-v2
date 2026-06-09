import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
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

    if (inviteError || !invite || invite.is_used) {
      return NextResponse.json({ error: 'Invalid or used invite code' }, { status: 400 });
    }

    const { data: authData, error: signUpError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (signUpError || !authData.user) {
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
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    await supabase
      .from('invite_codes')
      .update({ is_used: true, used_by: userId, used_at: new Date().toISOString() })
      .eq('id', invite.id);

    const defaultUnlocks = [
      { user_id: userId, lesson_id: 1, section_id: 0 },
      { user_id: userId, lesson_id: 1, section_id: 1 },
      { user_id: userId, lesson_id: 1, section_id: 2 },
      { user_id: userId, lesson_id: 1, section_id: 5 },
    ];

    await supabase.from('angol_section_unlocks').insert(defaultUnlocks);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}