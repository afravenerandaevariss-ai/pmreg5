async function fetchAllGids() {
  const pubhtmlUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTsA87B43S7y8HgSlEH4Wgu1-SQG8R0ZimWvhDlYJwETWoMKyV13R3hno660bDplBKpaS97nLMZBgUx/pubhtml';
  console.log('Fetching pubhtml:', pubhtmlUrl);
  const res = await fetch(pubhtmlUrl);
  const html = await res.text();

  console.log('HTML length:', html.length);
  const matches = [...html.matchAll(/item\s*:\s*\{\s*id\s*:\s*'([^']+)'\s*,\s*name\s*:\s*'([^']+)'/g)];
  if (matches.length > 0) {
    console.log('\nFound Tabs (GIDs):');
    matches.forEach(m => console.log(`  - Tab Name: "${m[2]}" | GID: "${m[1]}"`));
  } else {
    // Try regex for sheets
    const sheets = [...html.matchAll(/name:\s*"([^"]+)",\s*gid:\s*"(\d+)"/g)];
    console.log('Sheets regex matches:', sheets.map(s => ({ name: s[1], gid: s[2] })));

    // Search for any gid= in hrefs
    const hrefGids = [...html.matchAll(/gid=(\d+)["&']/g)];
    console.log('Found GID params:', [...new Set(hrefGids.map(h => h[1]))]);
  }
}

fetchAllGids();
