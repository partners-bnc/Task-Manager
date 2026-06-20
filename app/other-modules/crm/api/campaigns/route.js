import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: campaigns, error } = await supabase.from("crm_campaigns").select("*").order("created_at", { ascending: false });
    if (error) throw error;

    // Fetch steps for all campaigns
    const { data: steps } = await supabase.from("crm_campaign_steps").select("*").order("step_number", { ascending: true });

    const result = campaigns.map(c => ({
      ...c,
      steps: (steps || []).filter(s => s.campaign_id === c.id)
    }));

    return NextResponse.json({ campaigns: result });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { steps, ...campaignData } = await request.json();

    const { data: campaign, error } = await supabase.from("crm_campaigns").insert(campaignData).select("*").single();
    if (error) throw error;

    if (steps?.length) {
      const stepsWithCampaign = steps.map(s => ({ ...s, campaign_id: campaign.id }));
      await supabase.from("crm_campaign_steps").insert(stepsWithCampaign);
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PUT(request) {
  try {
    const supabase = await createClient();
    const { id, steps, ...updates } = await request.json();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const { data: campaign, error } = await supabase.from("crm_campaigns").update(updates).eq("id", id).select("*").single();
    if (error) throw error;

    if (steps) {
      await supabase.from("crm_campaign_steps").delete().eq("campaign_id", id);
      if (steps.length) {
        const stepsWithCampaign = steps.map(s => ({ ...s, campaign_id: id }));
        await supabase.from("crm_campaign_steps").insert(stepsWithCampaign);
      }
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const supabase = await createClient();
    const { error } = await supabase.from("crm_campaigns").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
