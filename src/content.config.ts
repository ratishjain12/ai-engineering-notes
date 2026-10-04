import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

// Posts dated in the future stay out of production builds, like drafts; the scheduled workflow redeploys once they are due.
const base = docsLoader();
const scheduledLoader: typeof base = {
	...base,
	async load(context) {
		await base.load(context);
		if (import.meta.env.DEV) return;
		for (const [id, entry] of context.store.entries()) {
			const date = entry.data.date;
			if (date instanceof Date && date.getTime() > Date.now()) context.store.delete(id);
		}
	},
};

export const collections = {
	docs: defineCollection({
		loader: scheduledLoader,
		schema: docsSchema({ extend: z.object({ date: z.coerce.date().optional() }) }),
	}),
};
