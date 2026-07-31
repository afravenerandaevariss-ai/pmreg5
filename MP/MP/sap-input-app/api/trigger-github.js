export default async function handler(req, res) {
  // Hanya jalankan jika method GET atau POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Token rahasia GitHub (Harus diset di Vercel Environment Variables)
  const GITHUB_TOKEN = process.env.GITHUB_PAT || '';
  const REPO_OWNER = 'afravenerandaevariss-ai';
  const REPO_NAME = 'pmreg5';
  const WORKFLOW_ID = 'whatsapp-bot.yml';

  try {
    const response = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/${WORKFLOW_ID}/dispatches`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref: 'main', // Branch utama
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub API responded with ${response.status}: ${errorText}`);
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Berhasil menendang server GitHub Actions untuk menjalankan laporan WA!' 
    });

  } catch (error) {
    console.error('Trigger Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
