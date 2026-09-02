import fetch from 'node-fetch';

async function testApi() {
  try {
    const res = await fetch('http://localhost:3000/other-modules/crm/api/lists');
    console.log("Response status:", res.status);
    const data = await res.json();
    console.log("API Response data:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("API test error:", err.message);
  }
}

testApi();
