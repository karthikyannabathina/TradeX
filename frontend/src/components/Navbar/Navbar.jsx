import { useState } from "react";
import { Link } from "react-router-dom";
import { FaBell, FaBars, FaSearch } from "react-icons/fa";
import "./Navbar.css";
import { useAuth } from "../../context/AuthContext";
import useMarketData from "../../context/useMarketData";
export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { stockList } = useMarketData();

  console.log("NAVBAR STOCK LIST:", stockList);

  const [search, setSearch] = useState("");

  const filteredStocks = stockList
    .filter((stock) => {
      const query = search.trim().toLowerCase();

      if (!query) return false;

      return (
        stock.symbol?.toLowerCase().includes(query) ||
        stock.name?.toLowerCase().includes(query)
      );
    })
    .slice(0, 6);

  const showResults = search.trim().length > 0;

  const handleStockSelect = (stock) => {
    setSearch(stock.symbol);
  };

  return (
    <nav className="navbar">

      {/* Mobile menu */}
      <button
        className="mobile-menu-btn"
        onClick={onMenuClick}
        aria-label="Open navigation"
      >
        <FaBars />
      </button>

      <div className="navbar-spacer" />

      <div className="navbar-right">

        {/* Stock Search */}
        <div className="navbar-search">

          <FaSearch className="navbar-search-icon" />

          <input
            type="text"
            placeholder="Search stocks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {showResults && (
            <div className="stock-search-results">

              {filteredStocks.length > 0 ? (
                filteredStocks.map((stock) => (
                  <button
                    key={stock.symbol}
                    className="stock-search-item"
                    onClick={() => handleStockSelect(stock)}
                  >
                    <div className="stock-symbol">
                      {stock.symbol}
                    </div>

                    <div className="stock-details">
                      <span>
                        {stock.name || stock.symbol}
                      </span>

                      <small>
                        NSE
                      </small>
                    </div>

                    <div className="stock-price">
                      ₹{Number(stock.currentPrice ?? stock.price ?? 0).toFixed(2)}
                    </div>
                  </button>
                ))
              ) : (
                <div className="stock-search-empty">
                  No stocks found
                </div>
              )}

            </div>
          )}

        </div>

        {/* Notifications */}
        <button className="notification-btn">
          <FaBell />
          <span />
        </button>

        {/* User */}
        {user ? (
          <div className="user-menu">

            <div className="user-avatar">
              {(user.name || user.email || "U")
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="user-info">
              <strong>{user.name || "User"}</strong>
              <small>Investor</small>
            </div>

            <button
              className="logout-btn"
              onClick={logout}
            >
              Logout
            </button>

          </div>
        ) : (
          <Link
            to="/login"
            className="login-btn"
          >
            Login
          </Link>
        )}

      </div>

    </nav>
  );
}