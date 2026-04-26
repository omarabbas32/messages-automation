/**
 * Re-subscribe every existing page to its updated webhook fields.
 *
 * Run after bumping `subscribed_fields` (e.g. adding `feed` for FB so comment
 * events start arriving). New pages added through the bulk OAuth flow already
 * subscribe with the new fields automatically.
 *
 * Usage: node scripts/resubscribe_pages.js
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { query, close } from '../pg_database.js';

dotenv.config();

const FB_FIELDS = 'messages,messaging_postbacks,feed';
const IG_FIELDS = 'messages,comments';

async function run() {
    const { rows } = await query(
        `SELECT page_id, page_name, page_token, platform, ig_user_id FROM pages`,
        []
    );

    if (rows.length === 0) {
        console.log('No pages found.');
        return;
    }

    console.log(`Re-subscribing ${rows.length} page(s)...`);

    const results = { ok: 0, failed: 0 };

    for (const p of rows) {
        const isInstagram = p.platform === 'instagram';
        const targetId = isInstagram ? (p.ig_user_id || p.page_id) : p.page_id;
        const fields = isInstagram ? IG_FIELDS : FB_FIELDS;
        const url = `https://graph.facebook.com/v19.0/${targetId}/subscribed_apps`;

        try {
            await axios.post(url, null, {
                params: { access_token: p.page_token, subscribed_fields: fields }
            });
            console.log(`✅ [${p.platform}] ${p.page_name} (${targetId}) → ${fields}`);
            results.ok++;
        } catch (err) {
            const errBody = err.response?.data?.error || err.message;
            console.error(`❌ [${p.platform}] ${p.page_name} (${targetId}):`, errBody);
            results.failed++;
        }
    }

    console.log(`\nDone. ok=${results.ok} failed=${results.failed}`);
}

run()
    .catch(err => { console.error('Fatal:', err); process.exitCode = 1; })
    .finally(() => close());
