const fs = require('fs');

function scanSchema() {
  const buf = fs.readFileSync('supabase/schema.sql');
  // Try UTF-16 BE, LE, and UTF-8
  let str = '';
  if (buf[0] === 0xFF && buf[1] === 0xFE) {
    str = buf.toString('utf16le');
  } else if (buf[0] === 0xFE && buf[1] === 0xFF) {
    // UTF-16 BE is not native to toString, swap bytes
    const swapped = Buffer.from(buf);
    for (let i = 0; i < swapped.length; i += 2) {
      const temp = swapped[i];
      swapped[i] = swapped[i+1];
      swapped[i+1] = temp;
    }
    str = swapped.toString('utf16le');
  } else {
    str = buf.toString('utf8');
  }
  
  const lines = str.split(/\r?\n/);
  console.log('Total lines read:', lines.length);
  const found = [];
  lines.forEach((line, idx) => {
    if (line.toLowerCase().includes('create or replace function') || line.toLowerCase().includes('create function')) {
      found.push({ lineNum: idx + 1, text: line.trim() });
    }
  });
  
  console.log(`Found ${found.length} functions:`);
  found.slice(0, 50).forEach(f => console.log(`L${f.lineNum}: ${f.text}`));
}

scanSchema();
