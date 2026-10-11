import { NavLink } from "react-router-dom";
import {
FaChartPie,
FaShoppingBag,
FaWallet,
FaChartLine,
FaMoneyBill,
FaUser,
FaChartBar,
FaTimes,
FaFlask,
} from "react-icons/fa";
import "./Sidebar.css";

const navSections = [
{
title: "Overview",
items: [
{ to: "/", label: "Dashboard", icon: FaChartPie, end: true },
{ to: "/markets", label: "Markets", icon: FaChartBar },
],
},
{
title: "Portfolio",
items: [
{ to: "/holdings", label: "Holdings", icon: FaWallet },
{ to: "/positions", label: "Positions", icon: FaChartLine },
],
},
{
title: "Trading",
items: [
{ to: "/orders", label: "Orders", icon: FaShoppingBag },
{ to: "/funds", label: "Funds", icon: FaMoneyBill },
],
},
{
title: "Tools",
items: [
{ to: "/trade-lab", label: "Trade Lab", icon: FaFlask },
],
},
{
title: "Settings",
items: [
{ to: "/profile", label: "Profile", icon: FaUser },
],
},
];

export default function Sidebar({ isOpen, onClose }) {
return (
<aside className={`sidebar ${isOpen ? "sidebar-open" : ""}`}> <div className="brand"> <span className="brand-mark">T</span> <span className="brand-name">TradeX</span>

```
    <button
      className="sidebar-close-btn"
      onClick={onClose}
      aria-label="Close navigation"
    >
      <FaTimes />
    </button>
  </div>

  <nav className="side-nav">
    {navSections.map((section) => (
      <div className="nav-section" key={section.title}>
        <p className="nav-section-title">{section.title}</p>

        <div className="nav-section-items">
          {section.items.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onClose}
                className={({ isActive }) =>
                  isActive ? "active" : ""
                }
              >
                <Icon />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    ))}
  </nav>

  <div className="side-footer">
    <small>TradeX v1.0</small>
  </div>
</aside>

);
}
