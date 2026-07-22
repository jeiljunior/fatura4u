import { createClient } from '@supabase/supabase-js'

// Cliente Supabase com service role — bypassa RLS. Usar apenas em server-side.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default supabaseAdmin
