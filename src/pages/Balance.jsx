import { useState, useEffect, useRef } from "react";
import "./balance.scss";
// import crystal from "../frontend/images/crystal2.png"; // импорт картинки

export default function Balance() {
  const [user, setUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [topupValue, setTopupValue] = useState(""); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [topupError, setTopupError] = useState("");
  const [pollingStatus, setPollingStatus] = useState(null); 

  const telegram = window?.Telegram?.WebApp;
  const tgID = telegram?.initDataUnsafe?.user?.id || 0;

  console.log("tgID",tgID);

  const pollRef = useRef(null); 
  const isUnmounted = useRef(false);

  useEffect(() => {
    if (!tgID) return;

    fetchCurrentUser();

    return () => {
      isUnmounted.current = true;
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [tgID]);

  async function fetchCurrentUser() {
    try {
      const res = await fetch(`/backend/users/get_current_user?tg_id=${tgID}`);
      if (!res.ok) throw new Error("Failed to fetch user");
      const data = await res.json();
      setUser(data);
    } catch (err) {
      console.error(err);
      setUser({ balance: 0, username: "Без имени" });
    }
  }

  const history = user?.history || [];
  const balance = user?.balance || 0;


  function handleTopupChange(e) {
    const val = e.target.value;

    if (val === "") {
      setTopupValue("");
      return;
    }

    const v = val.replace(",", ".");

    const re = /^\d{0,7}(\.\d{0,2})?$/;
    if (re.test(v)) {
      setTopupValue(v);
      setTopupError("");
    } else {
    
      setTopupError("Допускаются цифры и до 2 знаков после запятой");
    }
  }


  function startPollingPayment(guid, maxAttempts = 20, intervalMs = 3000) {
    let attempts = 0;
    setPollingStatus("pending");

    pollRef.current = setInterval(async () => {
      attempts += 1;
      try {
        const res = await fetch(`/backend/payments/status?guid=${encodeURIComponent(guid)}`);
        if (!res.ok) throw new Error("status fetch failed");
        const data = await res.json();
        const status = (data.status || "").toLowerCase();

        if (status === "success" || status === "paid") {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setPollingStatus("success");
      
          await fetchCurrentUser();
        } else if (status === "failed" || status === "cancelled") {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setPollingStatus("failed");
        } else {
    
          setPollingStatus("pending");
        }
      } catch (err) {
        console.error("poll error", err);

      }

      if (attempts >= maxAttempts) {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        setPollingStatus("pending"); 
      }
    }, intervalMs);
  }

async function handleCreatePayment(e) {
  e?.preventDefault?.();
  setTopupError("");

  const v = topupValue.trim();
  if (!v) {
    setTopupError("Введите сумму");
    return;
  }
  const parsed = parseFloat(v.replace(",", "."));
  if (Number.isNaN(parsed) || parsed <= 0) {
    setTopupError("Неверная сумма");
    return;
  }

  setIsSubmitting(true);

  try {

    const payUrl = "https://r45-12-form.com/pay/67b5ea91-61b5-500f-8a05-48cb57de0565";

    if (telegram && typeof telegram.openLink === "function") {
      try {
        telegram.openLink(payUrl);
      } catch (err) {
        window.open(payUrl, "_blank");
      }
    } else {
      window.open(payUrl, "_blank");
    }


    setIsTopUpOpen(false);
    setTopupValue("");
  } catch (err) {
    console.error(err);
    setTopupError(err.message || "Не удалось открыть оплату");
  } finally {
    setIsSubmitting(false);
  }
}

  // --- отправка на бэк для создания платежа ---
//   async function handleCreatePayment(e) {
//     e?.preventDefault?.();
//     setTopupError("");

//     const v = topupValue.trim();
//     if (!v) {
//       setTopupError("Введите сумму");
//       return;
//     }
//     const parsed = parseFloat(v.replace(",", "."));
//     if (Number.isNaN(parsed) || parsed <= 0) {
//       setTopupError("Неверная сумма");
//       return;
//     }

//     // Отправляем в копейках (1 ₽ = 100). Поменяйте на false, если нужно отправлять рубли.
//     const SEND_IN_KOPECKS = true;
//     const amountToSend = SEND_IN_KOPECKS ? Math.round(parsed * 100) : Math.round(parsed);

//     setIsSubmitting(true);

//     console.log("amountToSend",amountToSend);

//     try {
//       // Отправляем JSON в теле — проще и чище, чем query param
//       const resp = await fetch(
//   `/backend/payments/paycash?amount=${amountToSend}&tg_id=${tgID}`,
//   { method: "POST" }
// );


//       if (!resp.ok) {
//         const text = await resp.text();
//         throw new Error(`Ошибка сервера: ${resp.status} ${text}`);
//       }

//       const data = await resp.json();
//       
//       console.log("payment created:", data);

//       setIsTopUpOpen(false);
//       
//       setTopupValue("");

//       const payUrl = data.pay_url || data.payUrl || data.url;
//       const guid = data.guid || data.id || data.payment?.guid;

//       if (!payUrl) {
//         alert("Платёж создан, но ссылка не получена. GUID: " + (guid || ""));
//         setIsSubmitting(false);
//         return;
//       }

//      
//       if (telegram && typeof telegram.openLink === "function") {
//         try {
//           telegram.openLink(payUrl);
//         } catch (err) {
//           window.open(payUrl, "_blank");
//         }
//       } else {
//         
//         window.open(payUrl, "_blank");
//       }

//       if (guid) {
//         
//         startPollingPayment(guid);
//       } else {
//         
//         console.warn("GUID отсутствует: автопроверка статуса недоступна.");
//       }
//     } catch (err) {
//       console.error(err);
//       setTopupError(err.message || "Не удалось создать платёж");
//     } finally {
//       setIsSubmitting(false);
//     }
//   }

  return (
    <div className="balance-page">
      <h1 className="page-title">Баланс</h1>

      {/* Верхний блок с балансом */}
      <div className="balance-block">
        <div
          className="balance-top"
          style={{
            backgroundImage: "url(../frontend/images/backbal.png)",
            backgroundSize: "cover",
            borderRadius: "20px",
            padding: "2rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: "348px",
            minHeight: "180px",
          }}
        >
          <img
            src={"../frontend/images/crystal2.png"}
            alt="Crystal"
            style={{ width: "35px", height: "43px", marginRight: "0.5rem" }}
          />
          <span
            className="balance-value"
            style={{
              color: "#fff",
              fontSize: "24px",
              fontFamily: "Benzin-Semibold",
            }}
          >
            {balance}
          </span>
        </div>

        {/* Нижний блок с кнопками */}
        <div
          className="balance-bottom"
          style={{
            borderRadius: "0 0 20px 20px",
            display: "flex",
            justifyContent: "space-evenly",
            padding: "1.5rem 0",
            gap: "40px",
          }}
        >
          {/* Пополнить */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <button
              className="btn-top-up"
              style={{
                backgroundImage:
                  "linear-gradient(to bottom, rgba(2, 143, 213, 1), rgba(1, 54, 105, 1))",
                borderRadius: "50%",
                width: "56px",
                height: "56px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                border: "none",
                cursor: "pointer",
              }}
              onClick={() => setIsTopUpOpen(true)}
            >
              <img src="/frontend/icons/vopros.png" alt="Пополнить" style={{ width: "20px", height: "20px" }} />
            </button>
            <span style={{ color: "#fff", marginTop: "0.5rem", fontSize: "12px" }}>Пополнить</span>
          </div>

          {/* Вывести */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <button
              className="btn-withdraw"
              style={{
                backgroundColor: "rgba(6, 10, 54, 0.76)",
                borderRadius: "50%",
                width: "56px",
                height: "56px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                border: "none",
                cursor: "pointer",
              }}
            >
              <img src="/frontend/icons/popolnit.png" alt="Вывести" style={{ width: "18px", height: "20px" }} />
            </button>
            <span style={{ color: "#fff", marginTop: "0.5rem", fontSize: "12px" }}>Вывести</span>
          </div>
        </div>
      </div>

      {/* История + кнопка */}
      <div className="history-header">
        <h2 className="block-title">История</h2>
        <button className="btn-view-all" onClick={() => setIsModalOpen(true)}>
          Смотреть все
        </button>
      </div>

      {/* Список операций (краткий) */}
      <div className="history-list">
        {history.length > 0 ? (
          <ul>
            {history.slice(0, 3).map((op) => (
              <li key={op.id}>
                <span>{op.type}</span>
                <span>{op.amount}</span>
                <span>{op.date}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="pdef">История операций пуста</div>
        )}
      </div>

      {/* Модалка с полной историей */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="modal-back" onClick={() => setIsModalOpen(false)}>
              <img src="../frontend/images/frameback.png" alt="Назад" />
            </button>
            <h2 className="modal-title">История операций</h2>
            <div className="modal-body">
              {history.length > 0 ? (
                <ul>
                  {history.map((op) => (
                    <li
                      key={op.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "0.5rem 0",
                        borderBottom: "1px solid rgba(140,148,169,0.2)",
                      }}
                    >
                      <span>{op.type}</span>
                      <span>{op.amount}</span>
                      <span style={{ color: "#888", fontSize: "12px" }}>{op.date}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>История операций пуста</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------- Модалка Пополнения ---------- */}
      {isTopUpOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 420 }}>
            <button className="modal-back" onClick={() => setIsTopUpOpen(false)}>
              <img src="../frontend/images/frameback.png" alt="Назад" />
            </button>
            <h2 className="modal-title">Пополнить баланс</h2>

            <form className="modal-body" onSubmit={handleCreatePayment}>
           <label
  style={{
    display: "block",
    marginBottom: 8,
    color: "#fff",
    lineHeight: 1.4,
    textAlign: "center",
  }}
>
  Укажите сумму пополнения в рублях
</label>

<div
  style={{
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    color: "#fff",
    fontSize: "14px",
    opacity: 0.9,
  }}
>
  <span>1 рубль = 1</span>
  <img
    src={"../frontend/images/crystal2.png"}
    alt="кристалл"
    style={{ width: 14, height: 14, objectFit: "contain" }}
  />
</div>

              <input
                type="text"
                inputMode="decimal"
                value={topupValue}
                onChange={handleTopupChange}
                placeholder="Например, 100 или 99.50"
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  borderRadius: 8,
                  border: "1px solid rgba(140,148,169,0.2)",
                  marginBottom: "0.5rem",
                  fontSize: "16px",
                  background: "rgb(6, 10, 54)",
                  color: "#fff",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreatePayment(e);
                }}
                disabled={isSubmitting}
                autoFocus
              />

              {topupError && <div style={{ color: "crimson", marginBottom: 10 }}>{topupError}</div>}

              {pollingStatus === "pending" && <div style={{ color: "#ffb84d", marginBottom: 10 }}>Ожидание подтверждения платежа...</div>}
              {pollingStatus === "success" && <div style={{ color: "#5cb85c", marginBottom: 10 }}>Платёж успешно зачислен — баланс обновлён.</div>}
              {pollingStatus === "failed" && <div style={{ color: "crimson", marginBottom: 10 }}>Платёж не прошёл.</div>}

              {/* Кнопка пополнить по центру, убрана кнопка "Отмена" */}
              <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
                <button
                  type="submit"
                  className="btn-confirm"
                  style={{
                    backgroundImage: "linear-gradient(to bottom, rgba(2,143,213,1), rgba(1,54,105,1))",
                    color: "#fff",
                    padding: "0.75rem 1.5rem",
                    borderRadius: 8,
                    border: "none",
                    cursor: "pointer",
                    minWidth: 160,
                    textAlign: "center",
                  }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Создаём..." : "Пополнить"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
