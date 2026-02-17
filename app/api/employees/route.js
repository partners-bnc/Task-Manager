import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

// GET - Fetch all employees
export async function GET(request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // GET single employee with assigned tasks
    if (id) {
      const { data: employee, error } = await supabase
        .from('employees')
        .select(`
          *,
          task_assignments (
            task:tasks (
              id,
              task_name,
              description,
              priority,
              status,
              created_at
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching employee details:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (!employee) {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
      }

      return NextResponse.json({ employee }, { status: 200 });
    }

    const { data: employees, error } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching employees:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ employees }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/employees:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Add new employee
export async function POST(request) {
  try {
    const supabase = await createClient();
    const formData = await request.formData();

    const employeeId = String(formData.get('employeeId') || '').trim().toLowerCase();
    const name = String(formData.get('name') || '').trim();
    const username = String(formData.get('username') || '').trim().toLowerCase();
    const role = String(formData.get('role') || '').trim();
    const password = String(formData.get('password') || '');
    const profilePicture = formData.get('profilePicture');

    // Validate required fields
    if (!employeeId || !name || !username || !role || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    let profilePictureUrl = null;

    // Upload profile picture if provided
    if (profilePicture && profilePicture.size > 0) {
      const fileExt = profilePicture.name.split('.').pop();
      const fileName = `${employeeId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Convert file to buffer
      const bytes = await profilePicture.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('employee-avatars')
        .upload(filePath, buffer, {
          contentType: profilePicture.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('Error uploading profile picture:', uploadError);
        return NextResponse.json(
          { error: 'Failed to upload profile picture' },
          { status: 500 }
        );
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('employee-avatars')
        .getPublicUrl(filePath);

      profilePictureUrl = urlData.publicUrl;
    }

    // Generate email from username if not provided
    const rawEmail = String(formData.get('email') || '').trim().toLowerCase();
    const email = rawEmail || `${username}@taskflow.io`;

    // Insert employee into database
    const { data: employee, error: insertError } = await supabase
      .from('employees')
      .insert([
        {
          employee_id: employeeId,
          name: name,
          username: username,
          email: email,
          role: role,
          password_hash: passwordHash,
          profile_picture_url: profilePictureUrl,
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting employee:', insertError);
      
      // If employee insertion fails and we uploaded a picture, delete it
      if (profilePictureUrl) {
        const filePath = profilePictureUrl.split('/').pop();
        await supabase.storage
          .from('employee-avatars')
          .remove([filePath]);
      }

      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: 'Employee added successfully',
        employee: employee
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/employees:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove employee by id
export async function DELETE(request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Employee id is required' },
        { status: 400 }
      );
    }

    const { data: employee, error: fetchError } = await supabase
      .from('employees')
      .select('id, profile_picture_url')
      .eq('id', id)
      .single();

    if (fetchError || !employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Strict mode: prevent deletion while tasks are still assigned
    const { count: assignedTaskCount, error: assignmentCountError } = await supabase
      .from('task_assignments')
      .select('task_id', { count: 'exact', head: true })
      .eq('employee_id', id);

    if (assignmentCountError) {
      console.error('Error checking employee task assignments:', assignmentCountError);
      return NextResponse.json(
        { error: 'Failed to verify employee task assignments' },
        { status: 500 }
      );
    }

    if ((assignedTaskCount || 0) > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete employee with active task assignments (${assignedTaskCount}). Reassign or unassign tasks first.`,
          assignedTaskCount,
          code: 'EMPLOYEE_HAS_ASSIGNED_TASKS',
        },
        { status: 409 }
      );
    }

    // Best-effort cleanup of avatar in storage
    if (employee.profile_picture_url) {
      try {
        const avatarPath = employee.profile_picture_url.split('/employee-avatars/')[1];
        if (avatarPath) {
          await supabase.storage.from('employee-avatars').remove([avatarPath]);
        }
      } catch (storageError) {
        console.error('Failed to remove employee avatar from storage:', storageError);
      }
    }

    const { data: deletedRows, error: deleteError } = await supabase
      .from('employees')
      .delete()
      .eq('id', id)
      .select('id');

    if (deleteError) {
      console.error('Error deleting employee:', deleteError);
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    if (!deletedRows || deletedRows.length === 0) {
      return NextResponse.json(
        { error: 'Delete failed due to permissions or employee no longer exists' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { message: 'Employee deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/employees:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
