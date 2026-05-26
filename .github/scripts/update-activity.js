const fs = require('fs');
const https = require('https');

const username = 'zengsipei';
const maxLines = 10;

function fetchEvents() {
  return new Promise((resolve, reject) => {
    https.get({
      hostname: 'api.github.com',
      path: `/users/${username}/events/public?per_page=100`,
      headers: { 'User-Agent': 'GitHub-Activity-Updater' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function formatEvent(event) {
  const repo = event.repo.name;
  const type = event.type;

  switch (type) {
    case 'PushEvent':
      const commits = event.payload.commits?.length || 0;
      if (commits === 0) return null;
      return `⬆️ Pushed ${commits} commit${commits > 1 ? 's' : ''} to [${repo}](https://github.com/${repo})`;
    case 'CreateEvent':
      const refType = event.payload.ref_type;
      return `🎉 Created ${refType} in [${repo}](https://github.com/${repo})`;
    case 'IssuesEvent':
      const action = event.payload.action;
      const issueNum = event.payload.issue?.number;
      if (!issueNum) return null;
      return `${action === 'opened' ? '❗' : '🔒'} ${action.charAt(0).toUpperCase() + action.slice(1)} issue [#${issueNum}](https://github.com/${repo}/issues/${issueNum}) in [${repo}](https://github.com/${repo})`;
    case 'PullRequestEvent':
      const prAction = event.payload.action;
      const prNum = event.payload.pull_request?.number;
      if (!prNum) return null;
      return `🔀 ${prAction.charAt(0).toUpperCase() + prAction.slice(1)} PR [#${prNum}](https://github.com/${repo}/pull/${prNum}) in [${repo}](https://github.com/${repo})`;
    case 'ForkEvent':
      return `🍴 Forked [${repo}](https://github.com/${repo})`;
    case 'WatchEvent':
      return `⭐ Starred [${repo}](https://github.com/${repo})`;
    default:
      return null;
  }
}

async function main() {
  const events = await fetchEvents();
  const lines = events
    .map(formatEvent)
    .filter(Boolean)
    .slice(0, maxLines);

  const readmePath = 'README.md';
  let readme = fs.readFileSync(readmePath, 'utf8');

  const startMarker = '<!--START_SECTION:activity-->';
  const endMarker = '<!--END_SECTION:activity-->';
  const startIdx = readme.indexOf(startMarker);
  const endIdx = readme.indexOf(endMarker);

  if (startIdx === -1 || endIdx === -1) {
    console.log('Activity markers not found');
    process.exit(1);
  }

  const newContent = lines.map((line, i) => `${i + 1}. ${line}`).join('\n');
  readme = readme.substring(0, startIdx + startMarker.length) + '\n' + newContent + '\n' + readme.substring(endIdx);

  fs.writeFileSync(readmePath, readme);
  console.log('Activity updated successfully');
}

main().catch(console.error);
