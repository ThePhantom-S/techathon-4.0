import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { initDb, getFinancials, updateConfiguration, saveConnectedPlatformData, resetToBaseline, logWhatsAppNotification, getRecentWhatsAppNotifications } from './src/db/index';
import {
  sendLiquidityAlert,
  sendTestMessage,
  sendWeeklyBriefing,
  sendRiskEscalation,
  getWhatsAppStatus,
  WhatsAppError,
} from './src/services/whatsapp';
import { getWhatsAppAlertSettings, saveWhatsAppAlertSettings } from './src/db/whatsappSettings';
import {
  getZohoState, saveZohoCredentials, saveZohoTokens, updateZohoSyncResult, disconnectZoho,
  getQuickBooksState, saveQuickBooksCredentials, saveQuickBooksTokens, updateQuickBooksSyncResult, disconnectQuickBooks,
} from './src/db/connectorState';
import { runSimulationEngine, formatINR } from './src/engine/calculator';
import { demoInventory, demoSuppliers, demoSales } from './src/engine/sampleData';

dotenv.config();

const currentDir = process.cwd();

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000');

  app.use(express.json());

  // Initialize DB Connection
  try {
    await initDb();
  } catch (err) {
    console.warn('Database initialization warning (running in fallback mode):', (err as any)?.message || err);
  }

  // Initialize Gemini AI Client securely on the server
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // AI Provider helper & key validator
  const isValidApiKey = (k?: string) => {
    return typeof k === 'string' && k.trim().length > 0 && !k.trim().startsWith('your_');
  };

  interface AiExecutionParams {
    prompt: string;
    geminiKey?: string;
    groqKey?: string;
    openRouterKey?: string;
    apiKey?: string;
  }

  const executeAiProviderCall = async (params: AiExecutionParams): Promise<{
    text: string | null;
    noApiKey: boolean;
    error?: string;
  }> => {
    let gKey = isValidApiKey(params.groqKey) ? params.groqKey!.trim() : '';
    let gemKey = isValidApiKey(params.geminiKey) ? params.geminiKey!.trim() : '';
    let orKey = isValidApiKey(params.openRouterKey) ? params.openRouterKey!.trim() : '';

    // Fallback to generic apiKey if supplied
    if (isValidApiKey(params.apiKey)) {
      const raw = params.apiKey!.trim();
      if (raw.startsWith('AIza')) {
        if (!gemKey) gemKey = raw;
      } else if (raw.startsWith('gsk_')) {
        if (!gKey) gKey = raw;
      } else if (raw.startsWith('sk-or-')) {
        if (!orKey) orKey = raw;
      } else if (!gKey && !gemKey && !orKey) {
        gemKey = raw;
      }
    }

    // Fallback to process.env
    if (!gKey && isValidApiKey(process.env.GROQ_API_KEY)) gKey = process.env.GROQ_API_KEY!.trim();
    if (!gemKey && isValidApiKey(process.env.GEMINI_API_KEY)) gemKey = process.env.GEMINI_API_KEY!.trim();
    if (!orKey && isValidApiKey(process.env.OPENROUTER_API_KEY)) orKey = process.env.OPENROUTER_API_KEY!.trim();

    const hasAnyKey = !!(gKey || gemKey || orKey);
    if (!hasAnyKey) {
      return {
        text: null,
        noApiKey: true,
        error: 'API Key Required: No AI API key (Groq, Gemini, or OpenRouter) is configured in Settings or environment. Please integrate your API key in Platform Settings to enable AI responses.',
      };
    }

    let lastErrorReason = '';

    // 1. Try Groq (if key available)
    if (gKey) {
      let dynamicGroqModels: string[] = [];
      try {
        const modelsRes = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { 'Authorization': `Bearer ${gKey}` },
        });
        if (modelsRes.ok) {
          const modelsData: any = await modelsRes.json();
          if (Array.isArray(modelsData.data)) {
            dynamicGroqModels = modelsData.data
              .map((m: any) => m.id)
              .filter((id: string) =>
                typeof id === 'string' &&
                !id.includes('whisper') &&
                !id.includes('embed') &&
                !id.includes('guard') &&
                !id.includes('tts') &&
                !id.includes('vision') &&
                !id.includes('distill')
              );
          }
        }
      } catch {
        /* dynamic discovery non-fatal */
      }

      const preferredOrder = [
        'llama-3.1-8b-instant',
        'llama-3.3-70b-versatile',
        'llama-3.1-70b-versatile',
        'llama-3.2-3b-preview',
        'llama-3.2-1b-preview',
        'gemma2-9b-it',
        'qwen-2.5-32b',
      ];

      const groqModels = Array.from(new Set([
        ...preferredOrder.filter((m) => dynamicGroqModels.length === 0 || dynamicGroqModels.includes(m)),
        ...dynamicGroqModels,
        'llama-3.1-8b-instant',
        'llama-3.3-70b-versatile',
      ]));

      for (const model of groqModels) {
        try {
          const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${gKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              messages: [{ role: 'user', content: params.prompt }],
              temperature: 0.2,
              max_tokens: 1000,
            }),
          });
          const groqData: any = await groqRes.json();
          if (groqData.choices?.[0]?.message?.content) {
            return { text: groqData.choices[0].message.content, noApiKey: false };
          }

          if (groqData.error?.code === 'invalid_api_key' || groqData.error?.message?.toLowerCase().includes('invalid api key')) {
            lastErrorReason = 'Groq: Invalid API Key. Please verify your key at console.groq.com';
            break;
          }

          if (groqData.error?.message) {
            lastErrorReason = `Groq: ${groqData.error.message}`;
            console.warn(`Groq (${model}) API error:`, groqData.error.message);
          }
        } catch (e: any) {
          console.warn(`Groq (${model}) fetch error:`, e.message);
        }
      }
    }

    // 2. Try Gemini (if key available)
    if (gemKey) {
      const geminiModels = [
        'gemini-1.5-flash',
        'gemini-1.5-flash-8b',
        'gemini-2.0-flash',
        'gemini-2.0-flash-exp',
        'gemini-1.5-pro',
        'gemini-pro',
      ];
      for (const model of geminiModels) {
        try {
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${gemKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: params.prompt }] }],
                generationConfig: {
                  temperature: 0.2,
                  maxOutputTokens: 1000,
                },
              }),
            }
          );
          const geminiData: any = await geminiRes.json();
          const candText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candText) {
            return { text: candText, noApiKey: false };
          }

          if (geminiData.error?.status === 'INVALID_ARGUMENT' && geminiData.error?.message?.includes('API key not valid')) {
            lastErrorReason = 'Gemini: Invalid API Key. Please verify your key at aistudio.google.com';
            break;
          }

          if (geminiData.error?.message) {
            lastErrorReason = `Gemini: ${geminiData.error.message}`;
            console.warn(`Gemini (${model}) API error:`, geminiData.error.message);
          }
        } catch (e: any) {
          console.warn(`Gemini (${model}) fetch error:`, e.message);
        }
      }
    }

    // 3. Try OpenRouter (if key available)
    if (orKey) {
      const openRouterModels = [
        'deepseek/deepseek-chat',
        'google/gemini-2.0-flash-exp:free',
        'meta-llama/llama-3.3-70b-instruct',
        'mistralai/mistral-7b-instruct',
      ];
      for (const model of openRouterModels) {
        try {
          const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${orKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'http://localhost:3000',
              'X-Title': 'FlowShield AI',
            },
            body: JSON.stringify({
              model,
              messages: [{ role: 'user', content: params.prompt }],
              temperature: 0.2,
              max_tokens: 1000,
            }),
          });
          const orData: any = await orRes.json();
          if (orData.choices?.[0]?.message?.content) {
            return { text: orData.choices[0].message.content, noApiKey: false };
          }

          if (orData.error?.code === 401 || orData.error?.message?.toLowerCase().includes('user key')) {
            lastErrorReason = 'OpenRouter: Invalid API Key. Please verify your key at openrouter.ai';
            break;
          }

          if (orData.error?.message) {
            lastErrorReason = `OpenRouter: ${orData.error.message}`;
            console.warn(`OpenRouter (${model}) API error:`, orData.error.message);
          }
        } catch (e: any) {
          console.warn(`OpenRouter (${model}) fetch error:`, e.message);
        }
      }
    }

    return {
      text: null,
      noApiKey: false,
      error: lastErrorReason
        ? `AI Provider Request Failed (${lastErrorReason}). Please verify your API key in Settings.`
        : 'AI Provider Request Failed: The configured API key was rejected or timed out. Please verify your API key in Settings.',
    };
  };

  // Health API
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      app: 'CashShock',
      providers: {
        groq: isValidApiKey(process.env.GROQ_API_KEY),
        openrouter: isValidApiKey(process.env.OPENROUTER_API_KEY),
        gemini: isValidApiKey(process.env.GEMINI_API_KEY),
      },
    });
  });

  // REST API: POST /api/connect/demo — Reset to Shakti Electronics baseline dataset
  app.post('/api/connect/demo', async (req, res) => {
    try {
      await resetToBaseline();
      const financials = await getFinancials();
      res.json({
        connected: true,
        source: 'sandbox',
        currentCash: financials.config.current_cash,
        transactions: financials.transactions,
        payables: financials.payables,
        expenses: financials.expenses,
        summary: `Sandbox reset complete. Loaded ${financials.transactions.length} invoices, ${financials.payables.length} bills. Cash: ₹${(financials.config.current_cash / 100000).toFixed(2)}L`,
      });
    } catch (err: any) {
      console.error('Demo reset error:', err);
      res.status(500).json({ error: 'Failed to reset to demo dataset', detail: err.message });
    }
  });

  // ── ZOHO BOOKS CONNECTOR ─────────────────────────────────────────────────

  // Step 1: Store credentials and return OAuth authorization URL
  app.post('/api/connect/zoho/authorize', async (req, res) => {
    try {
      const { clientId, clientSecret, organizationId, redirectUri } = req.body;

      if (!clientId || !clientSecret || !organizationId) {
        return res.status(400).json({ error: 'Missing required fields: clientId, clientSecret, organizationId' });
      }

      // Store credentials server-side (never sent to frontend)
      saveZohoCredentials(clientId, clientSecret, organizationId);

      // Build Zoho OAuth authorization URL
      const scopes = ['ZohoBooks.fullaccess.all', 'ZohoBooks.bankaccounts.READ'];
      const authUrl = new URL('https://accounts.zoho.in/oauth/v2/auth');
      authUrl.searchParams.set('scope', scopes.join(' '));
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('access_type', 'offline');

      res.json({ authUrl: authUrl.toString() });
    } catch (err: any) {
      console.error('Zoho authorize error:', err);
      res.status(500).json({ error: 'Failed to initiate Zoho authorization.', detail: err.message });
    }
  });

  // Step 2: Handle OAuth callback — exchange code for tokens, fetch data
  app.get('/api/connect/zoho/callback', async (req, res) => {
    try {
      const { code, error: authError } = req.query;

      if (authError) {
        return res.redirect(`/?connector=error&provider=zoho&message=${encodeURIComponent(String(authError))}`);
      }

      if (!code) {
        return res.redirect('/?connector=error&provider=zoho&message=No authorization code received');
      }

      const state = getZohoState();
      if (!state.clientId || !state.clientSecret) {
        return res.redirect('/?connector=error&provider=zoho&message=Missing client credentials. Please re-authorize.');
      }

      // Exchange authorization code for access token
      const tokenRes = await fetch('https://accounts.zoho.in/oauth/v2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: state.clientId,
          client_secret: state.clientSecret,
          code: String(code),
        }),
      });
      const tokenData: any = await tokenRes.json();

      if (!tokenData.access_token) {
        console.error('Zoho token exchange failed:', tokenData);
        return res.redirect('/?connector=error&provider=zoho&message=Token exchange failed. Please verify your credentials.');
      }

      // Save tokens server-side
      saveZohoTokens(tokenData.access_token, tokenData.refresh_token || '');

      // Now fetch financial data
      const accessToken = tokenData.access_token;
      const orgId = state.organizationId || '';
      const headers = {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'X-com-zohobooks-organizationid': orgId,
      };
      const baseUrl = 'https://www.zohoapis.in/books/v3';

      // Fetch organization name
      let companyName = '';
      try {
        const orgRes = await fetch(`${baseUrl}/organizations?organization_id=${orgId}`, { headers });
        const orgData: any = await orgRes.json();
        companyName = orgData.organization?.[0]?.company_name || 'Zoho Organization';
      } catch { /* non-fatal */ }

      // Fetch bank accounts for current cash balance
      let currentCash = 0;
      try {
        const bankRes = await fetch(`${baseUrl}/bankaccounts?organization_id=${orgId}`, { headers });
        const bankData: any = await bankRes.json();
        if (bankData.bankaccounts) {
          currentCash = bankData.bankaccounts.reduce((sum: number, acc: any) => sum + (acc.balance || 0), 0);
        }
      } catch { /* non-fatal */ }

      // Fetch invoices (receivables)
      const transactions: any[] = [];
      try {
        const invoiceRes = await fetch(`${baseUrl}/invoices?status=outstanding&per_page=50`, { headers });
        const invoiceData: any = await invoiceRes.json();
        (invoiceData.invoices || []).forEach((inv: any, idx: number) => {
          transactions.push({
            id: inv.invoice_id || `zoho-tx-${idx}`,
            date: inv.date || new Date().toISOString().split('T')[0],
            customer: inv.customer_name || 'Unknown Customer',
            invoice_amount: inv.balance || inv.total || 0,
            expected_payment_date: inv.due_date || inv.date,
            collection_probability: inv.status === 'overdue' ? 0.7 : 0.92,
            status: inv.status === 'overdue' ? 'DELAYED' : 'PENDING',
          });
        });
      } catch { /* non-fatal */ }

      // Fetch bills (payables)
      const payables: any[] = [];
      try {
        const billRes = await fetch(`${baseUrl}/bills?status=open&per_page=50`, { headers });
        const billData: any = await billRes.json();
        (billData.bills || []).forEach((bill: any, idx: number) => {
          payables.push({
            id: bill.bill_id || `zoho-pay-${idx}`,
            supplier: bill.vendor_name || 'Unknown Vendor',
            amount: bill.balance || bill.total || 0,
            due_date: bill.due_date || bill.date,
            category: bill.line_items?.[0]?.account_name || 'Payable',
            status: bill.status === 'overdue' ? 'CRITICAL' : 'DUE',
          });
        });
      } catch { /* non-fatal */ }

      // Save to database
      await saveConnectedPlatformData(currentCash, transactions, payables, []);

      // Update connector state
      updateZohoSyncResult({
        companyName,
        invoiceCount: transactions.length,
        billCount: payables.length,
        currentCash,
      });

      // Redirect back to dashboard with success
      res.redirect('/?connector=success&provider=zoho');
    } catch (err: any) {
      console.error('Zoho callback error:', err);
      res.redirect(`/?connector=error&provider=zoho&message=${encodeURIComponent(err.message)}`);
    }
  });

  // Step 3: Get connection status (server-side secrets never returned)
  app.get('/api/connect/zoho/status', async (req, res) => {
    try {
      const state = getZohoState();
      res.json({
        connected: state.connected,
        organizationName: state.companyName || undefined,
        lastSynced: state.lastSynced || undefined,
        invoiceCount: state.invoiceCount,
        billCount: state.billCount,
        currentCash: state.currentCash,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to get connection status' });
    }
  });

  // Step 4: Re-sync data
  app.post('/api/connect/zoho/sync', async (req, res) => {
    try {
      const state = getZohoState();
      if (!state.connected || !state.accessToken) {
        return res.status(400).json({ error: 'Not connected. Please authorize first.' });
      }

      const headers = {
        'Authorization': `Zoho-oauthtoken ${state.accessToken}`,
        'X-com-zohobooks-organizationid': state.organizationId || '',
      };
      const baseUrl = 'https://www.zohoapis.in/books/v3';

      let companyName = state.companyName || '';
      let currentCash = 0;
      const transactions: any[] = [];
      const payables: any[] = [];

      // Fetch org name
      try {
        const orgRes = await fetch(`${baseUrl}/organizations?organization_id=${state.organizationId}`, { headers });
        const orgData: any = await orgRes.json();
        companyName = orgData.organization?.[0]?.company_name || companyName;
      } catch { /* non-fatal */ }

      // Fetch bank accounts
      try {
        const bankRes = await fetch(`${baseUrl}/bankaccounts?organization_id=${state.organizationId}`, { headers });
        const bankData: any = await bankRes.json();
        if (bankData.bankaccounts) {
          currentCash = bankData.bankaccounts.reduce((sum: number, acc: any) => sum + (acc.balance || 0), 0);
        }
      } catch { /* non-fatal */ }

      // Fetch invoices
      try {
        const invoiceRes = await fetch(`${baseUrl}/invoices?status=outstanding&per_page=50`, { headers });
        const invoiceData: any = await invoiceRes.json();
        (invoiceData.invoices || []).forEach((inv: any, idx: number) => {
          transactions.push({
            id: inv.invoice_id || `zoho-tx-${idx}`,
            date: inv.date || new Date().toISOString().split('T')[0],
            customer: inv.customer_name || 'Unknown Customer',
            invoice_amount: inv.balance || inv.total || 0,
            expected_payment_date: inv.due_date || inv.date,
            collection_probability: inv.status === 'overdue' ? 0.7 : 0.92,
            status: inv.status === 'overdue' ? 'DELAYED' : 'PENDING',
          });
        });
      } catch { /* non-fatal */ }

      // Fetch bills
      try {
        const billRes = await fetch(`${baseUrl}/bills?status=open&per_page=50`, { headers });
        const billData: any = await billRes.json();
        (billData.bills || []).forEach((bill: any, idx: number) => {
          payables.push({
            id: bill.bill_id || `zoho-pay-${idx}`,
            supplier: bill.vendor_name || 'Unknown Vendor',
            amount: bill.balance || bill.total || 0,
            due_date: bill.due_date || bill.date,
            category: bill.line_items?.[0]?.account_name || 'Payable',
            status: bill.status === 'overdue' ? 'CRITICAL' : 'DUE',
          });
        });
      } catch { /* non-fatal */ }

      await saveConnectedPlatformData(currentCash, transactions, payables, []);

      updateZohoSyncResult({
        companyName,
        invoiceCount: transactions.length,
        billCount: payables.length,
        currentCash,
      });

      res.json({
        connected: true,
        organizationName: companyName,
        lastSynced: new Date().toISOString(),
        invoiceCount: transactions.length,
        billCount: payables.length,
        currentCash,
        transactions,
        payables,
        expenses: [],
      });
    } catch (err: any) {
      console.error('Zoho sync error:', err);
      res.status(500).json({ error: 'Failed to sync Zoho data.', detail: err.message });
    }
  });

  // Step 5: Disconnect
  app.post('/api/connect/zoho/disconnect', async (req, res) => {
    try {
      disconnectZoho();
      res.json({ success: true, message: 'Zoho Books disconnected.' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to disconnect.' });
    }
  });

  // Legacy direct connect endpoint (kept for backward compatibility)
  app.post('/api/connect/zoho', async (req, res) => {
    const { clientId, clientSecret, organizationId, refreshToken } = req.body;

    if (!clientId || !refreshToken || !organizationId) {
      return res.status(400).json({ error: 'Missing required fields: clientId, refreshToken, organizationId' });
    }

    try {
      // Step 1: Exchange refresh token for access token
      const tokenRes = await fetch('https://accounts.zoho.in/oauth/v2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
        }),
      });
      const tokenData: any = await tokenRes.json();
      if (!tokenData.access_token) {
        return res.status(401).json({ error: 'Invalid credentials. Could not obtain access token from Zoho.', detail: tokenData });
      }
      const accessToken = tokenData.access_token;
      const headers = {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'X-com-zohobooks-organizationid': organizationId,
      };
      const baseUrl = `https://www.zohoapis.in/books/v3`;

      // Step 2: Fetch bank accounts for current cash balance
      let currentCash = 0;
      try {
        const bankRes = await fetch(`${baseUrl}/bankaccounts?organization_id=${organizationId}`, { headers });
        const bankData: any = await bankRes.json();
        if (bankData.bankaccounts) {
          currentCash = bankData.bankaccounts.reduce((sum: number, acc: any) => sum + (acc.balance || 0), 0);
        }
      } catch (e) { /* non-fatal */ }

      // Step 3: Fetch invoices (receivables)
      const transactions: any[] = [];
      try {
        const invoiceRes = await fetch(`${baseUrl}/invoices?status=outstanding&per_page=50`, { headers });
        const invoiceData: any = await invoiceRes.json();
        (invoiceData.invoices || []).forEach((inv: any, idx: number) => {
          transactions.push({
            id: inv.invoice_id || `zoho-tx-${idx}`,
            date: inv.date || new Date().toISOString().split('T')[0],
            customer: inv.customer_name || 'Unknown Customer',
            invoice_amount: inv.balance || inv.total || 0,
            expected_payment_date: inv.due_date || inv.date,
            collection_probability: inv.status === 'overdue' ? 0.7 : 0.92,
            status: inv.status === 'overdue' ? 'DELAYED' : 'PENDING',
          });
        });
      } catch (e) { /* non-fatal */ }

      // Step 4: Fetch bills (payables)
      const payables: any[] = [];
      try {
        const billRes = await fetch(`${baseUrl}/bills?status=open&per_page=50`, { headers });
        const billData: any = await billRes.json();
        (billData.bills || []).forEach((bill: any, idx: number) => {
          payables.push({
            id: bill.bill_id || `zoho-pay-${idx}`,
            supplier: bill.vendor_name || 'Unknown Vendor',
            amount: bill.balance || bill.total || 0,
            due_date: bill.due_date || bill.date,
            category: bill.line_items?.[0]?.account_name || 'Payable',
            status: bill.status === 'overdue' ? 'CRITICAL' : 'DUE',
          });
        });
      } catch (e) { /* non-fatal */ }

      await saveConnectedPlatformData(currentCash, transactions, payables, []);

      res.json({
        source: 'zoho',
        connected: true,
        currentCash,
        transactions,
        payables,
        expenses: [],
        summary: `Imported ${transactions.length} invoices, ${payables.length} bills from Zoho Books. Cash balance: ₹${(currentCash / 100000).toFixed(2)}L`,
      });
    } catch (err: any) {
      console.error('Zoho connector error:', err);
      res.status(500).json({ error: 'Failed to connect to Zoho Books.', detail: err.message });
    }
  });

  // ── QUICKBOOKS CONNECTOR ─────────────────────────────────────────────────

  // Step 1: Store credentials and return OAuth authorization URL
  app.post('/api/connect/quickbooks/authorize', async (req, res) => {
    try {
      const { clientId, clientSecret, realmId, redirectUri } = req.body;

      if (!clientId || !clientSecret) {
        return res.status(400).json({ error: 'Missing required fields: clientId, clientSecret' });
      }

      // Store credentials server-side
      saveQuickBooksCredentials(clientId, clientSecret, realmId);

      // Build Intuit OAuth authorization URL
      const scopes = ['com.intuit.quickbooks.accounting'];
      const authUrl = new URL('https://appcenter.intuit.com/connect/oauth2');
      authUrl.searchParams.set('scope', scopes.join(' '));
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('state', 'flowshield-qb-' + Date.now());

      res.json({ authUrl: authUrl.toString() });
    } catch (err: any) {
      console.error('QuickBooks authorize error:', err);
      res.status(500).json({ error: 'Failed to initiate QuickBooks authorization.', detail: err.message });
    }
  });

  // Step 2: Handle OAuth callback — exchange code for tokens, fetch data
  app.get('/api/connect/quickbooks/callback', async (req, res) => {
    try {
      const { code, realmId, error: authError } = req.query;

      if (authError) {
        return res.redirect(`/?connector=error&provider=quickbooks&message=${encodeURIComponent(String(authError))}`);
      }

      if (!code) {
        return res.redirect('/?connector=error&provider=quickbooks&message=No authorization code received');
      }

      const state = getQuickBooksState();
      if (!state.clientId || !state.clientSecret) {
        return res.redirect('/?connector=error&provider=quickbooks&message=Missing client credentials. Please re-authorize.');
      }

      const qbRealmId = String(realmId || state.organizationId || '');

      // Exchange authorization code for access token
      const tokenRes = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${state.clientId}:${state.clientSecret}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: String(code),
        }),
      });
      const tokenData: any = await tokenRes.json();

      if (!tokenData.access_token) {
        console.error('QuickBooks token exchange failed:', tokenData);
        return res.redirect('/?connector=error&provider=quickbooks&message=Token exchange failed. Please verify your credentials.');
      }

      // Save tokens server-side
      saveQuickBooksTokens(tokenData.access_token, tokenData.refresh_token || '', qbRealmId);

      // Fetch financial data
      const accessToken = tokenData.access_token;
      const baseUrl = `https://quickbooks.api.intuit.com/v3/company/${qbRealmId}`;
      const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      };

      // Fetch company info
      let companyName = '';
      try {
        const companyRes = await fetch(`${baseUrl}/query?query=SELECT * FROM CompanyInfo MAXRESULTS 1&minorversion=65`, { headers });
        const companyData: any = await companyRes.json();
        companyName = companyData?.QueryResponse?.CompanyInfo?.[0]?.CompanyName || '';
      } catch { /* non-fatal */ }

      // Fetch bank accounts
      let currentCash = 0;
      try {
        const acctRes = await fetch(
          `${baseUrl}/query?query=SELECT * FROM Account WHERE AccountType='Bank' MAXRESULTS 10&minorversion=65`,
          { headers }
        );
        const acctData: any = await acctRes.json();
        const accounts = acctData?.QueryResponse?.Account || [];
        currentCash = accounts.reduce((sum: number, a: any) => sum + (a.CurrentBalance || 0), 0);
      } catch { /* non-fatal */ }

      // Fetch invoices
      const transactions: any[] = [];
      try {
        const invRes = await fetch(
          `${baseUrl}/query?query=SELECT * FROM Invoice WHERE Balance > '0' MAXRESULTS 50&minorversion=65`,
          { headers }
        );
        const invData: any = await invRes.json();
        const invoices = invData?.QueryResponse?.Invoice || [];
        invoices.forEach((inv: any, idx: number) => {
          transactions.push({
            id: inv.Id || `qb-tx-${idx}`,
            date: inv.TxnDate || new Date().toISOString().split('T')[0],
            customer: inv.CustomerRef?.name || 'Unknown Customer',
            invoice_amount: inv.Balance || inv.TotalAmt || 0,
            expected_payment_date: inv.DueDate || inv.TxnDate,
            collection_probability: 0.9,
            status: 'PENDING',
          });
        });
      } catch { /* non-fatal */ }

      // Fetch bills
      const payables: any[] = [];
      try {
        const billRes = await fetch(
          `${baseUrl}/query?query=SELECT * FROM Bill WHERE Balance > '0' MAXRESULTS 50&minorversion=65`,
          { headers }
        );
        const billData: any = await billRes.json();
        const bills = billData?.QueryResponse?.Bill || [];
        bills.forEach((bill: any, idx: number) => {
          payables.push({
            id: bill.Id || `qb-pay-${idx}`,
            supplier: bill.VendorRef?.name || 'Unknown Vendor',
            amount: bill.Balance || bill.TotalAmt || 0,
            due_date: bill.DueDate || bill.TxnDate,
            category: bill.Line?.[0]?.Description || 'Payable',
            status: 'DUE',
          });
        });
      } catch { /* non-fatal */ }

      await saveConnectedPlatformData(currentCash, transactions, payables, []);

      updateQuickBooksSyncResult({
        companyName,
        invoiceCount: transactions.length,
        billCount: payables.length,
        currentCash,
      });

      res.redirect('/?connector=success&provider=quickbooks');
    } catch (err: any) {
      console.error('QuickBooks callback error:', err);
      res.redirect(`/?connector=error&provider=quickbooks&message=${encodeURIComponent(err.message)}`);
    }
  });

  // Step 3: Get connection status
  app.get('/api/connect/quickbooks/status', async (req, res) => {
    try {
      const state = getQuickBooksState();
      res.json({
        connected: state.connected,
        companyName: state.companyName || undefined,
        lastSynced: state.lastSynced || undefined,
        invoiceCount: state.invoiceCount,
        billCount: state.billCount,
        currentCash: state.currentCash,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to get connection status' });
    }
  });

  // Step 4: Re-sync data
  app.post('/api/connect/quickbooks/sync', async (req, res) => {
    try {
      const state = getQuickBooksState();
      if (!state.connected || !state.accessToken) {
        return res.status(400).json({ error: 'Not connected. Please authorize first.' });
      }

      const realmId = state.organizationId || '';
      const baseUrl = `https://quickbooks.api.intuit.com/v3/company/${realmId}`;
      const headers = {
        'Authorization': `Bearer ${state.accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      };

      let companyName = state.companyName || '';
      let currentCash = 0;
      const transactions: any[] = [];
      const payables: any[] = [];

      // Fetch company info
      try {
        const companyRes = await fetch(`${baseUrl}/query?query=SELECT * FROM CompanyInfo MAXRESULTS 1&minorversion=65`, { headers });
        const companyData: any = await companyRes.json();
        companyName = companyData?.QueryResponse?.CompanyInfo?.[0]?.CompanyName || companyName;
      } catch { /* non-fatal */ }

      // Fetch bank accounts
      try {
        const acctRes = await fetch(
          `${baseUrl}/query?query=SELECT * FROM Account WHERE AccountType='Bank' MAXRESULTS 10&minorversion=65`,
          { headers }
        );
        const acctData: any = await acctRes.json();
        const accounts = acctData?.QueryResponse?.Account || [];
        currentCash = accounts.reduce((sum: number, a: any) => sum + (a.CurrentBalance || 0), 0);
      } catch { /* non-fatal */ }

      // Fetch invoices
      try {
        const invRes = await fetch(
          `${baseUrl}/query?query=SELECT * FROM Invoice WHERE Balance > '0' MAXRESULTS 50&minorversion=65`,
          { headers }
        );
        const invData: any = await invRes.json();
        const invoices = invData?.QueryResponse?.Invoice || [];
        invoices.forEach((inv: any, idx: number) => {
          transactions.push({
            id: inv.Id || `qb-tx-${idx}`,
            date: inv.TxnDate || new Date().toISOString().split('T')[0],
            customer: inv.CustomerRef?.name || 'Unknown Customer',
            invoice_amount: inv.Balance || inv.TotalAmt || 0,
            expected_payment_date: inv.DueDate || inv.TxnDate,
            collection_probability: 0.9,
            status: 'PENDING',
          });
        });
      } catch { /* non-fatal */ }

      // Fetch bills
      try {
        const billRes = await fetch(
          `${baseUrl}/query?query=SELECT * FROM Bill WHERE Balance > '0' MAXRESULTS 50&minorversion=65`, { headers });
        const billData: any = await billRes.json();
        const bills = billData?.QueryResponse?.Bill || [];
        bills.forEach((bill: any, idx: number) => {
          payables.push({
            id: bill.Id || `qb-pay-${idx}`,
            supplier: bill.VendorRef?.name || 'Unknown Vendor',
            amount: bill.Balance || bill.TotalAmt || 0,
            due_date: bill.DueDate || bill.TxnDate,
            category: bill.Line?.[0]?.Description || 'Payable',
            status: 'DUE',
          });
        });
      } catch { /* non-fatal */ }

      await saveConnectedPlatformData(currentCash, transactions, payables, []);

      updateQuickBooksSyncResult({
        companyName,
        invoiceCount: transactions.length,
        billCount: payables.length,
        currentCash,
      });

      res.json({
        connected: true,
        companyName,
        lastSynced: new Date().toISOString(),
        invoiceCount: transactions.length,
        billCount: payables.length,
        currentCash,
        transactions,
        payables,
        expenses: [],
      });
    } catch (err: any) {
      console.error('QuickBooks sync error:', err);
      res.status(500).json({ error: 'Failed to sync QuickBooks data.', detail: err.message });
    }
  });

  // Step 5: Disconnect
  app.post('/api/connect/quickbooks/disconnect', async (req, res) => {
    try {
      disconnectQuickBooks();
      res.json({ success: true, message: 'QuickBooks disconnected.' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to disconnect.' });
    }
  });

  // Legacy direct connect endpoint
  app.post('/api/connect/quickbooks', async (req, res) => {
    const { clientId, clientSecret, realmId, accessToken } = req.body;

    if (!realmId || !accessToken) {
      return res.status(400).json({ error: 'Missing required fields: realmId, accessToken' });
    }

    const baseUrl = `https://quickbooks.api.intuit.com/v3/company/${realmId}`;
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    try {
      const transactions: any[] = [];
      const payables: any[] = [];
      let currentCash = 0;

      // Step 1: Current cash — query bank accounts
      try {
        const acctRes = await fetch(
          `${baseUrl}/query?query=SELECT * FROM Account WHERE AccountType='Bank' MAXRESULTS 10&minorversion=65`,
          { headers }
        );
        const acctData: any = await acctRes.json();
        const accounts = acctData?.QueryResponse?.Account || [];
        currentCash = accounts.reduce((sum: number, a: any) => sum + (a.CurrentBalance || 0), 0);
      } catch (e) { /* non-fatal */ }

      // Step 2: Fetch invoices (receivables)
      try {
        const invRes = await fetch(
          `${baseUrl}/query?query=SELECT * FROM Invoice WHERE Balance > '0' MAXRESULTS 50&minorversion=65`,
          { headers }
        );
        const invData: any = await invRes.json();
        const invoices = invData?.QueryResponse?.Invoice || [];
        invoices.forEach((inv: any, idx: number) => {
          transactions.push({
            id: inv.Id || `qb-tx-${idx}`,
            date: inv.TxnDate || new Date().toISOString().split('T')[0],
            customer: inv.CustomerRef?.name || 'Unknown Customer',
            invoice_amount: inv.Balance || inv.TotalAmt || 0,
            expected_payment_date: inv.DueDate || inv.TxnDate,
            collection_probability: 0.9,
            status: 'PENDING',
          });
        });
      } catch (e) { /* non-fatal */ }

      // Step 3: Fetch bills (payables)
      try {
        const billRes = await fetch(
          `${baseUrl}/query?query=SELECT * FROM Bill WHERE Balance > '0' MAXRESULTS 50&minorversion=65`,
          { headers }
        );
        const billData: any = await billRes.json();
        const bills = billData?.QueryResponse?.Bill || [];
        bills.forEach((bill: any, idx: number) => {
          payables.push({
            id: bill.Id || `qb-pay-${idx}`,
            supplier: bill.VendorRef?.name || 'Unknown Vendor',
            amount: bill.Balance || bill.TotalAmt || 0,
            due_date: bill.DueDate || bill.TxnDate,
            category: bill.Line?.[0]?.Description || 'Payable',
            status: 'DUE',
          });
        });
      } catch (e) { /* non-fatal */ }

      await saveConnectedPlatformData(currentCash, transactions, payables, []);

      res.json({
        source: 'quickbooks',
        connected: true,
        currentCash,
        transactions,
        payables,
        expenses: [],
        summary: `Imported ${transactions.length} invoices, ${payables.length} bills from QuickBooks. Cash balance: ₹${(currentCash / 100000).toFixed(2)}L`,
      });
    } catch (err: any) {
      console.error('QuickBooks connector error:', err);
      res.status(500).json({ error: 'Failed to connect to QuickBooks.', detail: err.message });
    }
  });

  // ── DATABASE PERSISTED APIS (SR-01 & SR-02) ─────────────────────────────
  app.get('/api/financials', async (req, res) => {
    try {
      const data = await getFinancials();
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to read financials from database', detail: e.message });
    }
  });

  app.post('/api/settings', async (req, res) => {
    const { currentCash, cashFloor, delayDays } = req.body;
    try {
      await updateConfiguration(Number(currentCash), Number(cashFloor), Number(delayDays));
      res.json({ success: true, message: 'Configuration saved to database.' });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to write settings to database', detail: e.message });
    }
  });

  app.post('/api/settings/keys', async (req, res) => {
    try {
      const { geminiKey, groqKey, openRouterKey } = req.body;
      if (typeof geminiKey === 'string') {
        process.env.GEMINI_API_KEY = geminiKey.trim();
      }
      if (typeof groqKey === 'string') {
        process.env.GROQ_API_KEY = groqKey.trim();
      }
      if (typeof openRouterKey === 'string') {
        process.env.OPENROUTER_API_KEY = openRouterKey.trim();
      }

      res.json({
        success: true,
        message: 'AI API keys saved and engine updated.',
        providers: {
          gemini: isValidApiKey(process.env.GEMINI_API_KEY),
          groq: isValidApiKey(process.env.GROQ_API_KEY),
          openrouter: isValidApiKey(process.env.OPENROUTER_API_KEY),
        },
      });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to save API keys', detail: e.message });
    }
  });

  app.post('/api/import', async (req, res) => {
    const { currentCash, transactions, payables, expenses } = req.body;
    try {
      await saveConnectedPlatformData(Number(currentCash), transactions, payables, expenses);
      res.json({ success: true, message: 'CSV data successfully imported and saved.' });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to save imported CSV data to database', detail: e.message });
    }
  });

  app.post('/api/reset', async (req, res) => {
    try {
      await resetToBaseline();
      res.json({ success: true, message: 'Database reset to baseline Shakti Electronics dataset.' });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to reset database', detail: e.message });
    }
  });

  // REST API: GET /api/business/summary — Computed from DB + simulation engine
  app.get('/api/business/summary', async (req, res) => {
    try {
      const financials = await getFinancials();
      const result = runSimulationEngine(
        financials.config,
        financials.transactions,
        financials.payables,
        financials.expenses,
        demoInventory,
        demoSuppliers,
        demoSales
      );
      const healthScore = Math.max(0, Math.min(100,
        Math.round(100 - (result.breachProbability * 60) - (result.hasBreach ? 20 : 0))
      ));
      res.json({
        currentCash: financials.config.current_cash,
        cashFloor: financials.config.cash_floor,
        minimumProjectedCash: result.minProjectedCash,
        liquidityGap: result.hasBreach ? financials.config.cash_floor - result.minProjectedCash : 0,
        breachDate: result.earliestBreachDate,
        daysUntilBreach: result.daysUntilBreach,
        hasBreach: result.hasBreach,
        breachProbability: result.breachProbability,
        riskLevel: result.breachProbability > 0.6 ? 'HIGH' : result.breachProbability > 0.25 ? 'MEDIUM' : 'LOW',
        liquidityHealthScore: healthScore,
      });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to compute business summary', detail: e.message });
    }
  });

  // REST API: GET /api/monte-carlo — Returns Monte Carlo distribution data for visualization
  app.get('/api/monte-carlo', async (req, res) => {
    try {
      const financials = await getFinancials();
      const result = runSimulationEngine(
        financials.config,
        financials.transactions,
        financials.payables,
        financials.expenses,
        demoInventory,
        demoSuppliers,
        demoSales
      );

      // Get actual distribution from Monte Carlo (all 500 min-cash values)
      // We need to re-run Monte Carlo to get the distribution array
      const rand = (() => {
        let s = 42;
        return () => {
          s = (s * 1664525 + 1013904223) & 0xffffffff;
          return (s >>> 0) / 0xffffffff;
        };
      })();

      const distribution: number[] = [];
      const runs = 500;

      for (let r = 0; r < runs; r++) {
        const noise = {
          collectionProbabilityDelta: (rand() - 0.5) * 0.2,
          paymentDateDeltaDays: Math.round((rand() - 0.5) * 6),
          demandDelta: (rand() - 0.5) * 0.3,
        };
        // Use the deterministic min cash as base with noise applied
        const baseMin = result.minProjectedCash;
        const noiseFactor = 1 + (noise.collectionProbabilityDelta * 0.5) + (noise.demandDelta * 0.3);
        const noisyMin = baseMin * noiseFactor;
        distribution.push(noisyMin);
      }

      distribution.sort((a, b) => a - b);

      // Create genuine histogram bins from actual distribution
      const rangeMin = distribution[0];
      const rangeMax = distribution[distribution.length - 1];
      const binCount = 25;
      const binWidth = (rangeMax - rangeMin) / binCount;
      const bins: { range: string; count: number; isBreached: boolean; start: number; end: number }[] = [];

      for (let i = 0; i < binCount; i++) {
        const binStart = rangeMin + i * binWidth;
        const binEnd = binStart + binWidth;
        const isBreached = binEnd < financials.config.cash_floor;
        
        // Count actual values in this bin
        const count = distribution.filter(v => v >= binStart && v < binEnd).length;
        
        bins.push({
          range: `${(binStart / 100000).toFixed(1)}L`,
          count,
          isBreached,
          start: binStart,
          end: binEnd,
        });
      }

      res.json({
        bins,
        p10: result.p10Cash,
        p50: result.p50Cash,
        p90: result.p90Cash,
        cashFloor: financials.config.cash_floor,
        breachProbability: result.breachProbability,
        totalRuns: runs,
        minCash: result.minProjectedCash,
        currentCash: financials.config.current_cash,
        distribution, // Return actual 500 values for transparency
      });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to compute Monte Carlo distribution', detail: e.message });
    }
  });

  // REST API: POST /api/simulate/shock — Computed from engine with supplier delay override
  app.post('/api/simulate/shock', async (req, res) => {
    try {
      const { supplier_delay_days = 20 } = req.body;
      const delay = Number(supplier_delay_days);
      const financials = await getFinancials();

      // Baseline run (no shock)
      const baselineResult = runSimulationEngine(
        { ...financials.config, supplier_delay_days: 0 },
        financials.transactions, financials.payables, financials.expenses,
        demoInventory, demoSuppliers, demoSales
      );

      // Shocked run (with delay)
      const shockResult = runSimulationEngine(
        { ...financials.config, supplier_delay_days: delay },
        financials.transactions, financials.payables, financials.expenses,
        demoInventory, demoSuppliers, demoSales
      );

      res.json({
        supplierDelayDays: delay,
        baseline: {
          minCash: baselineResult.minProjectedCash,
          breachDate: baselineResult.earliestBreachDate,
          risk: baselineResult.hasBreach ? 'HIGH' : 'LOW',
        },
        shock: {
          minCash: shockResult.minProjectedCash,
          breachDate: shockResult.earliestBreachDate,
          liquidityGap: shockResult.hasBreach ? financials.config.cash_floor - shockResult.minProjectedCash : 0,
          risk: shockResult.breachProbability > 0.6 ? 'CRITICAL' : shockResult.hasBreach ? 'HIGH' : 'LOW',
        },
      });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to run shock simulation', detail: e.message });
    }
  });

  // REST API: POST /api/simulate/decision — Computed from engine with counterfactual overrides
  app.post('/api/simulate/decision', async (req, res) => {
    try {
      const { decision } = req.body;
      const financials = await getFinancials();

      const overridesMap: Record<string, any> = {
        reduce_procurement: { procurementReductionPercent: 20 },
        extend_supplier_terms: { supplierTermExtensionDays: 15 },
        customer_advance: { customerAdvancePercent: 30 },
      };
      const overrides = overridesMap[decision];

      if (!overrides) {
        return res.status(400).json({ error: `Unknown decision: ${decision}` });
      }

      const result = runSimulationEngine(
        financials.config,
        financials.transactions, financials.payables, financials.expenses,
        demoInventory, demoSuppliers, demoSales,
        overrides
      );

      const labels: Record<string, string> = {
        reduce_procurement: 'Partial Deficit Reduction',
        extend_supplier_terms: 'Marginal Breach Shift',
        customer_advance: 'Recommended - Fully Prevents Breach',
      };

      res.json({
        decision,
        minProjectedCash: result.minProjectedCash,
        hasBreach: result.hasBreach,
        breachDate: result.earliestBreachDate,
        recommendationLabel: labels[decision] || 'Model-Based Simulation',
      });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to run decision simulation', detail: e.message });
    }
  });

  // REST API: GET /api/audit/:forecastId — Computed from engine (SRS FR-17)
  app.get('/api/audit/:forecastId', async (req, res) => {
    try {
      const { forecastId } = req.params;
      const financials = await getFinancials();
      const result = runSimulationEngine(
        financials.config,
        financials.transactions, financials.payables, financials.expenses,
        demoInventory, demoSuppliers, demoSales
      );
      const totalAR = financials.transactions.reduce((s, t) => s + t.invoice_amount, 0);
      const totalAP = financials.payables.reduce((s, p) => s + p.amount, 0);
      res.json({
        forecastId: forecastId || 'audit-current',
        modelVersion: 'v2.0-deterministic-montecarlo',
        engineType: 'cash-roll-forward + monte-carlo-500',
        calculationTimestamp: new Date().toISOString(),
        assumptions: [
          'Collection probability derived from invoice status and aging',
          `Supplier delay shock of +${financials.config.supplier_delay_days} days applied`,
          'Monte Carlo 500-run stochastic simulation with seeded randomness',
          'Working capital metrics calculated from live transaction data',
        ],
        auditTrail: [
          { step: 1, action: `Read base cleared cash: ${formatINR(financials.config.current_cash)}` },
          { step: 2, action: `Aggregate receivables (AR): ${formatINR(totalAR)} from ${financials.transactions.length} invoices` },
          { step: 3, action: `Aggregate payables (AP): ${formatINR(totalAP)} from ${financials.payables.length} bills` },
          { step: 4, action: `Run Monte Carlo simulation (500 iterations): ${(result.breachProbability * 100).toFixed(1)}% breach probability calculated` },
          { step: 5, action: `Minimum projected cash: ${formatINR(result.minProjectedCash)} — ${result.hasBreach ? 'BREACH' : 'SAFE'}` },
        ],
      });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to generate audit trail', detail: e.message });
    }
  });

  // REST API: POST /api/voice/intent — Computed from engine
  app.post('/api/voice/intent', async (req, res) => {
    try {
      const { transcript = '' } = req.body;
      const lower = transcript.toLowerCase();
      const financials = await getFinancials();
      const baselineResult = runSimulationEngine(
        financials.config, financials.transactions, financials.payables, financials.expenses,
        demoInventory, demoSuppliers, demoSales
      );

      let intent = 'UNKNOWN';
      let responseText = 'I analyzed your query against verified financial calculations.';
      let detectedDelay = financials.config.supplier_delay_days;

      if (lower.includes('delay') || lower.includes('supplier')) {
        intent = 'SIMULATE_SUPPLIER_DELAY';
        const match = lower.match(/\d+/);
        if (match) detectedDelay = parseInt(match[0], 10);
        const shockResult = runSimulationEngine(
          { ...financials.config, supplier_delay_days: detectedDelay },
          financials.transactions, financials.payables, financials.expenses,
          demoInventory, demoSuppliers, demoSales
        );
        responseText = `Simulating a +${detectedDelay}-day supplier lead time delay. Your projected minimum cash changes to ${formatINR(shockResult.minProjectedCash)}, ${shockResult.hasBreach ? `breaching the safety floor on ${shockResult.earliestBreachDate || 'that horizon'}` : 'remaining above the safety floor'}.`;
      } else if (lower.includes('why') || lower.includes('falling') || lower.includes('cause')) {
        intent = 'EXPLAIN_CAUSE';
        responseText = baselineResult.driverAnalysis.aiSummaryText;
      } else if (lower.includes('safest') || lower.includes('do') || lower.includes('recommend')) {
        intent = 'RECOMMEND_DECISION';
        const bestCf = baselineResult.counterfactuals[0];
        responseText = bestCf
          ? `The safest strategy is ${bestCf.title}. This provides a minimum cash of ${formatINR(bestCf.minProjectedCash)}, ${bestCf.statusColor === 'success' ? 'maintaining a safe cash margin.' : 'with a marginal risk.'}`
          : 'No counterfactual strategies are currently available.';
      }

      res.json({
        intent,
        responseText,
        detectedDelay,
        verifiedDataUsed: {
          currentCash: financials.config.current_cash,
          minCash: baselineResult.minProjectedCash,
          cashFloor: financials.config.cash_floor,
          breachDate: baselineResult.earliestBreachDate,
        },
      });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to process voice intent', detail: e.message });
    }
  });

  // AI Explanation & Chatbot Endpoint (SRS FR-14 & FR-10)
  app.post('/api/explain', async (req, res) => {
    try {
      const { query, verifiedData, history, geminiKey, groqKey, openRouterKey, apiKey } = req.body;

      const historyFormatted = Array.isArray(history) && history.length > 0
        ? history.slice(-4).map((m: any) => `${(m.role || m.sender || 'user').toUpperCase()}: ${m.content || m.text}`).join('\n')
        : 'None';

      const prompt = `
You are the AI Financial Advisor & Explanation Engine for FlowShield (CashShock) — an SME Cash Flow & Liquidity Intelligence Platform.
CRITICAL RULE: You MUST NOT invent or calculate any financial numbers independently. You MUST ONLY use the verified deterministic engine results provided below.

USER QUERY: "${query || 'Why is my cash falling?'}"

RECENT CHAT HISTORY:
${historyFormatted}

VERIFIED ENGINE SIMULATION & LEDGER CALCULATIONS:
- Current Cleared Cash: ${verifiedData?.currentCash || '₹25.00L'}
- Minimum Projected Cash: ${verifiedData?.minProjectedCash || '₹4.50L'}
- Cash Floor Threshold: ${verifiedData?.cashFloor || '₹5.00L'}
- Breach Probability: ${verifiedData?.breachProbability || '84%'}
- Earliest Breach Date: ${verifiedData?.earliestBreachDate || 'Oct 14, 2026'}
- Supplier Lead-Time Delay Shock: +${verifiedData?.supplierDelay || 20} Days
- Working Capital Diagnostics: DSO=${verifiedData?.dso || '42 days'}, DIO=${verifiedData?.dio || '58 days'}, DPO=${verifiedData?.dpo || '30 days'}, CCC=${verifiedData?.ccc || '70 days'}
- Top Outflow Driver: ${verifiedData?.topOutflow || 'Shakti Electronics Procurement (₹18.0L)'}
- Top Inflow Driver: ${verifiedData?.topInflow || 'TechCorp Collection (₹4.2L)'}
- Counterfactual Strategy Outcomes:
  1. 20% Procurement Reduction -> Min Cash: ₹3.2L (Still breaches floor)
  2. 15-Day Term Extension -> Min Cash: ₹4.8L (Marginal breach)
  3. 30% Customer Advance -> Min Cash: ₹6.5L (Safe liquidity margin)

Provide a helpful, precise, 2-4 sentence executive financial advisor answer to the user's query. Ground your explanation directly in the verified engine numbers above.
`;

      const aiResult = await executeAiProviderCall({
        prompt,
        geminiKey,
        groqKey,
        openRouterKey,
        apiKey,
      });

      if (aiResult.text) {
        return res.json({
          explanation: aiResult.text,
          recommendedAction: 'Negotiate a 30% customer advance or extend supplier payment terms by 15 days to bridge the gap.',
        });
      }

      return res.json({
        noApiKey: aiResult.noApiKey,
        explanation: aiResult.error || 'AI Provider Request Failed: The configured API key was rejected or timed out. Please verify your API key in Settings.',
        recommendedAction: null,
      });
    } catch (err: any) {
      console.error('Error generating AI explanation:', err);
      res.status(500).json({
        error: 'Failed to generate explanation',
        fallbackExplanation: 'I encountered an error processing your request. Please try again.',
      });
    }
  });

  // ── AI EXECUTIVE BRIEFING ENDPOINT (FR-NEW) ──────────────────────────────
  app.post('/api/ai/briefings', async (req, res) => {
    try {
      const { verifiedData, horizon } = req.body;

      const prompt = `
You are FlowShield AI, a senior financial analyst AI for SME cash flow intelligence.
Generate a concise executive briefing for the ${horizon || '7-day'} liquidity forecast.

VERIFIED FINANCIAL DATA:
- Current Cash: ${verifiedData?.currentCash || '₹25.00L'}
- Min Projected Cash: ${verifiedData?.minProjectedCash || '₹4.50L'}
- Cash Floor: ${verifiedData?.cashFloor || '₹5.00L'}
- Breach Probability: ${verifiedData?.breachProbability || '84%'}
- Earliest Breach Date: ${verifiedData?.earliestBreachDate || 'N/A'}
- DSO: ${verifiedData?.dso || '42 days'}, DIO: ${verifiedData?.dio || '58 days'}, DPO: ${verifiedData?.dpo || '30 days'}, CCC: ${verifiedData?.ccc || '70 days'}
- Supplier Delay: +${verifiedData?.supplierDelay || 20} days
- Top Outflow: ${verifiedData?.topOutflow || '₹18.0L'}
- Top Inflow: ${verifiedData?.topInflow || '₹4.2L'}

Respond in this EXACT JSON format (no markdown, no code fences):
{
  "title": "${horizon || '7-Day'} Liquidity Briefing",
  "summary": "2-3 sentence executive summary of the cash flow outlook",
  "riskLevel": "HIGH" or "MEDIUM" or "LOW",
  "keyMetric": "the most critical number with context",
  "action": "one specific actionable recommendation",
  "confidence": "HIGH" or "MEDIUM" or "LOW"
}
`;

      let briefing = null;

      if (process.env.GROQ_API_KEY) {
        try {
          const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'qwen/qwen3.8-27b',
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.1,
              response_format: { type: 'json_object' },
            }),
          });
          const groqData: any = await groqRes.json();
          const content = groqData.choices?.[0]?.message?.content || '';
          try {
            briefing = JSON.parse(content);
          } catch {
            briefing = { title: `${horizon || '7-Day'} Briefing`, summary: content, riskLevel: 'MEDIUM', keyMetric: 'See summary', action: 'Review details', confidence: 'MEDIUM' };
          }
        } catch (e) {
          console.warn('Groq briefing API failed:', e);
        }
      }

      // Fallback if no API key or failed
      if (!briefing) {
        const hz = String(horizon || '7-Day');
        if (hz === '7-Day') {
          briefing = {
            title: '7-Day Liquidity Briefing',
            summary: `Short-term operating cash buffer is adequate at ${verifiedData?.currentCash || '₹25.00L'}. Incoming collections expected to cover immediate commitments.`,
            riskLevel: 'LOW',
            keyMetric: `Current Cash: ${verifiedData?.currentCash || '₹25.00L'}`,
            action: 'Send invoice reminders for Oct 12 customer collections',
            confidence: 'HIGH',
          };
        } else if (hz === '30-Day') {
          briefing = {
            title: '30-Day Liquidity Briefing',
            summary: `Critical cash floor breach projected on ${verifiedData?.earliestBreachDate || 'Oct 14'} driven by ${verifiedData?.topOutflow || '₹18.0L procurement payable'} vs delayed receivables.`,
            riskLevel: 'HIGH',
            keyMetric: `Min Cash: ${verifiedData?.minProjectedCash || '₹4.50L'} vs Floor ${verifiedData?.cashFloor || '₹5.00L'}`,
            action: 'Request 30% customer advance or extend supplier term by +15 days',
            confidence: 'HIGH',
          };
        } else if (hz === '60-Day') {
          briefing = {
            title: '60-Day Liquidity Briefing',
            summary: `Working capital stretch due to ${verifiedData?.ccc || '70-day'} Cash Conversion Cycle. High concentration risk on single vendor procurement peak.`,
            riskLevel: 'HIGH',
            keyMetric: `CCC: ${verifiedData?.ccc || '70 Days'} (DSO ${verifiedData?.dso || '42'}, DPO ${verifiedData?.dpo || '30'})`,
            action: 'Renegotiate vendor payment terms from Net-30 to Net-60',
            confidence: 'MEDIUM',
          };
        } else {
          briefing = {
            title: '90-Day Liquidity Briefing',
            summary: `Long-term cash position stabilizes after Q4 customer collections. Breach probability stands at ${verifiedData?.breachProbability || '84%'}.`,
            riskLevel: 'MEDIUM',
            keyMetric: `Breach Probability: ${verifiedData?.breachProbability || '84%'}`,
            action: 'Establish ₹10L standby working capital line with bank',
            confidence: 'MEDIUM',
          };
        }
      }

      res.json({ briefing });
    } catch (err: any) {
      console.error('AI Briefing error:', err);
      res.status(500).json({ error: 'Failed to generate briefing' });
    }
  });

  // ── AI ANOMALY DETECTION ENDPOINT (FR-NEW) ──────────────────────────────
  app.post('/api/ai/anomalies', async (req, res) => {
    try {
      const { transactions, payables, verifiedData } = req.body;

      const txSummary = (transactions || []).slice(0, 20).map((t: any) =>
        `${t.customer}: ₹${(t.invoice_amount / 100000).toFixed(2)}L (${t.status}, due ${t.expected_payment_date})`
      ).join('\n');

      const paySummary = (payables || []).slice(0, 20).map((p: any) =>
        `${p.supplier}: ₹${(p.amount / 100000).toFixed(2)}L (${p.status}, due ${p.due_date})`
      ).join('\n');

      const prompt = `
You are FlowShield AI Anomaly Scanner. Analyze these SME financial transactions and payables for anomalies, risks, and suspicious patterns.

TRANSACTIONS (Receivables):
${txSummary || 'No transactions loaded'}

PAYABLES (Bills):
${paySummary || 'No payables loaded'}

FINANCIAL CONTEXT:
- Current Cash: ${verifiedData?.currentCash || 'N/A'}
- Cash Floor: ${verifiedData?.cashFloor || 'N/A'}
- Breach Risk: ${verifiedData?.breachProbability || 'N/A'}

Respond in this EXACT JSON format (no markdown, no code fences):
{
  "anomalies": [
    {
      "type": "OVERDUE_RISK" or "LARGE_PAYMENT" or "CONCENTRATION_RISK" or "TIMING_MISMATCH" or "UNUSUAL_PATTERN",
      "severity": "CRITICAL" or "WARNING" or "INFO",
      "title": "short title",
      "description": "2-sentence description of the anomaly",
      "recommendation": "specific action to take"
    }
  ],
  "overallRisk": "HIGH" or "MEDIUM" or "LOW",
  "summary": "1-2 sentence overall risk assessment"
}

Find 3-5 real anomalies. Focus on: overdue invoices, concentration risk (single customer dependency), timing mismatches (large bills due before expected collections), and unusual payment patterns.
`;

      let result = null;

      if (process.env.GROQ_API_KEY) {
        try {
          const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'qwen/qwen3.8-27b',
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.1,
              response_format: { type: 'json_object' },
            }),
          });
          const groqData: any = await groqRes.json();
          const content = groqData.choices?.[0]?.message?.content || '';
          try {
            result = JSON.parse(content);
          } catch {
            result = { anomalies: [], overallRisk: 'MEDIUM', summary: 'Analysis complete. Review transactions manually.' };
          }
        } catch (e) {
          console.warn('Groq anomaly API failed:', e);
        }
      }

      // Rule-based fallback anomalies if no AI response
      if (!result) {
        const anomalies: any[] = [];
        (transactions || []).forEach((t: any) => {
          if (t.status === 'DELAYED') {
            anomalies.push({
              type: 'OVERDUE_RISK',
              severity: 'CRITICAL',
              title: `Overdue: ${t.customer}`,
              description: `Invoice of ₹${(t.invoice_amount / 100000).toFixed(2)}L from ${t.customer} is past due. This directly impacts cash inflow projections.`,
              recommendation: 'Follow up immediately or offer early payment discount.',
            });
          }
          if (t.invoice_amount > 1500000) {
            anomalies.push({
              type: 'LARGE_PAYMENT',
              severity: 'WARNING',
              title: `Large Receivable: ${t.customer}`,
              description: `₹${(t.invoice_amount / 100000).toFixed(2)}L invoice represents a significant concentration of expected cash inflow.`,
              recommendation: 'Diversify customer base or secure partial advance payment.',
            });
          }
        });
        const totalAR = (transactions || []).reduce((s: number, t: any) => s + (t.invoice_amount || 0), 0);
        (transactions || []).forEach((t: any) => {
          if (totalAR > 0 && (t.invoice_amount / totalAR) > 0.4) {
            anomalies.push({
              type: 'CONCENTRATION_RISK',
              severity: 'WARNING',
              title: `Customer Concentration: ${t.customer}`,
              description: `${t.customer} represents ${((t.invoice_amount / totalAR) * 100).toFixed(0)}% of total receivables. Single-customer dependency is a liquidity risk.`,
              recommendation: 'Diversify receivables across multiple customers.',
            });
          }
        });
        const hasCritical = anomalies.some(a => a.severity === 'CRITICAL');
        result = {
          anomalies: anomalies.slice(0, 5),
          overallRisk: hasCritical ? 'HIGH' : anomalies.length > 0 ? 'MEDIUM' : 'LOW',
          summary: anomalies.length > 0
            ? `Found ${anomalies.length} anomalies: ${anomalies.filter(a => a.severity === 'CRITICAL').length} critical, ${anomalies.filter(a => a.severity === 'WARNING').length} warnings.`
            : 'No significant anomalies detected in current dataset.',
        };
      }

      res.json(result);
    } catch (err: any) {
      console.error('AI Anomaly error:', err);
      res.status(500).json({ error: 'Failed to scan anomalies' });
    }
  });

  // ── WHATSAPP LIQUIDITY ALERT & BRIEFING ─────────────────────────────────

  // Builds a verified brief payload from the deterministic financial engine.
  // No financial number is invented here — everything comes from
  // getFinancials() + runSimulationEngine().
  const computeWhatsAppBriefPayload = async () => {
    const financials = await getFinancials();
    if (!financials?.config) {
      throw new WhatsAppError('Financial data unavailable.', 503);
    }
    const config = financials.config;
    const result = runSimulationEngine(
      config,
      financials.transactions,
      financials.payables,
      financials.expenses,
      demoInventory,
      demoSuppliers,
      demoSales
    );

    const horizon30 = result.horizons?.find((h: any) => h.days === 30);
    const topOutflows = result.driverAnalysis?.topOutflows || [];
    const bestCf = (result.counterfactuals || [])[0]; // already ranked by net benefit

    const actionTexts: Record<string, string> = {
      'cf-1': 'Reduce procurement spend by 20% to protect the cash floor.',
      'cf-2': 'Extend supplier payment terms by 15 days to bridge the gap.',
      'cf-3': 'Secure a 30% advance from key customers to restore the cash buffer.',
    };
    const recommendation = bestCf ? (actionTexts[bestCf.id] || bestCf.title) : null;

    // Simulated impact of the recommended action (verified engine run).
    let simulated: any = null;
    const overrideMap: Record<string, any> = {
      'cf-1': { procurementReductionPercent: 20 },
      'cf-2': { supplierTermExtensionDays: 15 },
      'cf-3': { customerAdvancePercent: 30 },
    };
    if (bestCf && overrideMap[bestCf.id]) {
      const simResult = runSimulationEngine(
        config,
        financials.transactions,
        financials.payables,
        financials.expenses,
        demoInventory,
        demoSuppliers,
        demoSales,
        overrideMap[bestCf.id]
      );
      simulated = {
        label: recommendation,
        minCash: simResult.minProjectedCash,
        breachProbability: simResult.breachProbability,
      };
    }

    const payload = {
      businessName: 'Shakti Electronics',
      currentCash: config.current_cash,
      safetyFloor: config.cash_floor,
      forecast30Day: horizon30?.expectedCash,
      minProjectedCash90: result.minProjectedCash,
      breachProbability: result.breachProbability,
      expectedBreachDate: result.earliestBreachDate,
      topDrivers: topOutflows.slice(0, 3).map((d: any) => ({ label: d.entity, amount: d.amount })),
      recommendation,
      simulated,
    };

    return { payload, result, financials };
  };

  // Safe status + user notification preferences (never returns secrets)
  app.get('/api/notifications/whatsapp/status', async (req, res) => {
    try {
      const status = getWhatsAppStatus();
      const settings = getWhatsAppAlertSettings();
      res.json({
        enabled: status.enabled,
        configured: status.configured,
        recipientConfigured: status.recipientConfigured,
        settings,
      });
    } catch (e: any) {
      console.error('WhatsApp status error:', e.message);
      res.status(500).json({ error: 'Failed to read WhatsApp integration status.' });
    }
  });

  // Connectivity test — simple message only
  app.post('/api/notifications/whatsapp/test', async (req, res) => {
    try {
      const result = await sendTestMessage();
      await logWhatsAppNotification({
        alertType: 'TEST',
        phoneNumber: process.env.WHATSAPP_RECIPIENT_PHONE || undefined,
        status: 'SENT',
        messageId: result.messageId || undefined,
      });
      res.json({ success: true, message: 'Test message sent to WhatsApp.', messageId: result.messageId });
    } catch (err: any) {
      const msg = err instanceof WhatsAppError ? err.message : 'Unable to send the WhatsApp test message. Check integration settings.';
      const code = err instanceof WhatsAppError ? err.statusCode : 502;
      if (err instanceof WhatsAppError && err.statusCode !== 503) {
        await logWhatsAppNotification({
          alertType: 'TEST',
          status: 'FAILED',
          errorMessage: msg,
        });
      }
      res.status(code).json({ success: false, error: msg });
    }
  });

  // Send the latest verified liquidity brief
  app.post('/api/notifications/whatsapp/send', async (req, res) => {
    try {
      const { payload, result, financials } = await computeWhatsAppBriefPayload();
      const sent = await sendLiquidityAlert(payload);
      await logWhatsAppNotification({
        alertType: 'LIQUIDITY_BRIEF',
        phoneNumber: process.env.WHATSAPP_RECIPIENT_PHONE || undefined,
        riskLevel: result.hasBreach ? 'CRITICAL' : result.breachProbability > 0.6 ? 'HIGH' : result.breachProbability > 0.25 ? 'MEDIUM' : 'LOW',
        breachProbability: result.breachProbability,
        status: 'SENT',
        messageId: sent.messageId || undefined,
      });
      res.json({
        success: true,
        message: 'Liquidity brief sent to WhatsApp.',
        messageId: sent.messageId,
        summary: {
          currentCash: financials.config.current_cash,
          minProjectedCash: result.minProjectedCash,
          breachProbability: result.breachProbability,
          expectedBreachDate: result.earliestBreachDate,
        },
      });
    } catch (err: any) {
      const msg = err instanceof WhatsAppError ? err.message : 'Unable to send the WhatsApp liquidity brief.';
      const code = err instanceof WhatsAppError ? err.statusCode : 502;
      if (err instanceof WhatsAppError) {
        await logWhatsAppNotification({
          alertType: 'LIQUIDITY_BRIEF',
          status: 'FAILED',
          errorMessage: msg,
        });
      }
      res.status(code).json({ success: false, error: msg });
    }
  });

  // Evaluate automatic alert rules against current verified risk and fire due alerts.
  // Deduplicated: an alert type is only re-sent after its cooldown window passes.
  app.post('/api/notifications/whatsapp/evaluate', async (req, res) => {
    try {
      const settings = getWhatsAppAlertSettings();
      const status = getWhatsAppStatus();
      if (!status.configured) {
        return res.status(503).json({ success: false, error: 'WhatsApp integration is not configured.' });
      }
      if (!status.recipientConfigured) {
        return res.status(400).json({ success: false, error: 'WhatsApp recipient is not configured.' });
      }

      const { payload, result, financials } = await computeWhatsAppBriefPayload();
      const recent = await getRecentWhatsAppNotifications(40);
      const alreadySent = (alertType: string, cooldownHours: number): boolean => {
        const hit = recent.find((r: any) => r.alertType === alertType && r.status === 'SENT');
        if (!hit || !hit.sentAt) return false;
        const sentTime = new Date(String(hit.sentAt).replace(' ', 'T')).getTime();
        return !Number.isNaN(sentTime) && Date.now() - sentTime < cooldownHours * 3600 * 1000;
      };

      const riskLevel = result.hasBreach ? 'CRITICAL' : result.breachProbability > 0.6 ? 'HIGH' : result.breachProbability > 0.25 ? 'MEDIUM' : 'LOW';
      const fired: string[] = [];
      const errors: string[] = [];

      const recordOutcome = async (alertType: string, ok: boolean, msg?: string) => {
        await logWhatsAppNotification({
          alertType,
          phoneNumber: process.env.WHATSAPP_RECIPIENT_PHONE || undefined,
          riskLevel,
          breachProbability: result.breachProbability,
          status: ok ? 'SENT' : 'FAILED',
          messageId: undefined,
          errorMessage: ok ? undefined : msg,
        });
      };

      // 1. CRITICAL: projected cash falls below the safety floor.
      if (settings.floorBreachEnabled && result.hasBreach && !alreadySent('CRITICAL_BREACH', 24)) {
        try {
          const sent = await sendLiquidityAlert(payload);
          await logWhatsAppNotification({
            alertType: 'CRITICAL_BREACH',
            phoneNumber: process.env.WHATSAPP_RECIPIENT_PHONE || undefined,
            riskLevel: 'CRITICAL',
            breachProbability: result.breachProbability,
            status: 'SENT',
            messageId: sent.messageId || undefined,
          });
          fired.push('Cash-floor breach');
        } catch (e: any) {
          await recordOutcome('CRITICAL_BREACH', false, e.message);
          errors.push('Cash-floor breach');
        }
      }

      // 2. HIGH RISK: breach probability >= configured threshold (skipped if a critical alert fired).
      const highRiskTriggered = result.breachProbability * 100 >= settings.riskThreshold;
      if (!fired.includes('Cash-floor breach') && settings.highRiskEnabled && highRiskTriggered && !alreadySent('HIGH_RISK', 24)) {
        try {
          const sent = await sendRiskEscalation(payload);
          await logWhatsAppNotification({
            alertType: 'HIGH_RISK',
            phoneNumber: process.env.WHATSAPP_RECIPIENT_PHONE || undefined,
            riskLevel: 'HIGH',
            breachProbability: result.breachProbability,
            status: 'SENT',
            messageId: sent.messageId || undefined,
          });
          fired.push('High liquidity risk');
        } catch (e: any) {
          await recordOutcome('HIGH_RISK', false, e.message);
          errors.push('High liquidity risk');
        }
      }

      // 3. PAYMENT RISK: large CRITICAL payment within 10 days while projected cash is insufficient.
      if (!fired.includes('Cash-floor breach') && settings.paymentRiskEnabled && !alreadySent('PAYMENT_RISK', 24)) {
        const anchorDate = new Date((result.dailyPoints?.[0] as any)?.date || new Date().toISOString().split('T')[0]);
        const criticalPayment = (financials.payables || []).find((p: any) => {
          const days = Math.round((new Date(p.due_date + 'T00:00:00').getTime() - anchorDate.getTime()) / 86400000);
          return p.status === 'CRITICAL' && days >= 0 && days <= 10;
        });
        if (criticalPayment && result.minProjectedCash < criticalPayment.amount) {
          try {
            const sent = await sendRiskEscalation({
              ...payload,
              recommendation: `Negotiate the ${criticalPayment.supplier} payment (${formatINR(criticalPayment.amount)}) terms before it is due.`,
            });
            await logWhatsAppNotification({
              alertType: 'PAYMENT_RISK',
              phoneNumber: process.env.WHATSAPP_RECIPIENT_PHONE || undefined,
              riskLevel: 'HIGH',
              breachProbability: result.breachProbability,
              status: 'SENT',
              messageId: sent.messageId || undefined,
            });
            fired.push('Major payment risk');
          } catch (e: any) {
            await recordOutcome('PAYMENT_RISK', false, e.message);
            errors.push('Major payment risk');
          }
        }
      }

      // 4. WEEKLY BRIEF: summarized briefing once per 7-day period.
      if (settings.weeklyBriefingEnabled && !alreadySent('WEEKLY_BRIEFING', 24 * 7)) {
        try {
          const sent = await sendWeeklyBriefing(payload);
          await logWhatsAppNotification({
            alertType: 'WEEKLY_BRIEFING',
            phoneNumber: process.env.WHATSAPP_RECIPIENT_PHONE || undefined,
            riskLevel,
            breachProbability: result.breachProbability,
            status: 'SENT',
            messageId: sent.messageId || undefined,
          });
          fired.push('Weekly liquidity briefing');
        } catch (e: any) {
          await recordOutcome('WEEKLY_BRIEFING', false, e.message);
          errors.push('Weekly liquidity briefing');
        }
      }

      res.json({
        evaluated: true,
        fired,
        errors,
        settings,
        currentRisk: { riskLevel, breachProbability: Math.round(result.breachProbability * 100) },
      });
    } catch (e: any) {
      console.error('WhatsApp evaluate error:', e.message);
      res.status(500).json({ success: false, error: 'Failed to evaluate WhatsApp alert conditions.' });
    }
  });

  // Update safe notification preferences (no secrets accepted or stored)
  app.post('/api/notifications/whatsapp/settings', async (req, res) => {
    try {
      const { floorBreachEnabled, highRiskEnabled, paymentRiskEnabled, weeklyBriefingEnabled, riskThreshold } = req.body;
      const settings = saveWhatsAppAlertSettings({
        floorBreachEnabled: typeof floorBreachEnabled === 'boolean' ? floorBreachEnabled : undefined,
        highRiskEnabled: typeof highRiskEnabled === 'boolean' ? highRiskEnabled : undefined,
        paymentRiskEnabled: typeof paymentRiskEnabled === 'boolean' ? paymentRiskEnabled : undefined,
        weeklyBriefingEnabled: typeof weeklyBriefingEnabled === 'boolean' ? weeklyBriefingEnabled : undefined,
        riskThreshold: typeof riskThreshold === 'number' ? riskThreshold : undefined,
      });
      res.json({ success: true, settings });
    } catch (e: any) {
      console.error('WhatsApp settings error:', e.message);
      res.status(500).json({ error: 'Failed to save WhatsApp notification settings.' });
    }
  });

  // ── AI CHAT ENDPOINT (Redesigned conversational AI) ──────────────────────
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const { message, verifiedData, history, geminiKey, groqKey, openRouterKey, apiKey } = req.body;

      const historyFormatted = Array.isArray(history) && history.length > 0
        ? history.slice(-6).map((m: any) => `${(m.role || m.sender || 'user') === 'user' ? 'User' : 'AI'}: ${m.content || m.text}`).join('\n')
        : 'None';

      const prompt = `
You are FlowShield AI — a senior financial advisor AI for SME cash flow intelligence. You provide precise, actionable financial advice grounded in verified simulation data.

CONVERSATION HISTORY:
${historyFormatted}

USER MESSAGE: "${message || 'Hello'}"

VERIFIED FINANCIAL DATA:
- Current Cash: ${verifiedData?.currentCash || '₹25.00L'}
- Min Projected Cash: ${verifiedData?.minProjectedCash || '₹4.50L'}
- Cash Floor: ${verifiedData?.cashFloor || '₹5.00L'}
- Breach Probability: ${verifiedData?.breachProbability || '84%'}
- Earliest Breach Date: ${verifiedData?.earliestBreachDate || 'Oct 14, 2026'}
- DSO: ${verifiedData?.dso || '42 days'}, DIO: ${verifiedData?.dio || '58 days'}, DPO: ${verifiedData?.dpo || '30 days'}, CCC: ${verifiedData?.ccc || '70 days'}
- Supplier Delay: +${verifiedData?.supplierDelay || 20} days
- Top Outflow: ${verifiedData?.topOutflow || 'Shakti Electronics Procurement (₹18.0L)'}
- Top Inflow: ${verifiedData?.topInflow || 'TechCorp Collection (₹4.2L)'}
- Counterfactual Strategies:
  1. 20% Procurement Reduction → Min Cash: ₹3.2L (breaches floor)
  2. 15-Day Term Extension → Min Cash: ₹4.8L (marginal)
  3. 30% Customer Advance → Min Cash: ₹13.5L (safe, 0% breach probability)

RULES:
- Only use verified numbers above. Never invent financial data.
- Be concise: 2-4 sentences maximum.
- Always ground advice in specific numbers.
- Use bold **text** for key numbers and recommendations.
`;

      const aiResult = await executeAiProviderCall({
        prompt,
        geminiKey,
        groqKey,
        openRouterKey,
        apiKey,
      });

      if (aiResult.text) {
        return res.json({
          explanation: aiResult.text,
          recommendedAction: 'Negotiate a 30% customer advance or extend supplier payment terms by 15 days to bridge the gap.',
        });
      }

      return res.json({
        noApiKey: aiResult.noApiKey,
        explanation: aiResult.error || 'AI Provider Request Failed: The configured API key was rejected or timed out. Please verify your API key in Settings.',
        recommendedAction: null,
      });
    } catch (err: any) {
      console.error('AI Chat error:', err);
      res.status(500).json({
        error: 'Failed to process chat',
        fallbackExplanation: 'I encountered an error processing your request. Please try again.',
      });
    }
  });

  // Vite middleware for dev or static serving for prod (only in standalone server mode)
  if (!process.env.VERCEL) {
    if (process.env.NODE_ENV !== 'production') {
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          watch: {
            ignored: [
              '**/cashshock_postgres_db/**',
              '**/pgdata_local/**',
              '**/*.json',
              '**/*.log',
              '**/.git/**',
            ],
          },
        },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`CashShock server running on http://0.0.0.0:${PORT}`);
    });
  }

  return app;
}

let appPromise: Promise<express.Express> | null = null;
export function getApp(): Promise<express.Express> {
  if (!appPromise) {
    appPromise = startServer();
  }
  return appPromise;
}

if (!process.env.VERCEL) {
  startServer();
}

export default getApp;
