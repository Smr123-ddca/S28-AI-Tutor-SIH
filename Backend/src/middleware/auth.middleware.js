const { supabaseAdmin } = require('../lib/supabaseAdmin');

const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid authentication token' });
        }

        const token = authHeader.split(' ')[1];

        // Verify the token with Supabase admin
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }

        // Query profiles for user's role
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            return res.status(401).json({ error: 'Unauthorized: Profile not found' });
        }

        // Attach user id and role to the request object
        req.user = {
            id: user.id,
            role: profile.role
        };

        next();
    } catch (error) {
        console.error('Authentication Middleware Error:', error);
        res.status(500).json({ error: 'Internal Server Error during authentication' });
    }
};

const requireRole = (requiredRole) => {
    return (req, res, next) => {
        if (!req.user || req.user.role !== requiredRole) {
            return res.status(403).json({ error: 'Forbidden: Insufficient permissions for this resource' });
        }
        next();
    };
};

module.exports = { authenticate, requireRole };
