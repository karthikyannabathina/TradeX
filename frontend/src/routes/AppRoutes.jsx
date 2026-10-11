import { Routes, Route } from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";
import ProtectedRoute from "./ProtectedRoute";

import Dashboard from "../pages/Dashboard/Dashboard";
import Markets from "../components/market/Markets";
import Orders from "../pages/Orders/Orders";
import Holdings from "../pages/Holdings/Holdings";
import Positions from "../pages/Positions/Positions";
import Funds from "../pages/Funds/Funds";
import Profile from "../pages/Profile/Profile";
import TradeLab from "../pages/TradeLab/TradeLab";

import Login from "../pages/Login/Login";
import Signup from "../pages/Signup/Signup";

export default function AppRoutes() {
  return (
    <Routes>

      {/* =========================
          Authentication
         ========================= */}

      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />


      {/* =========================
          Protected Application
         ========================= */}

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>

          <Route path="/" element={<Dashboard />} />
          <Route path="/markets" element={<Markets />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/holdings" element={<Holdings />} />
          <Route path="/positions" element={<Positions />} />
          <Route path="/trade-lab" element={<TradeLab />} />
          <Route path="/funds" element={<Funds />} />
          <Route path="/profile" element={<Profile />} />

        </Route>
      </Route>

    </Routes>
  );
}