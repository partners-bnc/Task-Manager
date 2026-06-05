$p = 'C:\Users\anshu\Desktop\Task Manager\app\Taskmanager\api\tasks\[id]\route.js'
$t = [IO.File]::ReadAllText($p)

# Fix 1: Remove new columns from subtask select (LF endings)
$old1 = "task_subtasks (`n        id,`n        title,`n        is_completed,`n        priority,`n        due_date,`n        frequency,`n        last_cycle_reset,`n        assigned_employee_id,`n        created_at,`n        updated_at,"
$new1 = "task_subtasks (`n        id,`n        title,`n        is_completed,`n        assigned_employee_id,`n        created_at,`n        updated_at,"
$t = $t.Replace($old1, $new1)
Write-Host ('Fix1 done, priority gone: ' + (-not $t.Contains('        priority,')))

# Fix 2: Remove duplicate meta PATCH block - keep only one occurrence
$block = "    if (body?.subtaskId && (body?.subtaskPriority !== undefined || Object.prototype.hasOwnProperty.call(body, 'subtaskDueDate') || body?.subtaskFrequency !== undefined)) {`n      const metaUpdate = {};`n      if (body.subtaskPriority !== undefined) {`n        metaUpdate.priority = ['low', 'medium', 'high'].includes(body.subtaskPriority) ? body.subtaskPriority : 'medium';`n      }`n      if (Object.prototype.hasOwnProperty.call(body, 'subtaskDueDate')) {`n        metaUpdate.due_date = normalizeDueDate(body.subtaskDueDate);`n      }`n      if (body.subtaskFrequency !== undefined) {`n        const freq = ['weekly', 'monthly', 'yearly'].includes(body.subtaskFrequency) ? body.subtaskFrequency : null;`n        metaUpdate.frequency = freq;`n        metaUpdate.last_cycle_reset = freq ? new Date().toISOString() : null;`n      }`n      metaUpdate.updated_at = new Date().toISOString();`n`n      const { error: metaError } = await adminClient`n        .from('task_subtasks')`n        .update(metaUpdate)`n        .eq('id', body.subtaskId)`n        .eq('task_id', taskId);`n`n      if (metaError) {`n        return NextResponse.json({ error: metaError.message }, { status: 500 });`n      }`n`n      return NextResponse.json({ success: true, message: 'Subtask updated' });`n    }"

$count = 0
$pos = 0
while (($idx = $t.IndexOf($block, $pos)) -ge 0) { $count++; $pos = $idx + 1 }
Write-Host "Meta block count: $count"

if ($count -eq 2) {
    # Remove second occurrence
    $first = $t.IndexOf($block)
    $second = $t.IndexOf($block, $first + 1)
    # Remove second block plus the blank line before it
    $toRemove = "`n`n" + $block
    $afterFirst = $t.Substring($first + $block.Length)
    $secondInAfter = $afterFirst.IndexOf($block)
    if ($secondInAfter -ge 0) {
        $t = $t.Substring(0, $first + $block.Length) + $afterFirst.Substring($secondInAfter + $block.Length)
    }
    Write-Host 'Removed duplicate block'
}

[IO.File]::WriteAllText($p, $t)
Write-Host 'Done'
