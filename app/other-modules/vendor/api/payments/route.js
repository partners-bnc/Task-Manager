import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { adminClient } from '@/utils/supabase/admin';
import { resolveAuthenticatedUserContext } from '@/utils/auth/context';

const PAYMENTS_TABLE = 'vendor_payments';
const DOCUMENTS_TABLE = 'vendor_payment_documents';
const BUCKET_NAME = 'vendor-payments';
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

async function getAuthContext() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return null;
  }
  
  return resolveAuthenticatedUserContext(supabase, user);
}

async function ensureStorageBucket() {
  try {
    const { data: buckets, error } = await adminClient.storage.listBuckets();
    if (error) throw error;

    const exists = (buckets || []).some((bucket) => bucket.name === BUCKET_NAME);
    if (!exists) {
      const { error: createError } = await adminClient.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: MAX_FILE_SIZE_BYTES,
      });
      if (createError) throw createError;
    }
  } catch (error) {
    console.error('Error ensuring vendor-payments bucket exists:', error.message);
  }
}

export async function GET(request) {
  try {
    const authContext = await getAuthContext();
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'vendor_payment' or 'full_and_final'

    let query = adminClient
      .from(PAYMENTS_TABLE)
      .select(`
        *,
        documents: ${DOCUMENTS_TABLE} (*)
      `)
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('payment_type', type);
    }

    const { data: payments, error } = await query;
    if (error) throw error;

    return NextResponse.json({ payments: payments || [] });
  } catch (error) {
    console.error('GET payments error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const authContext = await getAuthContext();
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const paymentType = formData.get('payment_type');
    const vendorName = formData.get('vendor_name');
    const natureOfPayment = formData.get('nature_of_payment');
    const amountStr = formData.get('amount');
    const invoiceDate = formData.get('invoice_date');
    const files = formData.getAll('documents'); // Multiple files

    // Validation
    if (!paymentType || !vendorName || !natureOfPayment || !amountStr || !invoiceDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid payment amount' }, { status: 400 });
    }

    // Ensure bucket is created
    await ensureStorageBucket();

    // 1. Insert Payment entry first to get the payment ID
    const employeeId = authContext.employee?.id || null;
    const employeeName = authContext.user?.name || authContext.employee?.name || 'Unknown';

    const { data: payment, error: insertError } = await adminClient
      .from(PAYMENTS_TABLE)
      .insert({
        payment_type: paymentType,
        vendor_name: vendorName,
        nature_of_payment: natureOfPayment,
        amount: amount,
        invoice_date: invoiceDate,
        payment_status: 'invoice_uploaded',
        created_by_id: employeeId,
        created_by_name: employeeName
      })
      .select('*')
      .single();

    if (insertError) throw insertError;

    // 2. Upload files and record documents
    const documentRows = [];
    for (const file of files) {
      if (!file || typeof file === 'string' || file.size <= 0) continue;

      if (file.size > MAX_FILE_SIZE_BYTES) {
        // Cleanup already created payment if file size validation fails mid-way
        await adminClient.from(PAYMENTS_TABLE).delete().eq('id', payment.id);
        return NextResponse.json({ error: `File ${file.name} exceeds 10 MB limit` }, { status: 400 });
      }

      // Safe file name
      const fileExt = file.name.split('.').pop() || 'bin';
      const safeName = file.name.replace(/[^a-z0-9.]+/gi, '-').toLowerCase();
      const storagePath = `${payment.id}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
      
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const { error: uploadError } = await adminClient.storage
        .from(BUCKET_NAME)
        .upload(storagePath, buffer, {
          contentType: file.type || 'application/octet-stream',
          upsert: false
        });

      if (uploadError) {
        // Rollback payment creation
        await adminClient.from(PAYMENTS_TABLE).delete().eq('id', payment.id);
        throw new Error(`Failed to upload file ${file.name}: ${uploadError.message}`);
      }

      const { data: urlData } = adminClient.storage.from(BUCKET_NAME).getPublicUrl(storagePath);
      const publicUrl = urlData?.publicUrl || '';

      documentRows.push({
        payment_id: payment.id,
        file_name: file.name,
        file_path: storagePath,
        file_url: publicUrl,
        file_size: file.size
      });
    }

    if (documentRows.length > 0) {
      const { error: docError } = await adminClient
        .from(DOCUMENTS_TABLE)
        .insert(documentRows);

      if (docError) {
        // Rollback payment and storage files
        await adminClient.from(PAYMENTS_TABLE).delete().eq('id', payment.id);
        const pathsToDelete = documentRows.map(r => r.file_path);
        await adminClient.storage.from(BUCKET_NAME).remove(pathsToDelete);
        throw docError;
      }
    }

    // Fetch complete record with documents array
    const { data: completePayment, error: fetchError } = await adminClient
      .from(PAYMENTS_TABLE)
      .select(`
        *,
        documents: ${DOCUMENTS_TABLE} (*)
      `)
      .eq('id', payment.id)
      .single();

    if (fetchError) throw fetchError;

    return NextResponse.json({ payment: completePayment });
  } catch (error) {
    console.error('POST payment error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const authContext = await getAuthContext();
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const id = formData.get('id');
    const vendorName = formData.get('vendor_name');
    const natureOfPayment = formData.get('nature_of_payment');
    const amountStr = formData.get('amount');
    const invoiceDate = formData.get('invoice_date');
    
    // List of document IDs that were deleted
    const deletedDocIdsStr = formData.get('deleted_document_ids');
    const deletedDocIds = deletedDocIdsStr ? JSON.parse(deletedDocIdsStr) : [];
    
    // New files uploaded
    const newFiles = formData.getAll('new_documents');

    if (!id || !vendorName || !natureOfPayment || !amountStr || !invoiceDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid payment amount' }, { status: 400 });
    }

    // 1. Delete removed documents
    if (deletedDocIds.length > 0) {
      // Fetch file paths first for storage deletion
      const { data: docsToDelete, error: fetchError } = await adminClient
        .from(DOCUMENTS_TABLE)
        .select('id, file_path')
        .in('id', deletedDocIds);

      if (fetchError) throw fetchError;

      if (docsToDelete && docsToDelete.length > 0) {
        // Delete from DB
        const { error: dbDeleteError } = await adminClient
          .from(DOCUMENTS_TABLE)
          .delete()
          .in('id', deletedDocIds);

        if (dbDeleteError) throw dbDeleteError;

        // Delete from Storage
        const paths = docsToDelete.map(d => d.file_path);
        await adminClient.storage.from(BUCKET_NAME).remove(paths);
      }
    }

    // 2. Upload new documents
    const documentRows = [];
    if (newFiles.length > 0) {
      await ensureStorageBucket();

      for (const file of newFiles) {
        if (!file || typeof file === 'string' || file.size <= 0) continue;

        if (file.size > MAX_FILE_SIZE_BYTES) {
          return NextResponse.json({ error: `File ${file.name} exceeds 10 MB limit` }, { status: 400 });
        }

        const fileExt = file.name.split('.').pop() || 'bin';
        const storagePath = `${id}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
        
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const { error: uploadError } = await adminClient.storage
          .from(BUCKET_NAME)
          .upload(storagePath, buffer, {
            contentType: file.type || 'application/octet-stream',
            upsert: false
          });

        if (uploadError) {
          throw new Error(`Failed to upload file ${file.name}: ${uploadError.message}`);
        }

        const { data: urlData } = adminClient.storage.from(BUCKET_NAME).getPublicUrl(storagePath);
        const publicUrl = urlData?.publicUrl || '';

        documentRows.push({
          payment_id: id,
          file_name: file.name,
          file_path: storagePath,
          file_url: publicUrl,
          file_size: file.size
        });
      }

      if (documentRows.length > 0) {
        const { error: docError } = await adminClient
          .from(DOCUMENTS_TABLE)
          .insert(documentRows);

        if (docError) {
          // Cleanup uploaded files
          const paths = documentRows.map(r => r.file_path);
          await adminClient.storage.from(BUCKET_NAME).remove(paths);
          throw docError;
        }
      }
    }

    // 3. Update main payment record
    const { data: updatedPayment, error: updateError } = await adminClient
      .from(PAYMENTS_TABLE)
      .update({
        vendor_name: vendorName,
        nature_of_payment: natureOfPayment,
        amount: amount,
        invoice_date: invoiceDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        documents: ${DOCUMENTS_TABLE} (*)
      `)
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ payment: updatedPayment });
  } catch (error) {
    console.error('PATCH payment error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const authContext = await getAuthContext();
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing payment ID' }, { status: 400 });
    }

    // 1. Fetch document paths first to clean up storage
    const { data: docs, error: fetchError } = await adminClient
      .from(DOCUMENTS_TABLE)
      .select('file_path')
      .eq('payment_id', id);

    if (fetchError) throw fetchError;

    // 2. Delete payment from DB (cascades to documents table)
    const { error: deleteError } = await adminClient
      .from(PAYMENTS_TABLE)
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    // 3. Remove files from storage bucket
    if (docs && docs.length > 0) {
      const pathsToDelete = docs.map((d) => d.file_path);
      await adminClient.storage.from(BUCKET_NAME).remove(pathsToDelete);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE payment error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
