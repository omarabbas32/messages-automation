import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/facebook_automation";

console.log("🔄 Connecting to MongoDB...");
mongoose.connect(MONGODB_URI)
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch((err) => console.error("❌ MongoDB connection error:", err));
const pageSchema = new mongoose.Schema({
    page_id: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    page_token: {
        type: String,
        required: true
    },
    page_name: {
        type: String,
        required: true
    },
    ai_enabled: {
        type: Boolean,
        default: true
    },
    ai_instructions: {
        type: String,
        default: "أنت مساعد خدمة عملاء محترف. قم بالرد على الرسائل بشكل مهذب ومفيد."
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

// Transform _id to id for JSON responses
pageSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (_, ret) => {
        ret.id = ret._id;
        delete ret._id;
    }
});

/**
 * Rule Schema - Stores keyword-reply mappings per page
 */
const ruleSchema = new mongoose.Schema({
    page_id: {
        type: String,
        required: true,
        index: true
    },
    keyword: {
        type: String,
        required: true
    },
    reply: {
        type: String,
        required: true
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

// Transform _id to id for JSON responses
ruleSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (_, ret) => {
        ret.id = ret._id;
        delete ret._id;
    }
});

// ==================== MODELS ====================

/**
 * Conversation History Schema - Stores recent messages for AI context
 */
const conversationSchema = new mongoose.Schema({
    page_id: {
        type: String,
        required: true,
        index: true
    },
    sender_id: {
        type: String,
        required: true,
        index: true
    },
    messages: [{
        role: {
            type: String,
            enum: ['user', 'assistant'],
            required: true
        },
        content: {
            type: String,
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    updated_at: {
        type: Date,
        default: Date.now
    }
});

// Create compound index for faster lookups
conversationSchema.index({ page_id: 1, sender_id: 1 });

const Page = mongoose.model("Page", pageSchema);
const Rule = mongoose.model("Rule", ruleSchema);
const Conversation = mongoose.model("Conversation", conversationSchema);

// ==================== PAGES OPERATIONS ====================

/**
 * Add a new Facebook Page
 */
export async function addPage(pageId, pageToken, pageName) {
    try {
        const page = await Page.create({
            page_id: pageId,
            page_token: pageToken,
            page_name: pageName
        });
        // Fire-and-forget: sync to Postgres + pgvector for semantic search
        import('./sync_to_pg.js').then(mod => mod.upsertPageToPg(page)).catch(err => {
            console.warn('Background sync to Postgres failed:', err?.message || err);
        });

        return { success: true, id: page._id };
    } catch (error) {
        if (error.code === 11000) {
            return { success: false, error: "Page ID already exists" };
        }
        throw error;
    }
}

/**
 * Get a specific page by page_id
 */
export async function getPage(pageId) {
    return await Page.findOne({ page_id: pageId });
}

/**
 * Get all pages
 */
export async function getAllPages() {
    const pages = await Page.find({}, { page_token: 0 }) // Exclude token from results
        .sort({ created_at: -1 })
        .lean();

    // Manually transform _id to id
    return pages.map(page => ({
        ...page,
        id: page._id.toString(),
        _id: undefined
    }));
}

/**
 * Delete a page by MongoDB _id
 */
export async function deletePage(id) {
    const result = await Page.findByIdAndDelete(id);

    // Also delete all app rules
    if (result) {
        await Rule.deleteMany({ page_id: result.page_id });
        // Remove from Postgres pages table if present
        import('./pg_database.js').then(mod => {
            mod.query('DELETE FROM pages WHERE page_id = $1', [result.page_id]).then(() => {
                console.log('✅ Removed page from Postgres:', result.page_id);
            }).catch(err => console.warn('❌ Failed to remove page from Postgres:', err?.message || err));
        }).catch(err => console.warn('❌ Failed to load pg_database for delete:', err?.message || err));
    }

    return result !== null;
}

/**
 * Update page AI settings
 */
export async function updatePageAI(id, aiEnabled, aiInstructions) {
    const updateData = {};

    if (aiEnabled !== undefined) updateData.ai_enabled = aiEnabled;
    if (aiInstructions !== undefined) updateData.ai_instructions = aiInstructions;

    const result = await Page.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
    );

    if (result) {
        // Fire-and-forget: re-sync updated page to Postgres
        import('./sync_to_pg.js').then(mod => mod.upsertPageToPg(result)).catch(err => {
            console.warn('Background sync to Postgres failed (update):', err?.message || err);
        });
    }

    return result !== null;
}

/**
 * Update page metadata (name, token)
 */
export async function updatePage(id, pageName, pageToken) {
    const updateData = {};
    if (pageName !== undefined) updateData.page_name = pageName;
    if (pageToken !== undefined) updateData.page_token = pageToken;

    const result = await Page.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
    );

    if (result) {
        // Fire-and-forget: re-sync updated page to Postgres
        import('./sync_to_pg.js').then(mod => mod.upsertPageToPg(result)).catch(err => {
            console.warn('Background sync to Postgres failed (updatePage):', err?.message || err);
        });
    }

    return result !== null;
}

export async function addRule(pageId, keyword, reply) {
    try {
        const page = await getPage(pageId);
        if (!page) {
            return { success: false, error: "Page not found" };
        }

        const rule = await Rule.create({
            page_id: pageId,
            keyword,
            reply
        });

        return { success: true, id: rule._id };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
export async function getRules(pageId) {
    const rules = await Rule.find({ page_id: pageId })
        .sort({ created_at: -1 })
        .lean();

    return rules.map(rule => ({
        ...rule,
        id: rule._id.toString(),
        _id: undefined
    }));
}

/**
 * Get all rules (for admin dashboard)
 */
export async function getAllRules() {
    return await Rule.find({})
        .sort({ page_id: 1, created_at: -1 })
        .lean();
}

/**
 * Delete a rule by MongoDB _id
 */
export async function deleteRule(id) {
    const result = await Rule.findByIdAndDelete(id);
    return result !== null;
}

/**
 * Update a rule
 */
export async function updateRule(id, keyword, reply) {
    const result = await Rule.findByIdAndUpdate(
        id,
        { keyword, reply },
        { new: true }
    );
    return result !== null;
}

// ==================== INITIALIZATION ====================

/**
 * Initialize database (create indexes)
 */
/**
 * Save or update conversation history
 */
export async function saveConversation(pageId, senderId, role, content) {
    try {
        await Conversation.findOneAndUpdate(
            { page_id: pageId, sender_id: senderId },
            {
                $push: {
                    messages: {
                        $each: [{ role, content, timestamp: new Date() }],
                        $slice: -10 // Keep only last 10 messages
                    }
                },
                $set: { updated_at: new Date() }
            },
            { upsert: true, new: true }
        );
    } catch (error) {
        console.error("Error saving conversation:", error);
    }
}

/**
 * Get conversation history
 */
export async function getConversation(pageId, senderId) {
    try {
        const conversation = await Conversation.findOne({
            page_id: pageId,
            sender_id: senderId
        }).lean();

        return conversation?.messages || [];
    } catch (error) {
        console.error("Error getting conversation:", error);
        return [];
    }
}

/**
 * Clear old conversations (older than 24 hours)
 */
export async function cleanupConversations() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    try {
        await Conversation.deleteMany({ updated_at: { $lt: oneDayAgo } });
    } catch (error) {
        console.error("Error cleaning conversations:", error);
    }
}

export async function initDatabase() {
    try {
        await Page.createIndexes();
        await Rule.createIndexes();
        await Conversation.createIndexes();
        console.log("✅ Database indexes created");

        // Clean up old conversations daily
        setInterval(cleanupConversations, 24 * 60 * 60 * 1000);
    } catch (error) {
        console.error("❌ Error creating indexes:", error);
    }
}

// Auto-initialize on module load
mongoose.connection.once("open", () => {
    initDatabase();
});

export default mongoose;
