// Main.jsx
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Centrifuge } from "centrifuge";
import GameScreen from "../pages/Gamescreen";
import FlyingCards from "./Flyingcard"; 
import Toast from "../pages/Toast";

import GameHandAnimator from "./Gamehandanimator";

export default function Main() {
  const { t } = useTranslation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);


  const [isStakeModal, setIsStakeModal] = useState(false);
  const [stake, setStake] = useState(0);

  const [isWaiting, setIsWaiting] = useState(false);
  const [waitingRoomId, setWaitingRoomId] = useState(null);
  const isSearchingRef = useRef(false);

  const centrifugeRef = useRef(null);
  const subRef = useRef(null); 
  const userSubRef = useRef(null);
  const gameScreenRef = useRef(null); 

  const telegram = window?.Telegram?.WebApp;
  const [isDealing, setIsDealing] = useState(null);
  const tgID = telegram?.initDataUnsafe?.user?.id || 0;
  const SOCKET_URL = "wss://grantexpert.pro/centrifugo/connection/websocket";
  const back = import.meta.env.VITE_BACKEND_URL || "https://grantexpert.pro/backend";

  const [gameVisible, setGameVisible] = useState(false); 
  const pendingRoomStartRef = useRef(null);

  const [roomState, setRoomState] = useState(null); 
  const [playerHand, setPlayerHand] = useState([]); 
  const [opponentHandCount, setOpponentHandCount] = useState(0); 

  const [trump, setTrump] = useState(null);       
  const [tableCards, setTableCards] = useState([]); 
  const [attackerId, setAttackerId] = useState(null); 
  const [defenderId, setDefenderId] = useState(null); 

  const [prevPlayerHandCount,setPrevPlayerHandCount] = useState(null);
  const [prevOpponentHandCount,setPrevOpponentHandCount] = useState(null);

  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [isReshuffling, setIsReshuffling] = useState(false); 
  const [isGameStarting, setIsGameStarting] = useState(false); 

  const [toastMessage, setToastMessage] = useState('');

  const handProcessedRef = useRef(false);

  const [flyingCards, setFlyingCards] = useState([]); 
  const [localHand, setLocalHand] = useState(() => {
    const saved = localStorage.getItem('playerHand');
    return saved ? JSON.parse(saved) : playerHand || [];
  });
  const lastHandRef = useRef([]);
  const animatingDrawRef = useRef(false); 

  const NewHand = [];



const roomStateRef = useRef(null);
const pendingDrawRef = useRef(null);       
const pendingFullHandRef = useRef(null); 

useEffect(() => {
  if (!tgID) return;
  console.log("возврат в игру")

  let mounted = true;

  const init = async () => {
    try {
      const token = await fetchTokenFromBackend(tgID);
      if (!mounted) return;

      const centrifugeInstance = new Centrifuge(SOCKET_URL, { token });

      centrifugeInstance.on("connect", () => console.log("Centrifuge connected"));
      centrifugeInstance.on("disconnect", () => console.log("Centrifuge disconnected"));
      centrifugeInstance.connect();
      centrifugeRef.current = centrifugeInstance;


      const resp = await fetch(`${back}/burkozel/all_rooms?tgID=${tgID}`);
      if (resp.ok) {
        const data = await resp.json();
        const roomsArray = Array.isArray(data) ? data : data.rooms || [];
        console.log("roomsArray",roomsArray);


        const existingRoom = roomsArray.find(r => r.status === "playing" && r.players?.[String(tgID)]);
        console.log("existingRoom найден:", existingRoom);

     if (existingRoom) {
  console.log("Возвращаем игрока в игру, комната уже active:", existingRoom.room_id);

  setWaitingRoomId(existingRoom.room_id);
  subscribeToRoom(existingRoom.room_id);
  subscribeToUser(tgID);

  const roomResp = await fetch(`${back}/burkozel/room/${existingRoom.room_id}`);
  if (roomResp.ok) {
    const roomJson = await roomResp.json();
    console.log("roomJson loaded for rejoin:", roomJson);

    pendingRoomStartRef.current = roomJson;

    setRoomState(roomJson);
    setGameVisible(true);

  } else {
    console.warn("Не удалось получить полный state комнаты при возврате", roomResp.status);
  }

  return;
}


      }

    } catch (err) {
      console.error("Ошибка при проверке существующих комнат:", err);
    }
  };

  init();

  return () => { mounted = false; };
}, [tgID]);


