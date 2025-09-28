import React, { useEffect, useState } from "react";

const telegram = window?.Telegram.WebApp;
const tgUser = telegram?.initDataUnsafe?.user || {};
const tgID = tgUser.id || 0;
const username = tgUser.username || tgUser.first_name || "Без имени";
const userPhoto = tgUser.photo_url || "/frontend/images/Photo-2.png"; 

export default function Settings() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        const resp = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/users/get_current_user?tg_id=${tgID}`
        );
        if (!resp.ok) throw new Error("Ошибка при получении статистики");
        const data = await resp.json();
        console.log("stat",data);
        setStats(data);
      } catch (e) {
        console.error("Ошибка загрузки статистики:", e);
      }
    };

    if (tgID) fetchUserStats();
  }, []);

  return (
    <div className="settings-page p-4">
      {/* Профиль */}
      <div className="profile-block">
        <img
          src={userPhoto}
          alt="User avatar"
          className="profile-avatar"
        />
        <div className="profile-username">{username}</div>

        <div className="profile-stats">
          <div className="stat">
            <span className="stat-label">Сыграно игр</span>
            <span className="stat-value">
              {stats ? stats.total_games : "—"}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Побед</span>
            <span className="stat-value">
              {stats ? stats.wins : "—"}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Поражений</span>
            <span className="stat-value">
              {stats ? stats.losses : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Настройки */}
      <h2 className="block-title22">Еще</h2>

      <div className="settings-block">
        <button className="settings-item">
          <img src="/frontend/icons/setblock.png" alt="Профиль" className="item-icon" />
          <span className="item-text">Настройки</span>
          <img src="/frontend/icons/strelka.png" alt="Далее" className="item-action" />
        </button>
      </div>

      <div className="extra-block">
        <button className="settings-item">
          <img src="/frontend/icons/askfm.png" alt="Язык" className="item-icon" />
          <span className="item-text">Помощь</span>
          <img src="/frontend/icons/strelka.png" alt="Далее" className="item-action" />
        </button>

        <button className="settings-item-button">
          <span className="item-text">О приложении</span>
          <img src="/frontend/icons/strelka.png" alt="Далее" className="item-action" />
        </button>
      </div>
    </div>
  );
}
