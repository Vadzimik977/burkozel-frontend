import { useEffect, useRef, useState, useCallback } from "react";
import styles from "./PlanetMain.module.scss";
import Timer from "../Timer";
import RentPlanetPopup from "../Popup/RentPlanetPopup";
import AttackPlanetPopup from "../Popup/AttackPlanetPopup";
import UpgradePlanet from "../Popup/UpgradePlanet";
import ShipMarket from "../Popup/ShipMarket";
import UserPlanetsPopup from "../Popup/UserPlanetsPopup";
import BorderAnimation from "../../assets/js/animatedBorder";
import showPopup from "../../assets/js/showPopup";
import { ColorRing } from "react-loader-spinner";
import { debounce } from "lodash";
import { IWalletElement, IWallet } from "../../types/user.type";
import { RARE_TYPE } from "../../types/planets.type";
import { getInitialValue } from "./index";
import { useUserStore } from "../../store/userStore";
import { t } from "i18next";
import { Link } from "react-router-dom";
import {
  useTonAddress,
  useTonWallet,
  useIsConnectionRestored,
} from "@tonconnect/ui-react";



interface FullPlanetResponse {
  planet: {
    id: number;
    name: string;
    description: string;
    img: string;
    index: number;
    symbol: string;
    wiki_url?: string;
    forLaboratory: boolean;
    health: number;
    cosmoport_level: number;
    element_id: number;
    element_rare: string;
  };
  user_planet: {
    userId: number | null;
    level: number;
    resources: number;
    mined: number;
  };
  speed: number;
  owners: number[];
  element_value: number;
  elements: string;
}

interface PlanetMainProps {
  planetData: FullPlanetResponse;
  userId: number;
}

export const url = process.env.VITE_BACKEND;

type POPUP_STATUS =
  | "upgrade"
  | "wallet"
  | "updateError"
  | "balance"
  | "success";

export default function PlanetMain({ planetData, userId }: PlanetMainProps) {
 const [loading, setLoading] = useState(true);
   const animated = useRef(null);
   const [isShowPopup, setShowPopup] = useState(false);
   const [userPlanets, setUserPlanets] = useState<IUserPlanet[]>([]);
   const [showCorable, setShowCorable] = useState(false);
   const [isShowUpgrade, setIsShowUpgrade] = useState(false);
   const [isAnotherPlanet, setIsAnotherPlanet] = useState(false);
   const [anotherPlanetId, setIsAnotherPlanetId] = useState(0);
   const [isLoading, setIsLoading] = useState(false);
   const [isRentPopupOpen, setIsRentPopupOpen] = useState(false);
   const [isAttackPopupOpen, setIsAttackPopupOpen] = useState(false);
   const [percentHealth, setPercentHealth] = useState<number | null>(null);
   const [click, setClick] = useState(1);
   const [lastClickTime, setLastClickTime] = useState(0);
   const [elementValue, setElementValue] = useState(0);
   const lastClickTimeout = useRef<NodeJS.Timeout | null>(null);
  //  const [planet, setPlanet] = useState(initialPlanetData);
   const isProcessing = useRef(false);
   const [value, setValue] = useState(0);
   const animatedRef = useRef(null);

   const [planet, setPlanet] = useState<FullPlanetResponse>(planetData);


   const refetchPlanet = async () => {
    const res = await fetch(`https://playmost.ru/api2/planet/${planetData.planet.id}`);
    const data = await res.json();
    setPlanet(data);
  };
  


   
   
 
   
 
   const {  setUser,  setWallet} =
     useUserStore();
 
   const address = useTonAddress();
   const telegram = window?.Telegram.WebApp;
   const tgID = telegram?.initDataUnsafe?.user?.id || 395581114;
   const userName = telegram?.initDataUnsafe?.user?.username || "JohnDoe";



  const wallet = window?.user?.wallet;

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (animatedRef.current && !animatedRef.current.dataset.animated) {
        console.log("BorderAnimation запускается");
        new BorderAnimation(animatedRef.current);
        animatedRef.current.dataset.animated = "true";
      } else {
        console.log("Либо animatedRef пуст, либо уже анимирован");
      }
    }, 1000); // можно настроить
  
    return () => clearTimeout(timeout);
  }, []);
  
  


  
  
  
   
   const getInitState = async () => {
    if (!window?.user?.id || !planetData?.planet?.element_id) return;
  
    const wallet = await getWalletFromBackend(window?.user?.id);
    if (!wallet || !wallet.value) {
      console.warn("Кошелек не получен или пустой");
      return;
    }
  
    window.user.wallet = wallet;
  
    const found = wallet.value.find(
      (bal) => String(bal.symbol) === String(planetData?.planet?.symbol)
    );
  
    const startVal = found?.value ?? 0;
  
    setValue(startVal);
    setElementValue(startVal);
    setLoading(false);
  };
  
 
   useEffect(() => {
     getInitState();
 }, [isLoading, window?.user]);

