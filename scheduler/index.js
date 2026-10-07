// GitHub's `schedule` trigger is throttled and can skip hours; Cloudflare crons are reliable.
// This worker just pokes the workflow, which does the due-post check, deploy and email.
export default {
	async scheduled(_event, env) {
		const res = await fetch(
			`https://api.github.com/repos/${env.GITHUB_REPO}/actions/workflows/notify-subscribers.yml/dispatches`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${env.GITHUB_TOKEN}`,
					Accept: 'application/vnd.github+json',
					'User-Agent': 'learn-ai-scheduler',
				},
				body: JSON.stringify({ ref: 'main' }),
			},
		);
		if (!res.ok) throw new Error(`workflow dispatch failed: ${res.status} ${await res.text()}`);
	},
};
