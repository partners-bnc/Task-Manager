
const fs = require('fs');
const content = fs.readFileSync('app/Taskmanager/components/TaskDetailPage.jsx', 'utf8');
const lines = content.split('\n');

// The error says line 3464-3465 has unclosed elements.
// The section opens at line 1850. Let's scan 1850-3465.
const stack = [];
const voidTags = new Set(['input','br','hr','img','meta','link','area','base','col','embed','param','source','track','wbr','Avatar','AssigneePicker']);

for (let i = 1849; i <= 3464; i++) {
  const line = lines[i];
  let pos = 0;
  
  while (pos < line.length) {
    // Skip JSX expressions {}, strings, etc - just look for < characters
    if (line[pos] !== '<') { pos++; continue; }
    
    if (line[pos+1] === '/') {
      // Closing tag
      const end = line.indexOf('>', pos);
      if (end === -1) { pos++; continue; }
      const tagContent = line.slice(pos+2, end).trim();
      const tagName = tagContent.split(/[\s/]/)[0];
      // Pop from stack
      for (let k = stack.length - 1; k >= 0; k--) {
        if (stack[k].name.toLowerCase() === tagName.toLowerCase()) {
          stack.splice(k, 1);
          break;
        }
      }
      pos = end + 1;
    } else if (/[A-Za-z]/.test(line[pos+1] || '')) {
      // Opening tag - find closing >
      let end = pos + 1;
      let inStr = false;
      let strCh = '';
      while (end < line.length) {
        const c = line[end];
        if (!inStr && (c === '"' || c === "'")) { inStr = true; strCh = c; }
        else if (inStr && c === strCh) { inStr = false; }
        else if (!inStr && c === '>') break;
        end++;
      }
      if (end >= line.length) { pos++; continue; }
      
      const tagStr = line.slice(pos, end+1);
      const tagName = tagStr.slice(1).split(/[\s/>]/)[0];
      
      if (!tagStr.endsWith('/>') && !voidTags.has(tagName) && !voidTags.has(tagName.toLowerCase())) {
        stack.push({ name: tagName, line: i+1 });
      }
      pos = end + 1;
    } else {
      pos++;
    }
  }
}

console.log('Stack depth after line 3465:', stack.length);
console.log('Unclosed tags (last 20):');
stack.slice(-20).forEach(s => console.log('  ' + s.name + ' @ line ' + s.line));