useEffect(() => {
  if (!gameVisible) return; 
  let cancelled = false;

  const tryStartPendingRoom = async () => {
    const pending = pendingRoomStartRef.current;
    if (!pending) return;

    console.log("Попытка отложенного старта комнаты", pending.room_id);


    const totalWait = 5000;
    const step = 80;
    let waited = 0;
    while (!cancelled && waited < totalWait) {
      if (tableRef.current && (!gameScreenRef.current || typeof gameScreenRef.current.handleDrawCards === 'function' || true)) {
        break;
      }

      await new Promise(r => setTimeout(r, step));
      waited += step;
    }

    if (cancelled) return;

    console.log("После ожидания: tableRef=", !!tableRef.current, "gameScreenRef=", !!gameScreenRef.current);

    try {

      await startGame(pending);
      console.log("startGame выполнен для отложенной комнаты", pending.room_id);
    } catch (e) {
      console.error("Ошибка при startGame отложенной комнаты:", e);
      const me = pending.players?.[String(tgID)] || { hand: [] };
      const oppId = Object.keys(pending.players || {}).find(id => id !== String(tgID));
      const oppHand = oppId ? (pending.players[oppId].hand || []) : [];
      setPlayerHand(me.hand || []);
      setOpponentHandCount(oppHand.length);
    } finally {
      pendingRoomStartRef.current = null;
    }
  };

  tryStartPendingRoom();

  return () => { cancelled = true; };
}, [gameVisible]);



  const handleRoundEnd = (roundWinner) => {
    console.log("🏆 Round ended, winner:", roundWinner);
  };

  const [dealingCards, setDealingCards] = useState([]); 
  const tableRef = useRef(null);

  


  async function fetchTokenFromBackend(userId) {
    const res = await fetch(`${back}/burkozel/get_socket_token?user_id=${userId}`);
    if (!res.ok) throw new Error("Failed to get Centrifugo token");
    const data = await res.json();
    return data.token;
  }

  const lobbySubRef = useRef(null);

  useEffect(() => {
    if (!centrifugeRef.current) return;
    if (lobbySubRef.current) return; 

    const sub = centrifugeRef.current.newSubscription("lobby");

    sub.on("publication", (ctx) => {
      const data = ctx.data || ctx;
      const ev = data.event || data.type;
      if (ev === "room_update" || ev === "player_joined" || ev === "player_left") {
        console.log("Lobby event, refreshing rooms:", data);
        fetchRooms();
      }
    });

    sub.on("subscribe", (ctx) => console.log("Lobby subscribed", ctx));
    sub.on("error", (err) => console.error("Lobby sub error", err));

    sub.subscribe();
    lobbySubRef.current = sub;

    return () => {
      if (lobbySubRef.current) {
        lobbySubRef.current.unsubscribe();
        lobbySubRef.current = null;
      }
    };
  }, [centrifugeRef.current]);


  useEffect(() => {
    if (!isModalOpen) return;

    fetchRooms(); 

    const interval = setInterval(fetchRooms, 4000);

    return () => clearInterval(interval);
  }, [isModalOpen]);


  useEffect(() => {
    let mounted = true;
    let centrifugeInstance = null;

    async function init() {
      try {
        const token = await fetchTokenFromBackend(tgID);
        if (!mounted) return;
        centrifugeInstance = new Centrifuge(SOCKET_URL, { token });
        centrifugeInstance.on("connect", (ctx) => {
          console.log("Centrifuge connected", ctx);
          subscribeToUser(tgID);
        });
        centrifugeInstance.on("disconnect", (ctx) => console.log("Centrifuge disconnected", ctx));
        centrifugeInstance.on("error", (err) => console.error("Centrifuge error", err));
        centrifugeInstance.connect();
        centrifugeRef.current = centrifugeInstance;
      } catch (err) {
        console.error("initCentrifugo failed:", err);
      }
    }

    if (tgID) init();

    return () => {
      mounted = false;
      try {
        if (userSubRef.current) { userSubRef.current.unsubscribe(); userSubRef.current = null; }
        if (subRef.current) { subRef.current.unsubscribe(); subRef.current = null; }
        if (centrifugeRef.current) {
          centrifugeRef.current.disconnect();
          centrifugeRef.current = null;
        }
      } catch (e) {}
    };
  }, [tgID]);


  const fetchRooms = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${back}/burkozel/rooms?tgID=${tgID}`);
      if (!response.ok) throw new Error("Failed to fetch rooms");
      const data = await response.json();
      const roomsArray = Array.isArray(data) ? data : data.rooms || [];
      setRooms(roomsArray);
    } catch (err) {
      console.error(err);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isModalOpen) fetchRooms();
  }, [isModalOpen]);

  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));


const subscribedTopicsRef = useRef(new Set());


async function subscribeToUser(userId) {
  if (!userId) return;
  if (!centrifugeRef.current) {
    console.warn("centrifuge not ready yet, cannot subscribe to user");
    return;
  }

  const topic = `user#${userId}`;

  try {
    if (userSubRef.current && userSubRef.current.topic === topic) return;
    if (subscribedTopicsRef.current.has(topic)) {
      console.log("subscribeToUser: already subscribed (set) to", topic);
      return;
    }

    if (userSubRef.current) {
      try { userSubRef.current.unsubscribe(); } catch (e) { console.warn("Error unsubscribing old userSubRef:", e); }
      subscribedTopicsRef.current.delete(userSubRef.current.topic);
      userSubRef.current = null;
    }

    const sub = centrifugeRef.current.newSubscription(topic);
    sub.topic = topic;

    sub.on("publication", async (ctx) => {
      const data = ctx.data || ctx;
      const ev = data.event || data.type;
      const payload = data.payload || data.data || data;
      console.log("user channel pub", ev, payload);
if (ev === "hand") {
  const newCards = payload.new_cards || [];
  const oldCards = payload.old_card_user || [];

  if (!newCards.length && !oldCards.length) return;

  handAddedRef.current = [...(handAddedRef.current || []), ...newCards];
  handProcessedRef.current = true;
  setTimeout(() => { handProcessedRef.current = false; }, 100);

  console.log("tgid", tgID);
  console.log("old_card_user (server hand)", oldCards);
  console.log("new_cards", newCards);

  if (gameScreenRef.current?.handleDrawCards && newCards.length > 0) {
    await drawCardsWithAnimation(newCards);
  }

  const updatedHand = [...oldCards, ...newCards];
  setPlayerHand(updatedHand);
  lastHandRef.current = [...updatedHand];
  setPrevPlayerHandCount(updatedHand.length);

  if (payload.deck_count != null || payload.trump != null) {
    setTrump(payload.trump);
    setRoomState(r => ({
      ...(r || {}),
      deck_count: payload.deck_count ?? r?.deck_count,
      trump: payload.trump ?? r?.trump,
    }));
  }

  console.log("✅ fullhand", updatedHand);
}







    });

    sub.on("subscribe", (ctx) => console.log("user subscribe ok", ctx));
    sub.on("error", (err) => console.error("user sub error", err));

    sub.subscribe();

    userSubRef.current = sub;
    subscribedTopicsRef.current.add(topic);

    console.log("subscribeToUser: subscribed to", topic);
  } catch (e) {
    console.error("subscribeToUser error", e);
  }
}

