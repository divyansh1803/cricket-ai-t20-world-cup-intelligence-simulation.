import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

interface PitchForecastRequestBody {
  stadiumName?: string;
  soilProfile?: string;
  temperature?: number;
  humidity?: number;
  dewLevel?: number;
  initialWear?: number;
  grassCoverage?: number;
}

function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', aiConfigured: Boolean(getGenAIClient()) });
  });

  app.post('/api/pitch-forecast', async (req: Request, res: Response) => {
    const ai = getGenAIClient();
    if (!ai) {
      res.status(503).json({
        code: 'MISSING_API_KEY',
        error: 'GEMINI_API_KEY is not configured on the server; using calibrated physics model.',
      });
      return;
    }

    const body = (req.body || {}) as PitchForecastRequestBody;
    const stadiumName = String(body.stadiumName || 'Narendra Modi Stadium, Ahmedabad');
    const soilProfile = String(body.soilProfile || 'Hard Bulli Clay');
    const temperature = Number.isFinite(body.temperature) ? Number(body.temperature) : 31;
    const humidity = Number.isFinite(body.humidity) ? Number(body.humidity) : 52;
    const dewLevel = Number.isFinite(body.dewLevel) ? Number(body.dewLevel) : 34;
    const initialWear = Number.isFinite(body.initialWear) ? Number(body.initialWear) : 22;
    const grassCoverage = Number.isFinite(body.grassCoverage) ? Number(body.grassCoverage) : 58;

    const prompt = `You are an elite T20 cricket turf physicist and tactical pitch analyst.
Generate a realistic 20-over Pitch Degradation Forecast showing how the cricket pitch evolves from a firmer/harder early surface toward a scuffed/dustier surface across Overs 1 to 20.

Input Conditions:
- Venue: ${stadiumName}
- Soil Matrix: ${soilProfile}
- Ambient Temperature: ${temperature}°C
- Relative Humidity: ${humidity}%
- Evening Dew Index: ${dewLevel}%
- Starting Surface Wear: ${initialWear}%
- Live Grass Binding: ${grassCoverage}%

Physics constraints:
1. Return exactly 20 items in "overs" (from over 1 to over 20 in ascending order).
2. "spinDeg" must be realistic T20 spin deviation in degrees (between 1.1 and 5.6). If dewLevel > 65%, spin grip slightly dips or plateaus in overs 16-20 due to wet-ball skidding; otherwise spin rises steadily as topsoil dust increases.
3. "spinImpactIndex" (0-100) reflects overall spin threat & bite off the surface.
4. "bounceCarryIndex" (0-100) reflects true pace carry & steepness (starts higher on hard clay, gradually decreases as crust softens/abrades).
5. "dustDensityPct" (0-100) monotonically increases from early hard-rolled state toward dusty footmarks by Over 20.
6. "hardnessKpa" (210-560) represents Clegg-hammer topsoil hardness in kPa, gradually decreasing with spike traffic and moisture.
7. "inflectionOver" (integer 6-17) marks the key tactical over where surface abrasion/dust shifts bowling advantage or changes batting tempo.
8. Keep text fields crisp, domain-authentic, and clearly grounded as predictive match simulation analysis.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        surfaceHeadline: {
          type: Type.STRING,
          description: 'Short broadcast headline summarizing the 20-over hard-to-dusty shift.',
        },
        inflectionOver: {
          type: Type.INTEGER,
          description: 'Over number (6-17) where surface degradation creates a tactical inflection.',
        },
        aiConfidencePct: {
          type: Type.INTEGER,
          description: 'Model confidence percentage between 78 and 95.',
        },
        spinDeltaSummary: {
          type: Type.STRING,
          description: 'Concise quantitative summary of spin turn evolution across 20 overs.',
        },
        bounceDeltaSummary: {
          type: Type.STRING,
          description: 'Concise quantitative summary of bounce carry and variability across 20 overs.',
        },
        captaincyDirective: {
          type: Type.STRING,
          description: '2-sentence tactical bowling and batting plan across Powerplay, Middle, and Death overs.',
        },
        overs: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              over: { type: Type.INTEGER },
              spinDeg: { type: Type.NUMBER },
              spinImpactIndex: { type: Type.INTEGER },
              bounceCarryIndex: { type: Type.INTEGER },
              dustDensityPct: { type: Type.INTEGER },
              hardnessKpa: { type: Type.INTEGER },
              textureStage: { type: Type.STRING },
            },
            required: [
              'over',
              'spinDeg',
              'spinImpactIndex',
              'bounceCarryIndex',
              'dustDensityPct',
              'hardnessKpa',
              'textureStage',
            ],
          },
        },
      },
      required: [
        'surfaceHeadline',
        'inflectionOver',
        'aiConfidencePct',
        'spinDeltaSummary',
        'bounceDeltaSummary',
        'captaincyDirective',
        'overs',
      ],
    };

    const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
    let lastError: unknown = null;

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema,
          },
        });

        const rawText = response.text;
        if (!rawText) {
          throw new Error(`Empty response from ${modelName}`);
        }

        const parsed = JSON.parse(rawText);
        res.json({ ...parsed, modelUsed: modelName });
        return;
      } catch (err: unknown) {
        lastError = err;
        const status =
          typeof err === 'object' && err !== null && 'status' in err && typeof (err as { status?: unknown }).status === 'number'
            ? (err as { status: number }).status
            : 500;
        const errText = err instanceof Error ? err.message : String(err);
        const isTransientOrQuota =
          status === 503 ||
          status === 429 ||
          /quota|429|503|resource_exhausted|unavailable|rate/i.test(errText);
        // Retry next approved Flash model on transient 503/429 or quota exhaustion
        if (!isTransientOrQuota) {
          break;
        }
      }
    }

    const status =
      typeof lastError === 'object' && lastError !== null && 'status' in lastError && typeof (lastError as { status?: unknown }).status === 'number'
        ? (lastError as { status: number }).status
        : 500;
    const message = lastError instanceof Error ? lastError.message : 'Failed to generate AI pitch degradation forecast.';
    console.error('[/api/pitch-forecast] Gemini error:', message);
    res.status(status >= 400 && status < 600 ? status : 500).json({ code: 'UPSTREAM_ERROR', error: message });
  });

  app.all('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({ code: 'NOT_FOUND', error: 'API endpoint not found.' });
  });

  const distPath = path.join(__dirname, 'dist');
  const distIndexPath = path.join(distPath, 'index.html');
  const publicPath = path.join(__dirname, 'public');
  const isStartScript = process.env.npm_lifecycle_event === 'start';
  const isRunningUnderTsx =
    process.execArgv.some((arg) => arg.includes('tsx')) ||
    Boolean(process.env.__TSX_LOADER__);
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    isStartScript ||
    (!isRunningUnderTsx && fs.existsSync(distIndexPath));

  if (!isProduction) {
    let viteMiddleware: express.RequestHandler | null = null;
    const viteReady = (async () => {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        root: __dirname,
        configFile: path.join(__dirname, 'vite.config.ts'),
        server: {
          middlewareMode: true,
          allowedHosts: true,
          hmr: process.env.DISABLE_HMR !== 'true',
          watch: process.env.DISABLE_HMR === 'true' ? null : {},
        },
        appType: 'spa',
      });
      viteMiddleware = vite.middlewares;
      return vite.middlewares;
    })();

    viteReady.catch((err) => {
      console.error('Failed to initialize Vite middleware:', err);
    });

    app.use(async (req, res, next) => {
      try {
        const mw = viteMiddleware ?? (await viteReady);
        mw(req, res, next);
      } catch (err) {
        next(err);
      }
    });
  } else {
    app.use(
      '/assets',
      express.static(path.join(distPath, 'assets'), {
        maxAge: '1y',
        immutable: true,
      })
    );
    app.use(express.static(distPath, { maxAge: '1h' }));
    if (fs.existsSync(publicPath)) {
      app.use(express.static(publicPath, { maxAge: '1h' }));
    }
    app.get('*', (_req: Request, res: Response) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(distIndexPath);
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Cricket AI server listening on http://0.0.0.0:${PORT} (${isProduction ? 'production' : 'development'})`);
  });

  const shutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
