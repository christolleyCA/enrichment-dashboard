import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('system_metrics')
    .select('*')
    .eq('id', 'overlord')
    .single()

  if (error || !data) {
    return NextResponse.json({
      available: false,
      updated_at: null,
      gpu_data: null,
      system_data: null,
      services_data: null,
    })
  }

  const ageMs = Date.now() - new Date(data.updated_at).getTime()
  return NextResponse.json({
    available: true,
    stale: ageMs > 90_000,
    updated_at: data.updated_at,
    gpu_data: data.gpu_data,
    system_data: data.system_data,
    services_data: data.services_data,
  })
}