const subscribeToRoom = (roomId) => {
  if (!roomId) return;
  if (!centrifugeRef.current) {
    console.warn("centrifuge not ready yet, cannot subscribe");
    return;
  }

  const topic = `room#${roomId}`;

  try {
    if (subRef.current && subRef.current.topic === topic) return;
    if (subscribedTopicsRef.current.has(topic)) {
      console.log("subscribeToRoom: already subscribed (set) to", topic);
      return;
    }

    if (subRef.current) {
      try {
        subRef.current.unsubscribe();
      } catch (e) { console.warn("Error unsubscribing old subRef:", e); }
      subscribedTopicsRef.current.delete(subRef.current.topic);
      subRef.current = null;
    }

    const sub = centrifugeRef.current.newSubscription(topic);
    sub.topic = topic;

    sub.on("publication", (ctx) => {
      const data = ctx.data;

      if (data.payload) {
        roomStateRef.current = data.payload;
        console.log("✅ roomStateRef updated", roomStateRef.current);
      }

      handleCentrifugoEvent(data, roomId);
    });

    sub.on("subscribe", (ctx) => console.log("room subscribe ok", ctx));
    sub.on("error", (errCtx) => console.error("subscription error", errCtx));

    sub.subscribe();

    subRef.current = sub;
    subscribedTopicsRef.current.add(topic);

    console.log("subscribeToRoom: subscribed to", topic);
  } catch (e) {
    console.error("subscribeToRoom error", e);
  }
};



const unsubscribeAll = () => {
  try {
    if (subRef.current) {
      try { subRef.current.unsubscribe(); } catch (e) { console.warn("unsubscribe subRef failed", e); }
      subscribedTopicsRef.current.delete(subRef.current.topic);
      subRef.current = null;
    }
    if (userSubRef.current) {
      try { userSubRef.current.unsubscribe(); } catch (e) { console.warn("unsubscribe userSubRef failed", e); }
      subscribedTopicsRef.current.delete(userSubRef.current.topic);
      userSubRef.current = null;
    }
  } catch (e) {
    console.warn("unsubscribeAll error", e);
  }
};


