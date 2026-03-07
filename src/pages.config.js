
/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "Dashboard",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import FuelDashboard from './pages/FuelDashboard';
import FuelHistory from './pages/FuelHistory';
import AddReading from './pages/AddReading';
import AddRefill from './pages/AddRefill';
import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Dashboard",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "Dashboard",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Dashboard from './pages/Dashboard';
import DriverLog from './pages/DriverLog';
import Drivers from './pages/Drivers';
import ShiftHistory from './pages/ShiftHistory';
import Calendar from './pages/Calendar';
import Customers from './pages/Customers';
import CustomersPA from './pages/CustomersPA';
import Schedule from './pages/Schedule';
import FuelDashboard from './pages/FuelDashboard';
import FuelHistory from './pages/FuelHistory';
import AddReading from './pages/AddReading';
import AddRefill from './pages/AddRefill';
import DispatchLog from './pages/DispatchLog';
import DailyOrders from './pages/DailyOrders';
import LoadHistory from './pages/LoadHistory';
import PickUps from './pages/PickUps';
import PickupHistory from './pages/PickupHistory';
import InventoryEntry from './pages/InventoryEntry';
import InventoryLog from './pages/InventoryLog';
import Invoice from './pages/Invoice';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "DriverLog": DriverLog,
    "Drivers": Drivers,
    "ShiftHistory": ShiftHistory,
    "Calendar": Calendar,
    "Customers": Customers,
    "CustomersPA": CustomersPA,
    "Schedule": Schedule,
    "DispatchLog": DispatchLog,
    "DailyOrders": DailyOrders,
    "LoadHistory": LoadHistory,
    "PickUps": PickUps,
    "PickupHistory": PickupHistory,
    "InventoryEntry": InventoryEntry,
    "InventoryLog": InventoryLog,
    "Invoice": Invoice,
    "FuelDashboard": FuelDashboard,
    "FuelHistory": FuelHistory,
    "AddReading": AddReading,
    "AddRefill": AddRefill,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};
