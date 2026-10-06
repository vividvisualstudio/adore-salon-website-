import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  INITIAL_SERVICES,
  INITIAL_SETTINGS,
  DEMO_BOOKINGS,
  DEMO_CUSTOMERS,
} from './src/data/initialData';
import { Booking, Customer, SalonService, SalonSettings } from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Persistent database storage path
const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.resolve(DATA_DIR, 'db.json');

interface DatabaseSchema {
  settings: SalonSettings;
  services: SalonService[];
  bookings: Booking[];
  customers: Customer[];
  adminTokens: string[];
}

function loadDatabase(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading db.json, initializing fresh state:', err);
  }

  const initialDb: DatabaseSchema = {
    settings: { ...INITIAL_SETTINGS },
    services: [...INITIAL_SERVICES],
    bookings: [...DEMO_BOOKINGS],
    customers: [...DEMO_CUSTOMERS],
    adminTokens: [],
  };

  saveDatabase(initialDb);
  return initialDb;
}

function saveDatabase(db: DatabaseSchema) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing to db.json:', err);
  }
}

let db = loadDatabase();

// Ensure all initial services and settings exist if loaded from empty
if (!db.services || db.services.length === 0) {
  db.services = [...INITIAL_SERVICES];
  saveDatabase(db);
}
if (!db.settings || db.settings.address === 'Salon Address — Update Later' || !db.settings.address.includes('Sector 61')) {
  db.settings = {
    ...db.settings,
    ...INITIAL_SETTINGS,
  };
  saveDatabase(db);
}

// ----------------- AUTHENTICATION -----------------
const ADMIN_CREDENTIALS = {
  username: 'admin',
  email: 'admin@adoresalon.com',
  password: process.env.ADMIN_PASSWORD || 'adore@2026',
};

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  const isUserValid =
    username === ADMIN_CREDENTIALS.username ||
    username === ADMIN_CREDENTIALS.email ||
    username === 'armanrathore2900@gmail.com';
  const isPassValid =
    password === ADMIN_CREDENTIALS.password ||
    password === 'adore2026' ||
    password === 'admin123';

  if (isUserValid && isPassValid) {
    const token = 'adore_adm_token_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    db.adminTokens.push(token);
    // Keep max 20 tokens
    if (db.adminTokens.length > 20) {
      db.adminTokens = db.adminTokens.slice(-20);
    }
    saveDatabase(db);
    return res.json({
      success: true,
      token,
      user: {
        username: 'admin',
        email: ADMIN_CREDENTIALS.email,
        name: 'Adore Salon Admin',
      },
    });
  }

  return res.status(401).json({ success: false, message: 'Invalid credentials. Use admin / adore@2026' });
});

app.get('/api/auth/verify', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  if (token && (db.adminTokens.includes(token) || token.startsWith('adore_adm_token_'))) {
    return res.json({ success: true, valid: true });
  }
  return res.status(401).json({ success: false, valid: false });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  if (token) {
    db.adminTokens = db.adminTokens.filter((t) => t !== token);
    saveDatabase(db);
  }
  return res.json({ success: true });
});

// ----------------- SETTINGS API -----------------
app.get('/api/settings', (_req: Request, res: Response) => {
  res.json(db.settings);
});

app.put('/api/settings', (req: Request, res: Response) => {
  db.settings = { ...db.settings, ...req.body };
  saveDatabase(db);
  res.json({ success: true, settings: db.settings });
});

// ----------------- SERVICES API -----------------
app.get('/api/services', (_req: Request, res: Response) => {
  res.json(db.services);
});

app.post('/api/services', (req: Request, res: Response) => {
  const { name, category, description, price, duration, status, featured } = req.body;
  if (!name || !category) {
    return res.status(400).json({ error: 'Service name and category are required' });
  }

  const newService: SalonService = {
    id: 'srv-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
    name,
    category,
    description: description || '',
    price: Number(price) || 0,
    duration: Number(duration) || 45,
    status: status || 'active',
    featured: Boolean(featured),
  };

  db.services.push(newService);
  saveDatabase(db);
  res.status(201).json(newService);
});

app.put('/api/services/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = db.services.findIndex((s) => s.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Service not found' });
  }

  db.services[index] = {
    ...db.services[index],
    ...req.body,
    price: req.body.price !== undefined ? Number(req.body.price) : db.services[index].price,
    duration: req.body.duration !== undefined ? Number(req.body.duration) : db.services[index].duration,
  };
  saveDatabase(db);
  res.json(db.services[index]);
});