const reconcilePlayerHandFromServer = async (serverHand = [], animate = false) => {
  if (!Array.isArray(serverHand)) serverHand = [];

  const key = c => `${c[0]}|${c[1]}`;


  const serverSig = serverHand.map(key).join(',');
  if (lastHandRef.current && lastHandRef.current._serverSig === serverSig) {
    return;
  }

  const local = Array.isArray(playerHand) ? playerHand : [];

  const makeCountMap = (arr) => {
    const m = new Map();
    arr.forEach(c => {
      const k = key(c);
      m.set(k, (m.get(k) || 0) + 1);
    });
    return m;
  };

  const localMap = makeCountMap(local);
  const serverMap = makeCountMap(serverHand);


  const removed = [];
  {
    const serverCopy = new Map(serverMap);
    for (const c of local) {
      const k = key(c);
      const cnt = serverCopy.get(k) || 0;
      if (cnt > 0) {
        serverCopy.set(k, cnt - 1);
      } else {
        removed.push(c);
      }
    }
  }

  const added = [];
  {
    const localCopy = new Map(localMap);
    for (const c of serverHand) {
      const k = key(c);
      const cnt = localCopy.get(k) || 0;
      if (cnt > 0) {
        localCopy.set(k, cnt - 1);
      } else {
        added.push(c);
      }
    }
  }

  console.log("reconcilePlayerHandFromServer -> local:", local.length,
    "server:", serverHand.length,
    "added:", added.length,
    "removed:", removed.length, "animate:", animate);

  if (removed.length > 0) {
    setPlayerHand(serverHand);
    lastHandRef.current = [...serverHand];
    lastHandRef.current._serverSig = serverSig;
    setPrevPlayerHandCount(serverHand.length);
    return;
  }


  if (added.length > 0 && !animate) {
    setPlayerHand(serverHand);
    lastHandRef.current = [...serverHand];
    lastHandRef.current._serverSig = serverSig;
    setPrevPlayerHandCount(serverHand.length);
    return;
  }

 
  if (added.length > 0 && animate) {
    try {
      lastHandRef.current = Array.isArray(playerHand) ? [...playerHand] : [];

      await drawCardsWithAnimation(added);

      setPlayerHand(serverHand);
      lastHandRef.current = [...serverHand];
      lastHandRef.current._serverSig = serverSig;
      setPrevPlayerHandCount(serverHand.length);
    } catch (e) {
      console.warn("reconcile: animation failed, falling back to setPlayerHand", e);
      setPlayerHand(serverHand);
      lastHandRef.current = [...serverHand];
      lastHandRef.current._serverSig = serverSig;
      setPrevPlayerHandCount(serverHand.length);
    }
    return;
  }

  lastHandRef.current = [...serverHand];
  lastHandRef.current._serverSig = serverSig;
  setPrevPlayerHandCount(serverHand.length);

  if (local.length !== serverHand.length || serverHand.some((c,i) => (local[i] ? key(local[i]) !== key(c) : true))) {
    setPlayerHand(serverHand);
  }
};



const drawCardsWithAnimation = async (newCards, onCompleteAfterAnimation = null) => {
  if (!newCards?.length) return;

  if (animatingDrawRef.current) {
    pendingDrawRef.current = pendingDrawRef.current
      ? [...pendingDrawRef.current, ...newCards]
      : [...newCards];
    return;
  }

  animatingDrawRef.current = true;
  setIsDealing(true);

  try {
    const oldVisible = lastHandRef.current ? [...lastHandRef.current] : (playerHand || []);
    setPlayerHand(oldVisible);

    await new Promise(res => requestAnimationFrame(res));
    await sleep(16);

    if (gameScreenRef.current?.handleDrawCards) {
      await gameScreenRef.current.handleDrawCards(newCards, true, (landedCards) => {
        setPlayerHand(prev => {
          const newHand = [...(prev || [])];
          const cardsToProcess = Array.isArray(landedCards) ? landedCards : [landedCards];
          for (const landedCard of cardsToProcess) {
            const exists = newHand.some(c => c && landedCard && c[0] === landedCard[0] && c[1] === landedCard[1]);
            if (!exists) newHand.push(landedCard);
          }
          return newHand;
        });
      }, oldVisible.length);
    } else {
      setPlayerHand(prev => [...(prev || []), ...newCards]);
    }

    await sleep(80);
  } catch (e) {
    console.warn("drawCardsWithAnimation failed", e);
    setPlayerHand(prev => [...(prev || []), ...newCards]);
  } finally {
    animatingDrawRef.current = false;
    setIsDealing(false);

    if (typeof onCompleteAfterAnimation === "function") onCompleteAfterAnimation();
  }

  const queued = pendingDrawRef.current;
  pendingDrawRef.current = null;
  if (queued && queued.length) {
    await sleep(80);
    await drawCardsWithAnimation(queued, onCompleteAfterAnimation);
  }
};




