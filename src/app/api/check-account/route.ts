// app/api/check-account/route.ts
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const { type, identifier } = await req.json();
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // JANGAN diekspos ke client
  );

  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  const user = data?.users.find((u) =>
    type === 'email' ? u.email === identifier : u.phone === identifier
  );

  if (user) {
    return Response.json({
      exists: true,
      username: user.user_metadata?.username || user.email?.split('@')[0],
      email: user.email,
      phone: user.phone,
    });
  }
  return Response.json({ exists: false });
}