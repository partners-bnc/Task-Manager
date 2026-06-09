$f = 'c:\Users\anshu\Desktop\Task Manager\app\Taskmanager\components\TaskDetailPage.jsx'
$content = [System.IO.File]::ReadAllText($f)
$crlf = [char]13 + [char]10

# ============================================================
# 1. Remove the empty h2 tag above the add-subtask form
# ============================================================
$old1 = "            <h2 className='mb-3 text-sm font-semibold text-slate-600'></h2>" + $crlf + "              {canManageSubtasks"
$new1 = "              {canManageSubtasks"
$c = $content.Replace($old1, $new1)
if ($c -eq $content) { Write-Host "STEP1 NO CHANGE" } else { Write-Host "STEP1 OK"; $content = $c }

# ============================================================
# 2. Fix priority select — remove emoji, add null/empty option
# ============================================================
$old2 = '<select value={newSubtaskPriority} onChange={(e) => setNewSubtaskPriority(e.target.value)} className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer border border-transparent hover:border-slate-200 hover:bg-slate-50 rounded px-1.5 py-1 w-full">' + $crlf +
'                      <option value="low">dY"æ Normal</option>' + $crlf +
'                      <option value="medium">dYYÿ High</option>' + $crlf +
'                      <option value="high">dY"' + "'" + ' Urgent</option>' + $crlf +
'                    </select>'
$new2 = '<select value={newSubtaskPriority} onChange={(e) => setNewSubtaskPriority(e.target.value)} className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer border border-transparent hover:border-slate-200 hover:bg-slate-50 rounded px-1.5 py-1 w-full">' + $crlf +
'                      <option value="">No Priority</option>' + $crlf +
'                      <option value="low">Low</option>' + $crlf +
'                      <option value="medium">Medium</option>' + $crlf +
'                      <option value="high">High</option>' + $crlf +
'                    </select>'
$c = $content.Replace($old2, $new2)
if ($c -eq $content) { Write-Host "STEP2 NO CHANGE — trying partial match" 
  # Partial: just find the broken option values
  $c = $content -replace [regex]::Escape('<option value="low">') + '.*?' + [regex]::Escape('</select>'), '<option value="">No Priority</option>' + $crlf + '                      <option value="low">Low</option>' + $crlf + '                      <option value="medium">Medium</option>' + $crlf + '                      <option value="high">High</option>' + $crlf + '                    </select>'
  if ($c -eq $content) { Write-Host "STEP2 STILL NO CHANGE" } else { Write-Host "STEP2 OK (partial)"; $content = $c }
} else { Write-Host "STEP2 OK"; $content = $c }

# ============================================================
# 3. Remove "• • •" dots span and move + button to right side
#    Current: chevron | STATUS_BADGE | count | •••  | + button
#    Wanted:  chevron | STATUS_BADGE | count | + button (aligned left, no dots)
# ============================================================
$old3 = "                            <span className='text-slate-300 text-xs ml-1'>" + [char]7 + [char]7 + [char]7 + "</span>" + $crlf +
"                            <button" + $crlf +
"                              type='button'" + $crlf +
"                              onClick={(e) => {" + $crlf +
"                                e.stopPropagation();" + $crlf +
"                                const input = document.querySelector('input[placeholder=""Add subtask...""]');" + $crlf +
"                                if (input) {" + $crlf +
"                                  input.focus();" + $crlf +
"                                }" + $crlf +
"                              }}" + $crlf +
"                              className='text-slate-400 hover:text-[#7F40EE] transition-colors p-1'" + $crlf +
"                            >" + $crlf +
"                              <Plus size={14} />" + $crlf +
"                            </button>"
$new3 = "                            <button" + $crlf +
"                              type='button'" + $crlf +
"                              onClick={(e) => { e.stopPropagation(); document.querySelector('input[placeholder=""Type subtask name and press Enter...""]')?.focus(); }}" + $crlf +
"                              className='text-slate-400 hover:text-[#7F40EE] transition-colors p-1'" + $crlf +
"                            >" + $crlf +
"                              <Plus size={14} />" + $crlf +
"                            </button>"
$c = $content.Replace($old3, $new3)
if ($c -eq $content) { Write-Host "STEP3 NO CHANGE" } else { Write-Host "STEP3 OK"; $content = $c }

