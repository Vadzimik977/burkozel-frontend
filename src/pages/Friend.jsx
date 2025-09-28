export default function Friends() {
  const telegram = window?.Telegram.WebApp;
  const tgID = telegram?.initDataUnsafe?.user?.id || 0;

  const referralLink = `https://t.me/wb_parser_0001_bot?start=ref${tgID}`;
  const encodedText = encodeURIComponent(
    "🎁 Залетай вместе со мной играть в Буркозел!"
  );
  const fullInviteUrl = `https://t.me/share/url?text=${encodedText}&url=${referralLink}`;

  const inviteLink = fullInviteUrl; 

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    alert("Ссылка скопирована!");
  };

  const openTelegramInvite = () => {
    telegram?.openTelegramLink(fullInviteUrl);
  };

  return (
    <div className="friends-page">
      {/* Блок приглашения */}
      <div className="invite-block">
        <h1 className="friends-title">Приглашайте друзей</h1>
        <p className="invite-text">
          Делитесь ссылкой с друзьями, чтобы играть вместе и получать кристаллы
        </p>

        <div className="invite-input-block" style={{ position: "relative" }}>
          <input
            type="text"
            readOnly
            value={referralLink}
            className="invite-input"
          />
          {/* Кастомная иконка */}
          <img
            src="/frontend/images/Copy.png"
            alt="Copy"
            onClick={copyToClipboard}
            style={{
              position: "absolute",
              right: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              cursor: "pointer",
              width: "20px",
              height: "20px",
            }}
          />
        </div>

        {/* Кнопка открывает Telegram */}
        <button className="invite-btn" onClick={openTelegramInvite}>
          Пригласить
        </button>
      </div>

      {/* <div className="empty-friends-block">
        <h2 className="hfreinds">
          Здесь пока никого нет,<br /> приглашай друзей - вместе веселее!
        </h2>
      </div> */}
    </div>
  );
}
