// Health check endpoint to diagnose API configuration issues
module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const health = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'production',
            version: '1.0.0',
            checks: {
                anthropicKey: {
                    configured: !!process.env.ANTHROPIC_API_KEY,
                    format: process.env.ANTHROPIC_API_KEY
                        ? (process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-') ? 'valid' : 'invalid')
                        : 'missing',
                    length: process.env.ANTHROPIC_API_KEY?.length || 0
                },
                openaiKey: {
                    configured: !!process.env.OPENAI_API_KEY,
                    format: process.env.OPENAI_API_KEY
                        ? (process.env.OPENAI_API_KEY.startsWith('sk-') ? 'valid' : 'invalid')
                        : 'missing',
                    length: process.env.OPENAI_API_KEY?.length || 0
                }
            }
        };

        // Determine overall status
        if (!health.checks.anthropicKey.configured) {
            health.status = 'error';
            health.message = 'ANTHROPIC_API_KEY is not configured. Please add it in Vercel environment variables.';
        } else if (health.checks.anthropicKey.format !== 'valid') {
            health.status = 'error';
            health.message = 'ANTHROPIC_API_KEY format is invalid. It should start with "sk-ant-".';
        } else if (!health.checks.openaiKey.configured) {
            health.status = 'warning';
            health.message = 'OPENAI_API_KEY is not configured. Image generation will not work.';
        }

        const statusCode = health.status === 'error' ? 500 : 200;
        res.status(statusCode).json(health);

    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Health check failed',
            error: error.message
        });
    }
};
