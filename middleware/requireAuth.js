import jwt from 'jsonwebtoken';

export async function requireAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
        }

        const token = authHeader.split(' ')[1];
        
        try {
            const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
            
            // Attach user data to request
            // userId = the string owner_id (e.g. 'user_123')
            // uId = the numeric id (pk)
            req.userId = decoded.userId;
            req.uId = decoded.id;
            
            next();
        } catch (verifyError) {
            console.error("❌ Token verification failed:", verifyError.message);
            return res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired token' });
        }
    } catch (err) {
        console.error("❌ Auth Error:", err.message);
        return res.status(500).json({ success: false, error: 'Internal Server Error during Authentication' });
    }
}
