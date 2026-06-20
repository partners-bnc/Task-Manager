import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('crm_email_triggers').select('*').order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ triggers: data });
}

export async function POST(request) {
  const supabase = await createClient();
  const body = await request.json();
  const { name, event, condition_expression, template_id, status } = body;
  
  const { data, error } = await supabase.from('crm_email_triggers')
    .insert({ name, event, condition_expression, template_id, status })
    .select()
    .single();
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ trigger: data });
}

export async function PUT(request) {
  const supabase = await createClient();
  const body = await request.json();
  const { id, name, event, condition_expression, template_id, status } = body;
  
  const { data, error } = await supabase.from('crm_email_triggers')
    .update({ name, event, condition_expression, template_id, status })
    .eq('id', id)
    .select()
    .single();
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ trigger: data });
}

export async function DELETE(request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  
  const { error } = await supabase.from('crm_email_triggers').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
