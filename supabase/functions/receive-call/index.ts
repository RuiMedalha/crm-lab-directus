import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-token',
}

interface CallPayload {
  phone?: string;
  phone_number?: string;
  name?: string;
  customer_name?: string;
  source?: string;
  notes?: string;
  status?: string;
  direction?: string;
  call_id?: string;
  external_id?: string;
}

// Input validation helper
function validateCallInput(body: CallPayload): { valid: boolean; error?: string } {
  const phoneNumber = body.phone || body.phone_number;
  const customerName = body.name || body.customer_name;
  const notes = body.notes || '';

  // Phone validation (if provided)
  if (phoneNumber && phoneNumber.length > 50) {
    return { valid: false, error: 'Phone number too long (max 50 chars)' };
  }
  
  // Name validation
  if (customerName && customerName.length > 200) {
    return { valid: false, error: 'Customer name too long (max 200 chars)' };
  }
  
  // Notes validation
  if (notes.length > 5000) {
    return { valid: false, error: 'Notes too long (max 5000 chars)' };
  }
  
  // Status validation
  const validStatuses = ['incoming', 'answered', 'missed', 'rejected'];
  if (body.status && !validStatuses.includes(body.status)) {
    return { valid: false, error: 'Invalid status value' };
  }

  // Source validation
  if (body.source && body.source.length > 100) {
    return { valid: false, error: 'Source too long (max 100 chars)' };
  }
  
  return { valid: true };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // MANDATORY: Validate webhook token
    const expectedToken = Deno.env.get('WEBHOOK_CALL_TOKEN');
    if (!expectedToken) {
      console.error('WEBHOOK_CALL_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const webhookToken = req.headers.get('x-webhook-token');
    if (webhookToken !== expectedToken) {
      console.log('Invalid or missing webhook token');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: CallPayload = await req.json();
    console.log('📞 Received call payload:', JSON.stringify(body));

    // Validate input
    const validation = validateCallInput(body);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for inserting
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Normalize phone number - accept both phone and phone_number
    const phoneNumber = body.phone || body.phone_number || null;
    
    // Normalize customer name - accept both name and customer_name
    const customerName = body.name || body.customer_name || null;
    
    // Default source to n8n if not provided
    const source = body.source || 'n8n';
    
    // Build notes with additional info
    let notes = body.notes || '';
    if (body.direction) {
      notes = notes ? `${notes}\nDireção: ${body.direction}` : `Direção: ${body.direction}`;
    }
    if (body.external_id || body.call_id) {
      const extId = body.external_id || body.call_id;
      notes = notes ? `${notes}\nExternal ID: ${extId}` : `External ID: ${extId}`;
    }

    // Insert call into calls table
    const { data, error } = await supabase
      .from('calls')
      .insert({
        phone_number: phoneNumber,
        customer_name: customerName,
        source: source,
        notes: notes || null,
        status: body.status || 'incoming',
        is_processed: false,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error inserting call:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to create call', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Call created successfully:', data.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Call created successfully',
        call_id: data.id,
        data 
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
