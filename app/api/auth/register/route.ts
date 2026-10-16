import { NextResponse } from 'next/server';
import { createServiceClient, getSupabaseConfig } from '@/lib/supabase/server';

const ERROR_CODES = {
  SERVER_CONFIG: 'SERVER_CONFIG',
  MISSING_FIELDS: 'MISSING_FIELDS',
  INVALID_USERNAME: 'INVALID_USERNAME',
  PASSWORD_TOO_SHORT: 'PASSWORD_TOO_SHORT',
  INVALID_INVITE: 'INVALID_INVITE',
  INVITE_EMAIL_MISMATCH: 'INVITE_EMAIL_MISMATCH',
  REGISTRATION_FAILED: 'REGISTRATION_FAILED',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  USERNAME_TAKEN: 'USERNAME_TAKEN',
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

    // Look the code up first; expiry, revocation and the bound e-mail are
    // checked here (not in a PostgREST filter built from user input).
    const trimmedCode = String(inviteCode).trim();
    const { data: candidate, error: lookupError } = await supabase
      .from('invite_codes')
      .select('id, email, expires_at, revoked_at')
      .in('code', [...new Set([trimmedCode, trimmedCode.toUpperCase()])])
      .eq('is_used', false)
      .maybeSingle();

    if (lookupError) {
      console.error('[register] invite_codes lookup failed:', lookupError.message, lookupError.code);
      return NextResponse.json({ errorCode: ERROR_CODES.SERVER_CONFIG }, { status: 500 });
    }

    const expired = candidate?.expires_at && new Date(candidate.expires_at).getTime() <= Date.now();
    if (!candidate || candidate.revoked_at || expired) {
      return NextResponse.json({ errorCode: ERROR_CODES.INVALID_INVITE }, { status: 400 });
    }

    if (candidate.email && candidate.email.toLowerCase() !== String(email).trim().toLowerCase()) {
      return NextResponse.json({ errorCode: ERROR_CODES.INVITE_EMAIL_MISMATCH }, { status: 400 });
    }

    // Claim the invite atomically (conditional update) so two simultaneous
    // registrations cannot both use the same code.
    const { data: invite, error: inviteError } = await supabase
      .from('invite_codes')
      .update({ is_used: true, used_at: new Date().toISOString() })
      .eq('id', candidate.id)
      .eq('is_used', false)
      .is('revoked_at', null)
      .select('id')
      .maybeSingle();

    if (inviteError) {
      console.error('[register] invite_codes claim failed:', inviteError.message, inviteError.code);
      return NextResponse.json({ errorCode: ERROR_CODES.SERVER_CONFIG }, { status: 500 });
    }

    if (!invite) {
      return NextResponse.json({ errorCode: ERROR_CODES.INVALID_INVITE }, { status: 400 });
    }

    const releaseInvite = () =>
      supabase
        .from('invite_codes')
        .update({ is_used: false, used_at: null, used_by: null })
        .eq('id', invite.id);

    const { data: authData, error: signUpError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (signUpError || !authData.user) {
      console.error('[register] createUser failed:', signUpError?.message);
      await releaseInvite();
      const emailTaken = /already (been )?registered|already exists/i.test(signUpError?.message ?? '');
      return NextResponse.json(
        { errorCode: emailTaken ? ERROR_CODES.EMAIL_TAKEN : ERROR_CODES.REGISTRATION_FAILED },
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
      await releaseInvite();
      return NextResponse.json(
        {
          errorCode:
            profileError.code === '23505'
              ? ERROR_CODES.USERNAME_TAKEN
              : ERROR_CODES.REGISTRATION_FAILED,
        },
        { status: 400 }
      );
    }

    const { error: inviteUpdateError } = await supabase
      .from('invite_codes')
      .update({ used_by: userId })
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