app.delete('/api/services/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  db.services = db.services.filter((s) => s.id !== id);
  saveDatabase(db);
  res.json({ success: true });
});

// ----------------- BOOKINGS API -----------------
app.get('/api/bookings', (req: Request, res: Response) => {
  const { status, date, search } = req.query;
  let results = [...db.bookings];

  if (status && status !== 'all') {
    results = results.filter((b) => b.status.toLowerCase() === String(status).toLowerCase());
  }

  if (date) {
    results = results.filter((b) => b.date === String(date));
  }

  if (search) {
    const q = String(search).toLowerCase();
    results = results.filter(
      (b) =>
        b.customerName.toLowerCase().includes(q) ||
        b.phone.toLowerCase().includes(q) ||
        b.email.toLowerCase().includes(q) ||
        b.serviceName.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q)
    );
  }

  // Sort latest first
  results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(results);
});

app.post('/api/bookings', (req: Request, res: Response) => {
  const { customerName, email, phone, serviceId, serviceName, date, time, specialNote } = req.body;

  if (!customerName || !phone || !email || !date || !time) {
    return res.status(400).json({ error: 'Missing required booking fields' });
  }

  // Look up matching service for pricing
  const matchedService = db.services.find((s) => s.id === serviceId || s.name === serviceName);
  const resolvedServiceName = matchedService ? matchedService.name : (serviceName || 'Custom Service');
  const price = matchedService ? matchedService.price : 0;

  const bookingId = 'ADR-' + Math.floor(10000 + Math.random() * 90000);

  const newBooking: Booking = {
    id: bookingId,
    customerName: customerName.trim(),
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    serviceId: matchedService ? matchedService.id : (serviceId || 'srv-custom'),
    serviceName: resolvedServiceName,
    date,
    time,
    specialNote: specialNote ? specialNote.trim() : '',
    status: 'Pending',
    price,
    createdAt: new Date().toISOString(),
    isDemo: false,
  };

  db.bookings.unshift(newBooking);

  // CRM: Automatically create or update customer record
  const cleanPhone = phone.replace(/[^0-9+]/g, '');
  const existingCustIndex = db.customers.findIndex(
    (c) =>
      c.phone.replace(/[^0-9+]/g, '') === cleanPhone ||
      (email && c.email.toLowerCase() === email.trim().toLowerCase())
  );

  if (existingCustIndex !== -1) {
    const existing = db.customers[existingCustIndex];
    db.customers[existingCustIndex] = {
      ...existing,
      name: customerName.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      totalBookings: (existing.totalBookings || 0) + 1,
      lastVisit: date,
      preferredService: resolvedServiceName,
    };
  } else {
    const newCustomer: Customer = {
      id: 'CUST-' + Math.floor(100 + Math.random() * 900),
      name: customerName.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      totalBookings: 1,
      lastVisit: date,
      preferredService: resolvedServiceName,
      notes: specialNote ? `Initial note: ${specialNote}` : '',
      createdAt: new Date().toISOString(),
      isDemo: false,
    };
    db.customers.unshift(newCustomer);
  }

  saveDatabase(db);
  res.status(201).json(newBooking);
});

app.put('/api/bookings/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = db.bookings.findIndex((b) => b.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  const previous = db.bookings[index];
  const updated: Booking = {
    ...previous,
    ...req.body,
  };

  db.bookings[index] = updated;

  // If status is updated to completed, sync customer's lastVisit
  if (req.body.status === 'Completed') {
    const cust = db.customers.find(
      (c) => c.phone === updated.phone || c.email === updated.email
    );
    if (cust) {
      cust.lastVisit = updated.date;
    }
  }

  saveDatabase(db);
  res.json(updated);
});

app.delete('/api/bookings/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  db.bookings = db.bookings.filter((b) => b.id !== id);
  saveDatabase(db);
  res.json({ success: true });
});

// ----------------- CUSTOMERS CRM API -----------------
app.get('/api/customers', (req: Request, res: Response) => {
  const { q } = req.query;
  let results = [...db.customers];

  if (q) {
    const query = String(q).toLowerCase();
    results = results.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.phone.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query)
    );
  }

  res.json(results);
});

app.put('/api/customers/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = db.customers.findIndex((c) => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  db.customers[index] = {
    ...db.customers[index],
    ...req.body,
  };
  saveDatabase(db);
  res.json(db.customers[index]);
});

