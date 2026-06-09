const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing env vars');
  process.exit(1);
}

fetch(url + '/rest/v1/task_subtasks?limit=1', {
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`
  }
})
.then(r => r.json())
.then(d => {
  console.log('Columns in task_subtasks:', d.length > 0 ? Object.keys(d[0]) : 'No rows found');
  console.log('Sample row:', d[0]);
})
.catch(e => console.error(e));
