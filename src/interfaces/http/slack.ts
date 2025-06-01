import express, { Request, Response } from 'express';
import { HandleOAuthUseCase } from '../../usecases/handle-oauth-usercase.js';
import { SlackRequestVerifierAdapter } from '../../infrastructure/adapters/slack-request-verifier.js';

export function createSlackRouter(
  handleOAuth: HandleOAuthUseCase,
  verifierAdapter: SlackRequestVerifierAdapter
) {
  const router = express.Router();

  router.get('/oauth_redirect', async (req: Request, res: Response) => {
    const code = req.query.code as string;
    await handleOAuth.execute(code);
    res.redirect('/success');
  });

  router.get('/onboard', async (req, res) => {
    // form html page to onboard
    console.log('Onboarding request:', req);

    res.send(`
      <html>
        <body>
          <h1>Onboarding</h1>
        </body>
      </html>
    `);
  })

  router.post('/onboard', express.urlencoded({extended:true}), async (req, res) => {
    const { teamId, plan, llmEndpoint } = req.body;
    // ToDo save to db by plan and llm, payment method, etc.
    console.log('Onboarding request:', { teamId, plan, llmEndpoint });
    res.json({
      ok: true,
      message: 'success onboarding',
    });
  })

  router.post('/events', async (req, res) => {
    await verifierAdapter.verify(req);
    res.sendStatus(200);
  })

  router.post('/commands', async (req, res) => {
    await verifierAdapter.verify(req);
    res.sendStatus(200);
  })

  router.post('/oauth/callback', async (req, res) => {
    try {
      console.log('OAuth callback received:', req.query);
      const { code, state } = req.query;

      // State is handled like csrf token.
      console.log('OAuth callback received:', { code, state });
      
      if (!code || typeof code !== 'string') {
        res.status(400).send('Authorization code is required');
        return;
      }

      const installation = await handleOAuth.execute(code as string);
      console.log('Installation created:', installation.teamId);

      res.send(`
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 500px; margin: 50px auto; text-align: center;">
            <h2>✅ Slack App Installed Successfully!</h2>
            <p>Your Slack workspace has been connected.</p>
            <p>Team ID: ${installation.teamId}</p>
            <p>You can now close this window and start using the app.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.status(500).send('Installation failed');
    }
  });

  return router;
}
