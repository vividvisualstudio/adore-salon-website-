# ADORE SALON — Premium Salon & Management Web Application

> **Where Beauty Meets Elegance**  
> Luxury Hair, Beauty & Grooming Salon Web Platform with Complete Appointment Booking, WhatsApp Integration, and Admin Management Portal.

---

## 📍 Location
* **Address**: Shop no. First Floor 10 & 11, Baharampur Naya, Sector 61, Gurugram, Haryana 122011 (Near Golf Course Extension Road)
* **Phone / WhatsApp**: +91 8920172900
* **Hours**: Monday – Sunday | 10:00 AM – 9:00 PM

---

## 🚀 Quick Start (Running Locally from GitHub)

### Prerequisites
* **Node.js**: Version 18.x or 20.x+ installed ([Download Node.js](https://nodejs.org/))
* **npm**: Installed with Node.js

### 1. Clone the Repository
```bash
git clone <your-github-repo-url>
cd adore-salon
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Full-Stack Application
```bash
npm run dev
```
> The application will start at **http://localhost:3000** with the full Express API and Vite React frontend automatically mounted.

---

## 🛡️ Admin Portal Access
* **URL**: Navigate to `http://localhost:3000/#admin` or click the **Admin** button in the header or footer.
* **Default Username**: `admin` (or `admin@adoresalon.com`)
* **Default Password**: `adore@2026`

---

## 📦 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts full-stack Express server + Vite frontend on port 3000 |
| `npm run dev:client` | Starts standalone Vite development server |
| `npm run build` | Builds optimized production static bundle in `dist/` |
| `npm start` | Runs the production full-stack server |
| `npm run lint` | Runs TypeScript type checking with zero errors |

---

## 🌟 Key Features

1. **Luxury Website**:
   * Brand identity with metallic gold accents, deep obsidian background, and Cormorant Garamond serif typography.
   * Full-screen Hero, About section, Signature Highlight services (Balayage, Hair Color, Styling, Facial), complete services menu, Lookbook Gallery with lightbox, and Why Choose Adore.

2. **Complete Booking & WhatsApp Flow**:
   * Online reservation system validating customer details, service selection, dates (past dates disabled), and 10 AM – 9 PM time slots.
   * Automatic persistence to backend database (`data/db.json`).
   * 1-click **Confirm on WhatsApp** button pre-filling customer information sent to **+91 8920172900**.

3. **Admin Management System**:
   * **Dashboard KPIs**: Real-time counters for Today's bookings, weekly/monthly counts, and today's revenue.
   * **Today's Appointments**: Live schedule with status controls (*Confirm*, *Complete*, *Cancel*) and 1-click WhatsApp customer contact.
   * **Weekly Calendar**: Monday–Sunday timeline with booking volume.
   * **Monthly Analytics**: Trend volume chart, busiest day detection, and top-booked services.
   * **Customer CRM**: Automatic client profile tracking, total visits, last visit, preferences, and full history modal.
   * **Service Catalog**: Live addition, editing, repricing, and duration adjustments.
   * **Salon Settings**: Dynamic salon address, phone, WhatsApp number, hours, and social media URLs.

4. **Interactive Map**:
   * Embedded Google Map with precise pinpoint drop location at **Baharampur Naya, Sector 61, Gurugram, Haryana 122011**.
   * Direct Google Maps navigation direction button.