const handAddedRef = useRef([]);
  const handleCentrifugoEvent = async (data, roomId) => {
    if (!data) return;
    const ev = data.event || data.type;
    const payload = data.payload || data.data || data;

    console.log("Centrifugo event", ev, payload);

    if (ev === "player_joined") {
      fetchRooms();
    }

    if (ev === "game_start") {
      const roomId = payload.room_id || payload.room?.room_id;
      if (roomId) fetchFullRoomAndStartGame(roomId);
    }

    if (ev === "room_update") {
      if (payload.room) {
        console.log("Updating roomState with:", payload.room);
        setRoomState(payload.room);

        if (!isDealing) {
          const me = payload.room.players?.[String(tgID)];
          const opponentId = Object.keys(payload.room.players || {}).find(id => id !== String(tgID));
          const op = opponentId ? payload.room.players[opponentId] : null;


        }

        if (payload.room.trump) setTrump(payload.room.trump);
        if (payload.room.table !== undefined) setTableCards(payload.room.table || []);
        if (payload.room.attacker !== undefined) setAttackerId(payload.room.attacker);
        if (payload.room.defender !== undefined) setDefenderId(payload.room.defender);
      }
    }


if (ev === "move" && payload.room) {
  if (handProcessedRef.current) {
  console.log("Move skipped due to recent hand processing");

  setRoomState(payload.room);
  

  return;
}


  setRoomState(payload.room);

  const me = payload.room.players?.[String(tgID)];
  const opponentId = Object.keys(payload.room.players || {}).find(id => id !== String(tgID));
  const op = opponentId ? payload.room.players[opponentId] : null;

  if (op?.hand) {
    setOpponentHandCount(op.hand.length);
    setPrevOpponentHandCount(op.hand.length);
  }

  if (payload.last_turn) {
    setTableCards([payload.last_turn.attack, payload.last_turn.defend].filter(Boolean));
  }

  if (payload.room.trump) setTrump(payload.room.trump);
  if (payload.room.attacker !== undefined) setAttackerId(payload.room.attacker);
  if (payload.room.defender !== undefined) setDefenderId(payload.room.defender);
  if (!gameVisible) setGameVisible(true);

  if (me?.hand) {
    (async () => {
      try {
        await reconcilePlayerHandFromServer(me.hand, false);
      } catch (e) {
        console.warn("reconcilePlayerHandFromServer failed:", e);
        setPlayerHand(me.hand);
        lastHandRef.current = [...(me.hand || [])];
        setPrevPlayerHandCount((me.hand || []).length);
      }
    })();
  }
}




    if (ev === "game_over") {
  console.log("🏆 Game Over event received:", payload);
  
  const winnerId = payload.winner;
  const loserId = payload.loser;
  const isGameFinished = payload.game_finished || payload.final || payload.winner || false;
  
  console.log("🏆 Winner ID:", winnerId, "Loser ID:", loserId, "My ID:", tgID, "Game finished:", isGameFinished);
  
  const didIWin = String(winnerId) === String(tgID);
  
  if (isGameFinished) {

    setGameOver(true);
    setWinner(didIWin ? 'player' : 'opponent');
    console.log("🏆 Setting final game over state: winner =", didIWin ? 'player' : 'opponent');
  } else {


    console.log("🏆 Round ended, fetching updated room state...");
   
  }
}

    if (ev === "reshuffle") {
      console.log("🔀 Reshuffle event received:", payload);
      
      setIsReshuffling(true);
      
      if (payload.room) {
        console.log("🔀 Updating room state with reshuffled data:", payload.room);
        setRoomState(payload.room);
        
        if (payload.room.trump) setTrump(payload.room.trump);
        if (payload.room.table !== undefined) setTableCards(payload.room.table || []);
        if (payload.room.attacker !== undefined) setAttackerId(payload.room.attacker);
        if (payload.room.defender !== undefined) setDefenderId(payload.room.defender);
        
        const me = payload.room.players?.[String(tgID)];
        const opponentId = Object.keys(payload.room.players || {}).find(id => id !== String(tgID));
        const opponent = opponentId ? payload.room.players[opponentId] : null;
        
        if (me?.hand && opponent?.hand) {
          console.log("🔀 Starting dealing animation after reshuffle");
          
          setTimeout(() => {
            if (gameScreenRef.current && gameScreenRef.current.startDealingAnimation) {
              gameScreenRef.current.startDealingAnimation(me.hand, opponent.hand.length);
            }
            
            setTimeout(() => {
              setPlayerHand(me.hand);
              setOpponentHandCount(opponent.hand.length);
              setPrevPlayerHandCount(me.hand.length);
              setPrevOpponentHandCount(opponent.hand.length);
              
              setIsReshuffling(false);
              
              console.log("🔀 Reshuffle completed, new hands dealt");
            }, 2000); 
          }, 1500); 
        } else {

          setTimeout(() => {
            setIsReshuffling(false);
          }, 2000);
        }
      } else {

        setTimeout(() => {
          setIsReshuffling(false);
        }, 2000);
      }
    }


    if (gameVisible && (payload.room || payload.ok)) {
      const room = payload.room || payload;
      if (room && room.attacker) {
        console.log("Found room data in event", ev, "updating roomState and game states");
        setRoomState(room);
        
        if (room.trump) setTrump(room.trump);
        if (room.table !== undefined) setTableCards(room.table || []);
        if (room.attacker !== undefined) setAttackerId(room.attacker);
        if (room.defender !== undefined) setDefenderId(room.defender);
      }
    }
    

    if (payload.last_turn && gameVisible) {
      console.log("🎭 Found last_turn in", ev, "event:", payload.last_turn);

    }


  };


  const fetchFullRoomAndStartGame = async (roomId) => {
    try {
      console.log("🔄 Fetching full room state for room:", roomId);

      const response = await fetch(`${back}/burkozel/room/${roomId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const fullRoom = await response.json();
        console.log("✅ Fetched full room state:", fullRoom);

        if (fullRoom.players && Object.keys(fullRoom.players).length >= 2) {
          startGame(fullRoom);
        } else {
          setRoomState(fullRoom);
        }
      } else {
        console.error("❌ Failed to fetch room state:", response.status);
      }
    } catch (error) {
      console.error("❌ Error fetching room state:", error);
    }
  };

 const waitForTableRef = async (timeout = 3000, interval = 50) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (tableRef.current) return true;
    await sleep(interval);
  }
  console.warn("waitForTableRef timed out");
  return false;
};

const startGame = async (room) => {

  setGameVisible(true);

  const myIdStr = String(tgID);
  const meHand = (room.players && room.players[myIdStr] && Array.isArray(room.players[myIdStr].hand))
    ? room.players[myIdStr].hand
    : [];
  const opponentId = Object.keys(room.players || {}).find(id => id !== myIdStr);
  const oppHand = opponentId && room.players && room.players[opponentId] && Array.isArray(room.players[opponentId].hand)
    ? room.players[opponentId].hand
    : [];

  setPlayerHand([]); 
  setOpponentHandCount(0);
  lastHandRef.current = [...meHand]; 


  if (room.trump) setTrump(room.trump);
  if (room.table !== undefined) setTableCards(room.table || []);
  if (room.attacker !== undefined) setAttackerId(room.attacker);
  if (room.defender !== undefined) setDefenderId(room.defender);
  setRoomState(room);

  const ready = await waitForTableRef(3000, 50);

  if (!ready) {

    setPlayerHand(meHand);
    setOpponentHandCount(oppHand.length);
    setPrevPlayerHandCount(meHand.length);
    setPrevOpponentHandCount(oppHand.length);
    return;
  }

  try {

    await animateDeal(
      meHand.length,
      oppHand.length,
      meHand,
      oppHand
    );
  } catch (e) {
    console.warn("animateDeal failed, falling back to immediate hand set:", e);
  }


  setPlayerHand(meHand);
  setOpponentHandCount(oppHand.length);


  setPrevPlayerHandCount(meHand.length);
  setPrevOpponentHandCount(oppHand.length);


  lastHandRef.current = [...meHand];
};



  const animateDeal = async (myCount, oppCount, myHandArr = [], oppHandArr = [], onComplete = null) => {
    const container = tableRef.current;
  if (!container) {
    await sleep(400 * Math.max(myCount, oppCount));
    onComplete?.();
    return;
  }

  const rect = container.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const bottomY = rect.top + rect.height - 140;
  const topY = rect.top + 60;

  const computePositions = (count, y, cardWidth = 90, gap = 26) => {
    const totalW = Math.max(count * cardWidth - (count - 1) * gap, cardWidth);
    const startX = rect.left + (rect.width - totalW) / 2 + cardWidth / 2;
    return Array.from({ length: count }, (_, i) => ({ x: startX + i * (cardWidth - gap), y }));
  };

  const bottomPos = computePositions(Math.min(4, myHandArr.length), bottomY);
  const topPos = computePositions(Math.min(4, oppHandArr.length), topY);

  let flyingCards = [];

  flyingCards.push({ id: 'center', card: ["?", "?"], x: centerX, y: centerY });
  setDealingCards([...flyingCards]);
  await sleep(300);


  oppHandArr.slice(0, 4).forEach((card, i) => {
    flyingCards.push({ id: `opp-${i}`, card, x: centerX, y: centerY, targetX: topPos[i].x, targetY: topPos[i].y });
  });

  myHandArr.slice(0, 4).forEach((card, i) => {
    flyingCards.push({ id: `my-${i}`, card, x: centerX, y: centerY, targetX: bottomPos[i].x, targetY: bottomPos[i].y });
  });

  setDealingCards([...flyingCards]);
  await sleep(100);

  for (let fc of flyingCards.slice(1)) { 
    setDealingCards(old =>
      old.map(c => c.id === fc.id ? { ...c, x: fc.targetX, y: fc.targetY } : c)
    );
    await sleep(200); 
  }

  await sleep(500);
  setDealingCards([]);

  onComplete?.();
  };


const isPlayerInRoom = async (roomId) => {
  if (!roomId) return false;
  try {
    const resp = await fetch(`${back}/burkozel/room/${roomId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!resp.ok) {
      console.warn(`isPlayerInRoom: failed to fetch room ${roomId} status=${resp.status}`);
      return false;
    }
    const room = await resp.json();
    const players = room.players || {};
    return !!players[String(tgID)];
  } catch (e) {
    console.warn("isPlayerInRoom error:", e);
    return false;
  }
};

const handleFindPlayer = async () => {
  setIsStakeModal(false);
  setIsWaiting(true);
  isSearchingRef.current = true;

  try {
    const res = await fetch(`${back}/burkozel/find_player`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tg_id: tgID, nickname: "Игрок", stake }),
    });

    const data = await res.json().catch(() => ({}));
    console.log("find_player response:", res.status, data);

    if (!res.ok) {
      throw new Error(data?.error || data?.detail || `find_player failed (${res.status})`);
    }

    const roomId = data.room_id || data.room?.room_id || data.id;
    if (!roomId) throw new Error("find_player не вернул room_id");

    setWaitingRoomId(roomId);

    const alreadyIn = await isPlayerInRoom(roomId);
    if (alreadyIn) {
      console.log("handleFindPlayer: already in room, skipping join_room:", roomId);
      subscribeToRoom(roomId);
      subscribeToUser(tgID);
      await sleep(220);

      try {
        const roomResp = await fetch(`${back}/burkozel/room/${roomId}`);
        if (roomResp.ok) {
          const roomJson = await roomResp.json();
          setRoomState(roomJson);
          startGame(roomJson);
        }
      } catch (err) {
        console.warn("Ошибка загрузки комнаты после skip-join:", err);
      }

      isSearchingRef.current = false;
      return;
    }

    try {
      const joinResp = await fetch(`${back}/burkozel/join_room`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_id: roomId, tg_id: tgID, nickname: "Игрок" }),
      });
      if (!joinResp.ok) {
        const txt = await joinResp.text().catch(() => "");
        console.warn("join_room non-ok:", joinResp.status, txt);
      } else {
        console.log("join_room ok");
      }
    } catch (err) {
      console.warn("join_room request failed (non-fatal):", err);
    }

    subscribeToRoom(roomId);
    subscribeToUser(tgID);
    await sleep(220);

    try {
      const roomResp = await fetch(`${back}/burkozel/room/${roomId}`);
      if (roomResp.ok) {
        const roomJson = await roomResp.json();
        setRoomState(roomJson);
        startGame(roomJson);
      } else {
        console.warn("Failed to fetch room after find/join:", roomResp.status);
      }
    } catch (err) {
      console.warn("Ошибка загрузки комнаты после join:", err);
    }

    isSearchingRef.current = false;
  } catch (err) {
    console.error("handleFindPlayer error:", err);
    isSearchingRef.current = false;
    setIsWaiting(false);
    unsubscribeAll();
    setToastMessage('' + err.message);
    const timer = setTimeout(() => setToastMessage(""), 3000);
    return () => clearTimeout(timer);
  }
};



