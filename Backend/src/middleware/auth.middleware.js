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

        // Query profiles for user's role and details
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            return res.status(401).json({ error: 'Unauthorized: Profile not found' });
        }

        const displayName = profile.display_name || profile.full_name || profile.name || user.user_metadata?.full_name || user.user_metadata?.name || (user.email ? user.email.split('@')[0] : 'Student');

        // Attach user id and role to the request object
        req.user = {
            id: user.id,
            role: profile.role,
            display_name: displayName,
            email: user.email || profile.email || ''
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
