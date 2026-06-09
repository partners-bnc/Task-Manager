$f = 'c:\Users\anshu\Desktop\Task Manager\app\Taskmanager\components\TaskDetailPage.jsx'
$content = [System.IO.File]::ReadAllText($f)
$crlf = [char]13 + [char]10

# 1. Remove empty h2
$content = $content.Replace(
  "            <h2 className='mb-3 text-sm font-semibold text-slate-600'></h2>$($crlf)              {canManageSubtasks",
  "              {canManageSubtasks"
)

# 2. Fix broken emoji priority options — find by unique substring and replace whole select
$idx = $content.IndexOf('<option value="low">d')
if ($idx -gt 0) {
  $selectStart = $content.LastIndexOf('<select value={newSubtaskPriority}', $idx)
  $selectEnd = $content.IndexOf('</select>', $idx) + '</select>'.Length
  $oldSelect = $content.Substring($selectStart, $selectEnd - $selectStart)
  $newSelect = @'
<select value={newSubtaskPriority} onChange={(e) => setNewSubtaskPriority(e.target.value)} className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer border border-transparent hover:border-slate-200 hover:bg-slate-50 rounded px-1.5 py-1 w-full">
                      <option value="">No Priority</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
'@
  $content = $content.Replace($oldSelect, $newSelect.TrimEnd())
  Write-Host "STEP2 OK"
} else { Write-Host "STEP2 NO CHANGE" }

# 3. Remove dots span (BEL chars) from section header
$dotsPattern = "                            <span className='text-slate-300 text-xs ml-1'>" + [char]7 + [char]7 + [char]7 + "</span>$($crlf)"
$content = $content.Replace($dotsPattern, "")
if ($content.Contains([char]7)) { Write-Host "STEP3 dots still present" } else { Write-Host "STEP3 OK" }

# 4. Fix section header outer div: remove justify-between
$content = $content.Replace(
  "className='flex items-center justify-between py-2 cursor-pointer select-none group border-b border-slate-100 bg-slate-50/20 px-2 rounded-xl transition-colors hover:bg-slate-50/50'",
  "className='flex items-center gap-2 py-2 cursor-pointer select-none group border-b border-slate-100 bg-slate-50/20 px-2 rounded-xl transition-colors hover:bg-slate-50/50'"
)
Write-Host "STEP4 OK"

# 5. Fix + button inside section header to focus new input placeholder
$content = $content.Replace(
  "const input = document.querySelector('input[placeholder=""Add subtask...""]');$($crlf)                                if (input) {$($crlf)                                  input.focus();$($crlf)                                }",
  "document.querySelector('input[placeholder=""Type subtask name and press Enter...""]')?.focus();"
)
Write-Host "STEP5 OK"

# 6. Remove inline "Add Task" bottom row — find by unique marker
$addTaskStart = $content.IndexOf("{/* Inline Add Task row at bottom of list */}")
if ($addTaskStart -gt 0) {
  $addTaskEnd = $content.IndexOf(")}", $addTaskStart) + ")}".Length
  $oldAddTask = $content.Substring($addTaskStart, $addTaskEnd - $addTaskStart)
  $content = $content.Replace($oldAddTask, "")
  Write-Host "STEP6 OK"
} else { Write-Host "STEP6 NO CHANGE" }

# 7. Add deleteSubtask function before canEditSubtaskTitle
$content = $content.Replace(
  "  const canEditSubtaskTitle = (subtask) => {",
  "  const deleteSubtask = async (subtaskId) => {$($crlf)    if (!subtaskId || !canManageSubtasks) return;$($crlf)    if (!window.confirm('Delete this subtask? This cannot be undone.')) return;$($crlf)    try {$($crlf)      const res = await fetch(`/Taskmanager/api/tasks/${taskId}?subtaskId=${subtaskId}`, { method: 'DELETE' });$($crlf)      if (res.ok) { setSelectedSubtaskId(null); await loadTaskData(); }$($crlf)      else { const r = await res.json(); setError(r.error || 'Failed to delete subtask'); }$($crlf)    } catch { setError('Failed to delete subtask'); }$($crlf)  };$($crlf)$($crlf)  const canEditSubtaskTitle = (subtask) => {"
)
Write-Host "STEP7 OK"

# 8. Add Delete button in subtask modal header — find the close button area
$closeBtn = "                      <button$($crlf)                        type='button'$($crlf)                        onClick={() => setSelectedSubtaskId(null)}$($crlf)                        className='inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-800'$($crlf)                        aria-label='Close subtask details'$($crlf)                      >$($crlf)                        <X size={15} />$($crlf)                      </button>"
$newCloseArea = "                      <div className='flex items-center gap-2'>$($crlf)                        {canManageSubtasks && ($($crlf)                          <button$($crlf)                            type='button'$($crlf)                            onClick={() => deleteSubtask(selectedSubtask.id)}$($crlf)                            className='inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 hover:border-rose-300'$($crlf)                          >$($crlf)                            Delete$($crlf)                          </button>$($crlf)                        )}$($crlf)                        <button$($crlf)                          type='button'$($crlf)                          onClick={() => setSelectedSubtaskId(null)}$($crlf)                          className='inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-800'$($crlf)                          aria-label='Close subtask details'$($crlf)                        >$($crlf)                          <X size={15} />$($crlf)                        </button>$($crlf)                      </div>"
$c = $content.Replace($closeBtn, $newCloseArea)
if ($c -eq $content) { Write-Host "STEP8 NO CHANGE" } else { Write-Host "STEP8 OK"; $content = $c }

[System.IO.File]::WriteAllText($f, $content)
Write-Host "Done"