const handleJoinRoom = async (room_id) => {
  setWaitingRoomId(room_id);
  setIsWaiting(true);

  try {
  
    const alreadyIn = await isPlayerInRoom(room_id);
    if (alreadyIn) {
      console.log("handleJoinRoom: player already in room, skipping join_room:", room_id);
      subscribeToRoom(room_id);
      subscribeToUser(tgID);
      await sleep(220);
      const response = await fetch(`${back}/burkozel/room/${room_id}`);
      if (response.ok) {
        const roomJson = await response.json();
        setRoomState(roomJson);
        if (roomJson.players && Object.keys(roomJson.players).length >= 2) {
          startGame(roomJson);
        }
      }
      return;
    }

    const joinResp = await fetch(`${back}/burkozel/join_room`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room_id, tg_id: tgID, nickname: "Игрок" }),
    });

    if (!joinResp.ok) {
      const txt = await joinResp.text().catch(() => "");
      throw new Error("join_room failed: " + txt);
    }

    subscribeToRoom(room_id);
    subscribeToUser(tgID);
    await sleep(220);

    const response = await fetch(`${back}/burkozel/room/${room_id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      const roomJson = await response.json();
      setRoomState(roomJson);
      if (roomJson.players && Object.keys(roomJson.players).length >= 2) {
        startGame(roomJson);
      }
    } else {
      console.warn("Failed to fetch room state after join, status:", response.status);
    }

  } catch (err) {
    console.error(err);
    alert("Ошибка при присоединении к комнате: " + (err.message || err));
    setIsWaiting(false);
    unsubscribeAll();
  }
};


  const sendReady = async (roomId) => {
    if (!roomId) {
      console.warn("sendReady: no roomId");
      return false;
    }
    try {
      const resp = await fetch(`${back}/burkozel/ready`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_id: roomId, tg_id: tgID }),
      });
      if (resp.ok) {
        return true;
      } else {
        console.warn("ready error", resp.status);
        return false;
      }
    } catch (e) {
      console.error("sendReady error", e);
      return false;
    }
  };

  if (gameVisible) {

    return (
      <GameScreen
  ref={gameScreenRef}
  playerHand={playerHand}
  setPlayerHand={setPlayerHand}
  gameData={{
    room_id: roomState?.room_id,
    tg_id: tgID
  }}
  roomState={roomState}
  centrifugoClient={centrifugeRef.current}
  dealingCards={dealingCards}
  tableRef={tableRef}
  setGameVisible={setGameVisible}
  setRoomState={setRoomState}
  opponentHandCount={opponentHandCount}
  gameOver={gameOver}
  winner={winner}
  setGameOver={setGameOver}
  trump={trump}
  tableCards={tableCards}
  attackerId={attackerId}
  defenderId={defenderId}
  onRoundEnd={handleRoundEnd}
  isReshuffling={isReshuffling}
  isGameStarting={isGameStarting}
  onDrawCompleted={(newCards) => {
    if (Array.isArray(newCards)) {
      setPlayerHand(prev => [...prev, ...newCards]);
    }
  }}

  onSendReady={sendReady}
  waitingRoomId={waitingRoomId}
/>

    );
  }

  return (
    <div className="flex flex-col">
      <main className="flex-1 container mx-auto p-4">
        <h1 className="page-title">{t("games")}</h1>
        <div className="grid grid-cols-2 gap-4">
          <div
            className="rounded-2xl p-6 shadow-md text-white"
            style={{
              backgroundImage: "url(../frontend/images/burk.png)",
              minHeight: "200px",
              borderRadius: "30px",
              backgroundSize: "cover",
            }}
            onClick={() => setIsModalOpen(true)}
          >
            <h2 className="text-lg font-semibold">Буркозел</h2>
          </div>
        </div>
      </main>

      <FlyingCards cards={flyingCards} />

      {/* Модалка со списком комнат */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="modal-back" onClick={() => setIsModalOpen(false)}>
              <img src="../frontend/images/frameback.png" alt="Назад" />
            </button>

            <h2 className="modal-title">Буркозел</h2>

            <div className="modal-body">
              {loading ? (
                <p>Загрузка...</p>
              ) : rooms.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", minHeight: "200px", textAlign: "center", fontSize: 17, fontWeight: 100, color:"#fff", fontFamily:"Benzin-Medium", marginTop:"80px" }}>
                  Нет столов
                </div>
              ) : (
                <ul style={{ listStyle: "none", padding: 0 }}>
                  {rooms.map((room, index) => (
                    <li key={room.room_id}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", cursor: "pointer" }} onClick={() => handleJoinRoom(room.room_id)}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: "64px" }}>
                          <img src="/frontend/images/crystal2.png" alt="Crystal" style={{ width: 20, height: 24 }} />
                          <span style={{ fontWeight: 600 }}>{room.stake}</span>
                        </div>

                        <div style={{ flex: 1, marginLeft: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <img src="/frontend/icons/friends.svg" alt="Players" style={{ width: 18, height: 18 }} />
                            <span>{Object.keys(room.players || {}).length}</span>
                          </div>

                          <img src="/frontend/icons/strelka.png" alt="Далее" style={{ width: 12, height: 12 }} />
                        </div>
                      </div>

                      {index < rooms.length - 1 && <hr style={{ border: 0, borderTop: "1px solid #ddd" }} />}
                    </li>
                  ))}
                </ul>
              )}

              <button style={{ position: "fixed", bottom: 16, left: 16, right: 16, padding: "8px 16px", background: "linear-gradient(to bottom, rgba(2, 143, 213, 1), rgba(1, 54, 105, 1))", color: "#fff", border: "none", borderRadius: 25, cursor: "pointer", fontFamily: "Benzin-Semibold", fontSize: 17, fontWeight: 300, minHeight: 56, zIndex: 9999 }} onClick={() => setIsStakeModal(true)}>
                Новый стол
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Ставки / остальное — ваш код  */}
      {isStakeModal && (
        <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, display: "flex", justifyContent: "center", alignItems: "flex-end", zIndex: 1000 }} onClick={() => setIsStakeModal(false)}>
          <div className="modal-content" style={{ borderRadius: "20px 20px 0 0", width: "100%", padding: 16, boxSizing: "border-box", maxHeight: 320 }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setIsStakeModal(false)} style={{ background: "none", border: "none", marginBottom: 12 }}>
              <img src="../frontend/images/frameback.png" alt="Назад" />
            </button>

            <h3 style={{ color: "#f7f5f5ff", marginBottom: 8, fontFamily:"Benzin-Medium" }}>Укажите ставку</h3>
            <p style={{ color: "#cfcaca", marginBottom: 12 }}>
              {stake} <img src="/frontend/images/crystal2.png" alt="Crystal" style={{ width: 18, height: 22, marginLeft: 8 }} />
            </p>

            <input type="range" min="0" max="1000" value={stake} onChange={(e) => setStake(Number(e.target.value))} style={{ width: "100%" }} />

            <button style={{ marginTop: 16, padding: "8px 16px", background: "linear-gradient(to bottom, rgba(2, 143, 213, 1), rgba(1, 54, 105, 1))", color: "#fff", border: "none", borderRadius: 25, cursor: "pointer", width: "100%", fontFamily: "Benzin-Semibold", fontSize: 17, fontWeight: 300, minHeight: 56 }} onClick={handleFindPlayer}>
              Найти игроков
            </button>
          </div>
        </div>
      )}


<Toast 
  message={toastMessage} 
  onClose={() => setToastMessage('')} 
/>
    </div>
  );
}
