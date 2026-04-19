import * as XLSX from 'xlsx';
import { getEmbedding } from './embedding_service.js';
import { query as pgQuery } from './pg_database.js';

/**
 * Process an uploaded Excel/CSV buffer and store in pgvector
 * Every row becomes a searchable chunk for the AI.
 */
export async function processExcelInventory(pageId, buffer) {
    try {
        console.log(`📊 Processing Excel inventory for page: ${pageId}`);
        
        // 1. Read the workbook from memory buffer
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (!data || data.length === 0) {
            throw new Error("The Excel file is empty or formatted incorrectly.");
        }

        console.log(`Found ${data.length} items. Syncing to vector database...`);

        // 2. Clear old inventory for ONLY this specific page and doc_type
        await pgQuery("DELETE FROM page_documents WHERE page_id = $1 AND doc_type = 'excel_inventory'", [pageId]);

        // 3. Convert rows to embeddings and store
        let successCount = 0;
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            
            // Format row into a descriptive sentence the AI can understand
            // Example: "Product: iPhone, Price: 1000, Stock: 5"
            const context = Object.entries(row)
                .map(([key, val]) => `${key}: ${val}`)
                .join(', ');
            
            try {
                // Generate embedding for the row context
                const emb = await getEmbedding(context);
                const vec = '[' + emb.join(',') + ']';
                const docId = `inv_${pageId}_${i}_${Date.now()}`;

                await pgQuery(
                    `INSERT INTO page_documents (page_id, doc_id, doc_type, content, embedding)
                     VALUES ($1, $2, 'excel_inventory', $3, $4::vector)
                     ON CONFLICT (doc_id) DO UPDATE
                     SET content = EXCLUDED.content,
                         embedding = EXCLUDED.embedding`,
                    [pageId, docId, context, vec]
                );
                successCount++;
            } catch (embErr) {
                console.warn(`⚠️ Failed to embed row ${i}:`, embErr.message);
            }
        }

        console.log(`✅ Successfully synced ${successCount} products for page ${pageId}`);
        return { success: true, count: successCount };
    } catch (error) {
        console.error('❌ Excel Processor Error:', error.message);
        throw error;
    }
}
