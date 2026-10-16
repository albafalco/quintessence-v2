import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

/**
 * Permanently deletes the signed-in user's account. All user data is removed
 * by ON DELETE CASCADE; invite_codes.used_by is set to NULL (migration 010).
 * The caller must send their username as confirmation.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ errorCode: 'UNAUTHORIZED' }, { status: 401 });
  }

  let confirmUsername: unknown;
  try {
    ({ confirmUsername } = await request.json());
  } catch {
    return NextResponse.json({ errorCode: 'INVALID_REQUEST' }, { status: 400 });
  }

  const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single();
  if (!profile || typeof confirmUsername !== 'string' || confirmUsername.trim() !== profile.username) {
    return NextResponse.json({ errorCode: 'CONFIRMATION_MISMATCH' }, { status: 400 });
  }

  const admin = await createServiceClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error('[account/delete] deleteUser failed:', error.message);
    return NextResponse.json({ errorCode: 'DELETE_FAILED' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