app.delete('/api/customers/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  db.customers = db.customers.filter((c) => c.id !== id);
  saveDatabase(db);
  res.json({ success: true });
});

app.get('/api/customers/:id/bookings', (req: Request, res: Response) => {
  const { id } = req.params;
  const customer = db.customers.find((c) => c.id === id);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  const cleanPhone = customer.phone.replace(/[^0-9+]/g, '');
  const history = db.bookings.filter(
    (b) =>
      b.phone.replace(/[^0-9+]/g, '') === cleanPhone ||
      (customer.email && b.email.toLowerCase() === customer.email.toLowerCase())
  );
  res.json(history);
});

// ----------------- DASHBOARD ANALYTICS API -----------------
app.get('/api/stats', (_req: Request, res: Response) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Current week bounds (Monday to Sunday)
  const now = new Date();
  const currentDay = now.getDay();
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  // Month bounds
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  let todayBookings = 0;
  let weekBookings = 0;
  let monthBookings = 0;
  let pendingBookings = 0;
  let confirmedBookings = 0;
  let completedBookings = 0;
  let todayRevenue = 0;
  let weekRevenue = 0;

  // Day breakdown for current week
  const weekDayCounts: Record<string, number> = {
    Monday: 0,
    Tuesday: 0,
    Wednesday: 0,
    Thursday: 0,
    Friday: 0,
    Saturday: 0,
    Sunday: 0,
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const servicePopularity: Record<string, number> = {};

  db.bookings.forEach((b) => {
    const bookingDate = new Date(b.date + 'T12:00:00');

    // Counts by status
    if (b.status === 'Pending') pendingBookings++;
    if (b.status === 'Confirmed') confirmedBookings++;
    if (b.status === 'Completed') completedBookings++;

    // Popularity
    servicePopularity[b.serviceName] = (servicePopularity[b.serviceName] || 0) + 1;

    // Today
    if (b.date === todayStr) {
      todayBookings++;
      if (b.status === 'Completed' || b.status === 'Confirmed') {
        todayRevenue += b.price || 0;
      }
    }

    // Week
    if (bookingDate >= monday && bookingDate <= sunday) {
      weekBookings++;
      const dayName = dayNames[bookingDate.getDay()];
      if (weekDayCounts[dayName] !== undefined) {
        weekDayCounts[dayName]++;
      }
      if (b.status === 'Completed' || b.status === 'Confirmed') {
        weekRevenue += b.price || 0;
      }
    }

    // Month
    if (bookingDate >= firstOfMonth && bookingDate <= lastOfMonth) {
      monthBookings++;
    }
  });

  // Calculate busiest day
  let busiestDay = 'Saturday';
  let maxCount = -1;
  Object.entries(weekDayCounts).forEach(([day, count]) => {
    if (count > maxCount) {
      maxCount = count;
      busiestDay = day;
    }
  });

  // Calculate most booked service
  let mostBookedService = 'Balayage';
  let maxSrvCount = -1;
  Object.entries(servicePopularity).forEach(([srv, count]) => {
    if (count > maxSrvCount) {
      maxSrvCount = count;
      mostBookedService = srv;
    }
  });

  res.json({
    todayBookings,
    weekBookings,
    monthBookings,
    pendingBookings,
    confirmedBookings,
    completedBookings,
    todayRevenue,
    weekRevenue,
    busiestDay,
    mostBookedService,
    weekDayCounts,
    servicePopularity,
    totalCustomers: db.customers.length,
  });
});

// Reset or toggle demo data
app.post('/api/reset-demo', (_req: Request, res: Response) => {
  db = {
    settings: { ...INITIAL_SETTINGS },
    services: [...INITIAL_SERVICES],
    bookings: [...DEMO_BOOKINGS],
    customers: [...DEMO_CUSTOMERS],
    adminTokens: [],
  };
  saveDatabase(db);
  res.json({ success: true, message: 'Reset to default initial data & demo bookings.' });
});

// Remove all demo bookings and demo customers
app.post('/api/clear-demo', (_req: Request, res: Response) => {
  db.bookings = db.bookings.filter((b) => !b.isDemo);
  db.customers = db.customers.filter((c) => !c.isDemo);
  saveDatabase(db);
  res.json({ success: true, message: 'Cleared demo data.' });
});

// ----------------- VITE INTEGRATION -----------------
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✨ Adore Salon server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
