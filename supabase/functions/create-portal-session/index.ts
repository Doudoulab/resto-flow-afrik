import { createClient } from 'npm:@supabase/supabase-js@2';
import { getPaddleClient, type PaddleEnv } from '../_shared/paddle.ts';

const responseHeaders = {
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Content-Type": "application/json",
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, responseHeaders);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, ...responseHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, ...responseHeaders });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { environment } = await req.json().catch(() => ({ environment: 'sandbox' }));
    const env = (environment || 'sandbox') as PaddleEnv;

    const { data: sub } = await admin
      .from('subscriptions')
      .select('paddle_customer_id, paddle_subscription_id')
      .eq('user_id', user.id)
      .eq('environment', env)
      .maybeSingle();

    if (!sub) {
      return new Response(JSON.stringify({ error: 'No subscription found' }), { status: 404, ...responseHeaders });
    }

    const paddle = getPaddleClient(env);
    const portalSession = await paddle.customerPortalSessions.create(
      sub.paddle_customer_id,
      [sub.paddle_subscription_id]
    );

    return new Response(JSON.stringify({
      url: portalSession.urls.general.overview,
      subscriptionUrls: portalSession.urls.subscriptions,
    }), responseHeaders);
  } catch (e) {
    console.error('Portal error:', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, ...responseHeaders });
  }
});