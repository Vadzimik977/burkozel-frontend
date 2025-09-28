import { NavLink, Outlet } from "react-router-dom";
import { useState, useEffect } from "react";

export default function Layout() {
  const [balance, setBalance] = useState(0);

  const telegram = window?.Telegram?.WebApp;
  const tgID = telegram?.initDataUnsafe?.user?.id || 0;

  useEffect(() => {
  if (!tgID) return;
  let isMounted = true;
  const controller = new AbortController();

  const fetchBalance = async () => {
    try {
      const res = await fetch(`/backend/users/get_current_user?tg_id=${tgID}`, { signal: controller.signal });
      if (!res.ok) throw new Error('Failed to fetch user');
      const data = await res.json();
      if (!isMounted) return;
      setBalance(data.balance || 0);
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Error fetching balance:', err);
      // по желанию: setBalance(0);
    }
  };

  // первый запрос сразу
  fetchBalance();

  // затем опрос каждые 5 секунд
  const interval = setInterval(fetchBalance, 5000);

  return () => {
    isMounted = false;
    controller.abort();
    clearInterval(interval);
  };
}, [tgID]);


  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header с балансом */}
      <header>
        <div className="balance flex items-center gap-1 p-2">
          <img src="/frontend/icons/crystal.png" alt="Crystal" className="w-5 h-5"/>
          <span>{balance}</span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 w-full bg-[#060A36] border-t border-gray-800 shadow-inner">
        <div className="grid grid-cols-4 text-center text-gray-400">
          <NavLink to="/frontend/" end className="py-3 flex flex-col items-center justify-center text-sm">
            <span className="icon-home mb-1"></span>
          </NavLink>

          <NavLink to="/frontend/friends" className="py-3 flex flex-col items-center justify-center text-sm">
            <span className="icon-friends mb-1"></span>
          </NavLink>

          <NavLink to="/frontend/balance" className="py-3 flex flex-col items-center justify-center text-sm">
            <span className="icon-wallet mb-1"></span>
          </NavLink>

          <NavLink to="/frontend/settings" className="py-3 flex flex-col items-center justify-center text-sm">
            <span className="icon-settings mb-1"></span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
