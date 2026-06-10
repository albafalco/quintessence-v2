import { NextResponse } from 'next/server';
import { createServiceClient, getSupabaseConfig } from '@/lib/supabase/server';

const ERROR_CODES = {
  SERVER_CONFIG: 'SERVER_CONFIG',
  MISSING_FIELDS: 'MISSING_FIELDS',
  INVALID_USERNAME: 'INVALID_USERNAME',
  PASSWORD_TOO_SHORT: 'PASSWORD_TOO_SHORT',
  INVALID_INVITE: 'INVALID_INVITE',
  REGISTRATION_FAILED: 'REGISTRATION_FAILED',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
} as const;

export async function GET() {
  return NextResponse.json(
    { errorCode: ERROR_CODES.METHOD_NOT_ALLOWED },
    { status: 405 }
  );
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
        { errorCode: ERROR_CODES.SERVER_CONFIG },
        { status: 500 }
      );
    }

    const { name, username, email, password, inviteCode } = await request.json();

    if (!name || !username || !email || !password || !inviteCode) {
      return NextResponse.json({ errorCode: ERROR_CODES.MISSING_FIELDS }, { status: 400 });
    }

    if (!/^[a-z0-9_-]+$/.test(username)) {
      return NextResponse.json({ errorCode: ERROR_CODES.INVALID_USERNAME }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ errorCode: ERROR_CODES.PASSWORD_TOO_SHORT }, { status: 400 });
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
          { errorCode: ERROR_CODES.SERVER_CONFIG },
          { status: 500 }
        );
      }
      return NextResponse.json({ errorCode: ERROR_CODES.INVALID_INVITE }, { status: 400 });
    }

    if (!invite || invite.is_used) {
      return NextResponse.json({ errorCode: ERROR_CODES.INVALID_INVITE }, { status: 400 });
    }

    const { data: authData, error: signUpError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (signUpError || !authData.user) {
      console.error('[register] createUser failed:', signUpError?.message);
      return NextResponse.json(
        { errorCode: ERROR_CODES.REGISTRATION_FAILED, error: signUpError?.message },
        { status: 400 }
      );
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
      return NextResponse.json(
        { errorCode: ERROR_CODES.REGISTRATION_FAILED, error: profileError.message },
        { status: 400 }
      );
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
    return NextResponse.json({ errorCode: ERROR_CODES.REGISTRATION_FAILED }, { status: 500 });
  }
}