# ============================================================
# 4. Fix section header: move left, remove justify-between, fix layout
#    Current outer div: flex items-center justify-between py-2 cursor-pointer ...
#    Wanted: just flex items-center (no justify-between), left-aligned
# ============================================================
$old4 = "                        <div" + $crlf +
"                          className='flex items-center justify-between py-2 cursor-pointer select-none group border-b border-slate-100 bg-slate-50/20 px-2 rounded-xl transition-colors hover:bg-slate-50/50'" + $crlf +
"                          onClick={() => toggleSectionCollapse(sectionStatus)}" + $crlf +
"                        >"
$new4 = "                        <div" + $crlf +
"                          className='flex items-center gap-2 py-2 cursor-pointer select-none group border-b border-slate-100 bg-slate-50/20 px-2 rounded-xl transition-colors hover:bg-slate-50/50'" + $crlf +
"                          onClick={() => toggleSectionCollapse(sectionStatus)}" + $crlf +
"                        >"
$c = $content.Replace($old4, $new4)
if ($c -eq $content) { Write-Host "STEP4 NO CHANGE" } else { Write-Host "STEP4 OK"; $content = $c }

# ============================================================
# 5. Remove the inline "Add Task" row at the bottom of each section
# ============================================================
$old5 = "                                {/* Inline Add Task row at bottom of list */}" + $crlf +
"                                {canManageSubtasks && (" + $crlf +
"                                  <div" + $crlf +
"                                    role='button'" + $crlf +
"                                    onClick={() => {" + $crlf +
"                                      const input = document.querySelector('input[placeholder=""Add subtask...""]');" + $crlf +
"                                      if (input) {" + $crlf +
"                                        input.focus();" + $crlf +
"                                      }" + $crlf +
"                                    }}" + $crlf +
"                                    className='flex items-center gap-2 py-2 px-3 hover:bg-slate-50/50 transition-colors text-xs text-slate-400 font-semibold cursor-pointer'" + $crlf +
"                                  >" + $crlf +
"                                    <Plus size={14} />" + $crlf +
"                                    <span>Add Task</span>" + $crlf +
"                                  </div>" + $crlf +
"                                )}"
$new5 = ""
$c = $content.Replace($old5, $new5)
if ($c -eq $content) { Write-Host "STEP5 NO CHANGE" } else { Write-Host "STEP5 OK"; $content = $c }

# ============================================================
# 6. Add deleteSubtask function before canEditSubtaskTitle
# ============================================================
$old6 = "  const canEditSubtaskTitle = (subtask) => {"
$new6 = "  const deleteSubtask = async (subtaskId) => {" + $crlf +
"    if (!subtaskId || !canManageSubtasks) return;" + $crlf +
"    if (!window.confirm('Delete this subtask? This cannot be undone.')) return;" + $crlf +
"    try {" + $crlf +
"      const res = await fetch(`/Taskmanager/api/tasks/${taskId}?subtaskId=${subtaskId}`, { method: 'DELETE' });" + $crlf +
"      if (res.ok) { setSelectedSubtaskId(null); await loadTaskData(); }" + $crlf +
"      else { const r = await res.json(); setError(r.error || 'Failed to delete subtask'); }" + $crlf +
"    } catch { setError('Failed to delete subtask'); }" + $crlf +
"  };" + $crlf + $crlf +
"  const canEditSubtaskTitle = (subtask) => {"
$c = $content.Replace($old6, $new6)
if ($c -eq $content) { Write-Host "STEP6 NO CHANGE" } else { Write-Host "STEP6 OK"; $content = $c }

# ============================================================
# 7. Add Delete button in subtask modal header (next to close button)
# ============================================================
$old7 = "                      <button" + $crlf +
"                        type='button'" + $crlf +
"                        onClick={() => setSelectedSubtaskId(null)}" + $crlf +
"                        className='inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-800'" + $crlf +
"                        aria-label='Close subtask details'" + $crlf +
"                      >" + $crlf +
"                        <X size={15} />" + $crlf +
"                      </button>"
$new7 = "                      <div className='flex items-center gap-2'>" + $crlf +
"                        {canManageSubtasks && (" + $crlf +
"                          <button" + $crlf +
"                            type='button'" + $crlf +
"                            onClick={() => deleteSubtask(selectedSubtask.id)}" + $crlf +
"                            className='inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 hover:border-rose-300'" + $crlf +
"                            aria-label='Delete subtask'" + $crlf +
"                          >" + $crlf +
"                            Delete" + $crlf +
"                          </button>" + $crlf +
"                        )}" + $crlf +
"                        <button" + $crlf +
"                          type='button'" + $crlf +
"                          onClick={() => setSelectedSubtaskId(null)}" + $crlf +
"                          className='inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-800'" + $crlf +
"                          aria-label='Close subtask details'" + $crlf +
"                        >" + $crlf +
"                          <X size={15} />" + $crlf +
"                        </button>" + $crlf +
"                      </div>"
$c = $content.Replace($old7, $new7)
if ($c -eq $content) { Write-Host "STEP7 NO CHANGE" } else { Write-Host "STEP7 OK"; $content = $c }

[System.IO.File]::WriteAllText($f, $content)
Write-Host "File written"