//  useEffect(() => {
//      if (animated.current) {
//          new BorderAnimation(animated.current); // 👈 стандартная
//      }
//    }, [planetData]);
   
   async function getWalletFromBackend(userId) {
     try {
       const response = await fetch('https://playmost.ru/api2/get-wallet', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({ user_id: window?.user?.id })  // <== передаём в теле
       });
   
       if (!response.ok) {
         throw new Error('Не удалось получить данные о кошельке');
       }
 
   
       const data = await response.json();
 
       return data; // или data.wallet если так оформлено
     } catch (error) {
       console.error('Ошибка при получении кошелька:', error);
       return null;
     }
   }
   
   const debounceFn = useCallback(
     (click: number) => {
       updateFn(click);
     },
     [wallet, planetData?.planet]
   );
 
   
   
  
   
 
   useEffect(() => {
     if (planetData?.planet && window?.user?.id) {
       getInitState();
     }
   }, [planetData, window?.user?.id]);

   
  //  useEffect(() => {
  //      if (animated.current) {

  //          new BorderAnimation(animated.current); // 👈 стандартная

  //      }
  
  
  
  
   
   
   if (loading || !planetData) return (
     <div className="color-ring-wrapper planets-ring">
       <ColorRing
         visible={true}
         height={1000}
         width={500}
         colors={[
           "#e15b64",
           "#f47e60",
           "#f8b26a",
           "#abbd81",
           "#849b87",
         ]}
       />
     </div>
   );

   
 
   const {
    planet: planetInfo,
    user_planet,
    speed,
    owners,
    elements
  } = planet || {};
  
   
   
   
 
   
   
   
   const updateMinedResource = async (id: number, mined: number) => {
     try {
       console.log("ID MINED", id);
       console.log("MINED", mined);
       console.log("USER ID", user?.id);
   
       const response = await fetch(`https://playmost.ru/api2/ssssss/${id}/`, {
         method: 'PUT',
         headers: {
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({ mined, user_id: user?.id }),
       });
   
       if (!response.ok) {
         const errorText = await response.text();
         throw new Error(`Ошибка при обновлении ресурса планеты: ${errorText}`);
       }
   
       const result = await response.json();
       console.log("Response mined", result);
       return result;
     } catch (error) {
       console.error('Ошибка в updateMinedResource:', error);
       return null;
     }
   };
   
 
   const updateWalletElement = async (wallet, value) => {
     console.log("FETCH WALLET", wallet);
   
     const response = await fetch(`https://playmost.ru/api2/wallet/${wallet.id}`, {
       method: "PUT",
       headers: {
         "Content-Type": "application/json",
       },
       body: JSON.stringify({
         id: wallet.id,
         user_id: user?.id,
         value: value,
       }),
     });
   
     if (!response.ok) {
       const error = await response.text();
       throw new Error(`Failed to update wallet: ${error}`);
     }
   
     const updated = await response.json();
     return updated;
   };
   
 
   const putWallet = async (wallet: IWallet, value: IWalletElement[], elementValue: number) => {
     console.log(click)
     console.log("Вот тут смортит ", planetInfo?.id!);
     console.log("Вот тут смотрим вариации ", elementValue);
 
     await updateMinedResource(planetInfo?.id!, elementValue);
     console.log("Тут тоже проходили ");
     return await updateWalletElement(wallet, value);
   };
   const updateFn = debounce(async (val: number) => {
     if (isLoading) {
       return;
     }
   
     if (!window.user?.wallet || !planetInfo?.element_id) return;
   
     const balance = window.user.wallet.value ?? [];
     const idx = balance.findIndex(
       (item) => String(item.element) === String(planetInfo.element_id)
     );
   
     const updatedValue = parseFloat(val.toFixed(10));
     let data;
   
     setIsLoading(true);
   
     if (idx !== -1) {
       balance[idx].value = updatedValue;
       data = [...balance];
     } else {
       const newElem: IWalletElement = {
         element: String(planetInfo.element_id),
         value: updatedValue,
         name: planetInfo.name,
         img: planetInfo.img,
         symbol: planetInfo.symbol,
         rare: (planetInfo.element_rare ?? "Обычная") as RARE_TYPE,
       };
       data = [...balance, newElem];
     }
   
     await putWallet(window.user.wallet, data, updatedValue);
     setValue(updatedValue);
     window.user.wallet.value = data;
   
     setIsLoading(false);
   }, 50);
       
 
 
 
   
 
   const isOwner = Array.isArray(owners) && owners.includes(user?.id || -1);

   const anotherUserPlanet = !isOwner && Array.isArray(owners) && owners.length > 0;

   console.log("another planet",user_planet);
 
   const showModal = (event: any, status: POPUP_STATUS) => {
         // Проверяем, существует ли event.target
         if (!event.target) {
           console.error('Event target is null or undefined');
           return; // Прерываем выполнение, если target не найден
     
           
         }
       
         const planetElement = event.target.closest(".planets__planet");
     
        
         
       
         // Если closest не нашел элемент, то выход из функции
         if (!planetElement) {
           console.error('Planet element not found');
           return;
         }
       
         let content;
         if (status === "upgrade") {
           content = `<div class="planet__popup-title">${t("planetUpg")}</div><div class="planet__popup-text">${t("speedIncrease")}</div>`;
         } else if (status === "wallet") {
           content = `<div class="planet__popup-title">${t("modalError")}</div><div class="planet__popup-text">${t("connectWallet")}</div>`;
         } else if (status === "updateError") {
           content = `<div class="planet__popup-title">${t("modalError")}</div><div class="planet__popup-text">${t("updateError")}</div>`;
         } else if (status === "balance") {
           content = `<div class="planet__popup-title">${t("modalError")}</div><div class="wallet__popup-text">${t("notEnoughtMoney")}</div>`;
         }
       
         content = '<div class="popup__inner">' + content + "</div>";
       
         // Если planetElement найден, показываем popup
         showPopup(planetElement, content, ["planet__popup"]);
       };
 
       const showUpgradeModal = (e: any) => {
         if (!user?.id) return 0; // Проверка на наличие пользователя
         const userPlanet = userPlanets.find(
           (item) => item.userId === user?.id  // Используем user?.id вместо 0
         );
         console.log("Нажато");
         // if (!userPlanet) return 0; // Проверка, что планета найдена
         console.log("Два");
         
         if (isAnotherPlanet) {
             return; // Возможно, должна быть проверка на другую планету
         }
     
         console.log("Четыре");
         setIsShowUpgrade(true);  // Открытие модалки
     }
     
 
           
 
     const debouncedPut = debounce(async (val: number) => {
       if (!window.user?.wallet || !planetInfo?.element_id) return;
     
       const balance = window.user.wallet.value ?? [];
       const idx = balance.findIndex(
         (item) => String(item.element) === String(planetInfo.element_id)
       );
     
       const updatedValue = parseFloat(val.toFixed(10));
       let data;
     
       if (idx !== -1) {
         balance[idx].value = updatedValue;
         data = [...balance];
       } else {
         const newElem: IWalletElement = {
           element: String(planetInfo.element_id),
           value: updatedValue,
           name: planetInfo.name,
           img: planetInfo.img,
           symbol: planetInfo.symbol,
           rare: (planetInfo.element_rare ?? "Обычная") as RARE_TYPE,
         };
         data = [...balance, newElem];
       }
     
       await putWallet(window.user.wallet, data, updatedValue);
       window.user.wallet.value = data;
     }, 300); // Можно увеличить задержку, например до 300-500 мс
           
 
           const walletUpdate = (e: any) => {
             if (e.target.tagName.toLowerCase() === "button") return;
             if (isAnotherPlanet) return;
           
             const plusIcon = document.createElement("div");
             plusIcon.textContent = "+";
             plusIcon.classList.add("plus-icon");
             plusIcon.style.left = `${e.pageX}px`;
             plusIcon.style.top = `${e.pageY}px`;
             document.body.appendChild(plusIcon);
             plusIcon.addEventListener("animationend", () => plusIcon.remove());
           
             const currentTime = Date.now();
             const clickInterval = currentTime - lastClickTime;
           
             const newVal = parseFloat((elementValue + 0.00005).toFixed(10));
           
             setElementValue(newVal); // UI сразу обновляется
             setValue(newVal);        // 👈 это главное: обновить то, что на экране
           
             setClick((prev) => prev + 1);
             setLastClickTime(currentTime);
           
             if (!address && click >= 4) {
               showModal(e, "wallet");
             }
           
             // просто отдаем новое значение debounce'у
             debouncedPut(newVal);
           };
           
           
 
   const getAllUserPlanetsById = async (id) => {
         try {
           console.log('Хотя бы что-то');
           console.log(id);
       
           // Отправляем запрос с planet_id в теле запроса
           const response = await fetch(`${url}/api2/userplanets`, {
             method: 'POST', // Изменяем метод на POST
             headers: {
               'Content-Type': 'application/json', // Указываем, что отправляем JSON
             },
             body: JSON.stringify({
               user_id: window.user?.id,
               planet_id: id, // Отправляем planet_id в теле запроса
             }),
           });
       
           // Проверка, что ответ успешный
           if (!response.ok) {
             throw new Error(`Ошибка: ${response.status}`);
           }
       
           // Получаем данные из ответа
           const data = await response.json();
           console.log('Полученные данные:', data);
       
           return data;  // Возвращаем полученные данные
         } catch (error) {
           console.error('Error fetching user planets:', error);
           throw error;  // Выбрасываем ошибку для обработки выше
         }
       };
   
   const getUsersPlanet = async () => {
         const result = await getAllUserPlanetsById(planetData?.planet?.id);
         setUserPlanets(result);
         setShowPopup(true);
       };
       const initVal = () => {
         return getInitialValue(planetInfo, user, isLoading, user_planets);
       }
 
 
       return (
         
         <div className={`planets__planet animated-border-container with_To rotate ${!isOwner ? "ver3" : isOwner ? "ver1" : "ver2"} ${Number(user_planet?.level) === 11 ? "green-glow" : ""} ${planetData?.planet?.forLaboratory ? "white-glow" : ""}`} onClick={walletUpdate} ref={animatedRef} >
           
           <div className={styles.planetWrapper}>
           

             <div className={styles.planetLeft}>
               <h4>
                 {planet.name} ({elements}) - Planet #{planetInfo.index}  {/* Отображаем символ элемента */}
               </h4>
     
               <span className={styles.planetDescription}>
                 Добываемый ресурс: {planetInfo.name} ({elements}) {/* Отображаем символ элемента */}
               </span>
     
               <div className={styles.owner}>
                 <div>
                   <img src="/icons/astronaut_helmet.png" width={32} height={32} />
                   <div className={styles.planetOwner}>
                     {isOwner ? "Владелец планеты: Вы " : anotherUserPlanet ? `Владелец: ID${user_planet?.userId}` : "Владельца нет"}
                   </div>
                 </div>
                 
                 <div className={styles.planet_right}>
  <div className={styles.planet_preview}>
    <div className={styles.planet_wrapper}>
      <img 
        src={`/img/planet/${planetInfo.img}`} 
        className={styles.planet_preview__planet} 
        alt={planetInfo.name} 
      />
      <button 
        className={styles.planet_list_button} 
        onClick={getUsersPlanet}
      >
        Список планет
      </button>
    </div>
  </div>
</div>


             
               </div>
               
               
 
 
 
     
               <div className={styles["planetInfo"]}>
                 <div className={styles["planetInfo__row"]}>
                   <span className={styles["planetInfo__title"]}>Уровень </span>
                   <span className={styles["planetInfo__description"]}>
   {user_planet.level ? user_planet.level : 1}
 </span>
 
                 </div>
     
                 <div className={styles["planetInfo__row"]}>
                   <span className={styles["planetInfo__title"]}>Скорость </span>
                   <span className={styles["planetInfo__description"]}>
                   { (speed).toFixed(5)} ({planetInfo.symbol})
                   {speed < 0.01 ? '/тап' : '/ч'}
                   </span>
                 </div>
     

     
                 <div className={styles["planetInfo__row"]}>
                   <span className={styles["planetInfo__title"]}>Добыто </span>
                   <span className={styles["planetInfo__description"]}>
                     {value.toFixed(5) ?? "Загрузка..."}
                   </span>
                 </div>
                 {planetInfo.forLaboratory && (
             <div className="planet__time-timer">
               <Timer />
             </div>
           )}
           </div>
               </div>
             </div>
             
     
             
           
           <div className={styles.actions}>
           {!isOwner && (
   <button
     className={styles["action-btn"]}
     onClick={() => setIsAttackPopupOpen(true)} // Открываем попап
   >
     {t('attack')}
     <img src="/icons/sword.png" width={20} height={20} />
     
   </button>
 )}
 
 
           {!isOwner && (
             <button
               className={styles["action-btn"]}
               onClick={() => setIsRentPopupOpen(true)}
             >
               {t('rent')}
               <img src="/icons/time.png" width={20} height={20} />
             </button>
           )}
 
            {isOwner && Number(user_planet.level) !== 11 && (
   <button
     className={styles["action-btn"]}
     onClick={() => {
       console.log("LEVEL CLICKED:", user_planet.level);
       showUpgradeModal(true);
     }}
   >
     Улучшить
     <img src="/icons/upgrade.png" width={24} height={24} />
   </button>
 )}
 
 {/* {isOwner && Number(user_planet.level) === 11 && (
  <p>Планета достигла максимального уровня! </p>
 
 )} */}
 
 
           </div>
     
           <div className={styles.planet_bottom} style={{ backgroundImage: `url(/img/buildings/${isOwner ? user_planet.level-1 :   user_planet.level > 0
        ? user_planet.level - 1 : 0}.png)` }}>
           
           <div className={styles.planet_bottom_actions}>
           

              <div className={styles.planet_bottom_actions__up}>

               
             </div>
             
               
               <Link to="/tasks">
                  <div className={styles.free_res}>
                    <div className={styles.free_res__title}>{t('freeResource')}</div>
                    <div className={styles.free_res__description}> {t('freeResourceInfo')}</div>
                  </div>
                </Link>
             </div>
           </div>
 
           {isShowPopup && userPlanets && (
             <UserPlanetsPopup
               planets={userPlanets}
               setShowPopup={setShowPopup}
               planet={planetData.planet}
               userId={user?.id}
               onClick={(is: boolean, number: number) => {
                 setIsAnotherPlanet(is)
                 setIsAnotherPlanetId(number)
               }}
             />
           )}
 
 {isRentPopupOpen && (
   <RentPlanetPopup
     isOpen={isRentPopupOpen}
     setIsRentPopupOpen={setIsRentPopupOpen} // Передаем функцию для управления состоянием
     onRentSuccess={() => {
       // updatePlanetSpeed(); // или другая функция аренды
     }}
     planetId={planetInfo?.id}
     userId={user?.id}
   />
 )}
 
 {isAttackPopupOpen && (
   <AttackPlanetPopup
     isOpen={isAttackPopupOpen}
     setIsAttackPopupOpen={setIsAttackPopupOpen}
     onAttackSuccess={() => {
       // updatePlanetSpeed();
     }}
     
     planetId={planetInfo?.id}               // Передаем id планеты
     userId={user?.id} 
     planet={planetInfo} // <-- передаем сюда
   />
 )}
 
 
 
 
 
 
 <UpgradePlanet
  setShowPopup={setIsShowUpgrade}
  isOpen={isShowUpgrade}
  onSuccess={refetchPlanet}
  planetId={planetInfo?.id}  // теперь planetInfo
  userId={user?.id}
  user={user}
/>


 
           <ShipMarket userId={user?.id} onClick={() => {}} onSuccess={() => {}} planetId={planetInfo.id}    isOpen={showCorable} setShowPopup={setShowCorable} />
         </div>
       );
     }
 
