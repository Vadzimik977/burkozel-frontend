import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import './Gamescreen.css';
import Toast from "../pages/Toast";
import PlayerLabel from "../pages/Playerlabel";

const Gamescreen = forwardRef(({ 
  playerHand, 
  setPlayerHand,
  gameData, 
  roomState, 
  centrifugoClient, 
  setGameVisible, 
  setRoomState, 
  opponentHandCount, 
  dealingCards, 
  tableRef,
  gameOver,
  winner,
  setGameOver,
  trump,
  tableCards,
  attackerId,
  defenderId,
  onRoundEnd,
  isReshuffling,
  isGameStarting,
  onDrawCompleted
}, ref) => {




  const animLockRef = useRef({ draw: false, defense: false });
  const timeoutsRef = useRef(new Set());
const [turnOwnerId, setTurnOwnerId] = useState(null);

  const back = import.meta.env.VITE_BACKEND_URL || "https://grantexpert.pro/backend";

  const [toastMessage, setToastMessage] = useState('');
const defendCleanupFlagRef = useRef(false);  
const defendEndTimeoutRef = useRef(null);     


  const lastAnimationKeyRef = useRef(null);
const [playerReady, setPlayerReady] = useState(false);
const [opponentReady, setOpponentReady] = useState(false);

  const [selectedCards, setSelectedCards] = useState([]);
  const [gameField, setGameField] = useState([]);
  const [gamePhase, setGamePhase] = useState('waiting');
  const [canPlayerPlay, setCanPlayerPlay] = useState(false);
  const [isAttackerTurn, setIsAttackerTurn] = useState(false);
  const [playerRole, setPlayerRole] = useState('unknown');
  const [scores, setScores] = useState({ player: 0, opponent: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [opponentNickname, setOpponentNickname] = useState('Противник');
  const [roundWinner, setRoundWinner] = useState(null);
  const [showRoundResult, setShowRoundResult] = useState(false);
const defendEndScheduledRef = useRef(null);
const slotHandledRef = useRef(new Set());


const [playerShiftMap, setPlayerShiftMap] = useState({}); 
const playerCardsRef = useRef(null); 

const lastDrawKeyRef = useRef(null);

const ignoreNextPropDrawRef = useRef(false);




const turnTimerRef = useRef(null);     
const turnIntervalRef = useRef(null);  
const [turnTimeLeft, setTurnTimeLeft] = useState(60); 

  const [balance, setBalance] = useState(0);

  const telegram = window?.Telegram?.WebApp;
  const tgID = telegram?.initDataUnsafe?.user?.id || 0;

const [landedSlots, setLandedSlots] = useState(new Set());
const landingTimersRef = useRef(new Map());


useEffect(() => {
  if (toastMessage) {
    const timer = setTimeout(() => {
      setToastMessage("");
    }, 3000);
    return () => clearTimeout(timer); 
  }
}, [toastMessage]);
useEffect(() => {
  return () => {
    for (const t of landingTimersRef.current.values()) clearTimeout(t);
    landingTimersRef.current.clear();
  };
}, []);


const turnTimeoutRef = useRef(null);


  
  const clearTurnTimer = () => {
  try {
    if (turnIntervalRef.current) {
      clearInterval(turnIntervalRef.current);
      turnIntervalRef.current = null;
    }
    if (turnTimeoutRef.current) {
      clearTimeout(turnTimeoutRef.current);
      turnTimeoutRef.current = null;
    }
  } catch (e) {
    console.warn('clearTurnTimer error', e);
  }
  setTurnTimeLeft(60);
  setTurnOwnerId(null); 
};


const startTurnTimerFor = (ownerId, seconds = 60) => {
  clearTurnTimer();
  setTurnOwnerId(String(ownerId)); 
  setTurnTimeLeft(seconds);

  turnIntervalRef.current = setInterval(() => {
    setTurnTimeLeft(prev => {
      if (prev <= 1) {
        clearTurnTimer();
        setTimeout(() => handleTurnExpired(ownerId), 0);
        return 0;
      }
      return prev - 1;
    });
  }, 1000);

  turnTimeoutRef.current = setTimeout(() => {
    clearTurnTimer();
    setTimeout(() => handleTurnExpired(ownerId), 0);
  }, seconds * 1000 + 200);
};
const defendEndTimersRef = useRef(new Set());
useEffect(() => {
  return () => {
    if (defendEndTimeoutRef.current) {
      clearTimeout(defendEndTimeoutRef.current);
      defendEndTimeoutRef.current = null;
    }
  };
}, []);

const handleSlotDefendEnd = (e, slotIndex) => {
  if (e.type !== 'transitionend') return;
  if (e.target !== e.currentTarget) return;

  const propName = (e.nativeEvent?.propertyName || e.propertyName);
  if (propName && !String(propName).includes('transform')) return;

  const target = e.currentTarget;
  if (!target?.classList.contains('landed')) return;

  if (slotHandledRef.current.has(slotIndex)) return;
  slotHandledRef.current.add(slotIndex);

  if (!slots || !slots.length) return;

  const allDefended = slots.every(s => !!s.defend);
  if (!allDefended) return;

  const allSlotsHandled = slots.every(s => 
    !s.defend || slotHandledRef.current.has(s.slotIndex)
  );
  if (!allSlotsHandled) return;

  if (defendCleanupFlagRef.current) return;
  defendCleanupFlagRef.current = true;

  defendEndTimeoutRef.current = setTimeout(() => {
    try {
      setGameField([]);
      setLandedSlots(new Set());

      if (!animLockRef.current.draw) setDrawingCards([]);

      setAnimatingDraw(false);
      setNewlyDrawnCards([]);
      lastAnimationKeyRef.current = null;
    } catch (err) {
      console.warn('clear field after defend error', err);
    } finally {
      defendCleanupFlagRef.current = false;
      slotHandledRef.current.clear();
      if (defendEndTimeoutRef.current) {
        clearTimeout(defendEndTimeoutRef.current);
        defendEndTimeoutRef.current = null;
      }
    }
  }, 900);
};


const handleTurnExpired = async (ownerId) => {

  const ownerStr = String(ownerId);
  const myIdStr = String(playerId);

  try {
    if (ownerStr === myIdStr) {
      console.log('Player timer expired — leaving room');
      await fetch(`${back}/burkozel/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_id: roomId, tg_id: parseInt(playerId) }),
      });
    } else {
      console.log('Opponent timer expired — requesting opponent leave');
      const oppId = roomState && roomState.players ? Object.keys(roomState.players).find(id => id !== myIdStr) : null;
      const target = oppId || ownerId || playerId;
      await fetch(`${back}/burkozel/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_id: roomId, tg_id: parseInt(target) }),
      });
    }
  } catch (err) {
    console.error('handleTurnExpired error', err);
  } finally {
    clearTurnTimer();

    setGameOver(true);
  }
};

useEffect(() => {
  return () => {
    clearTurnTimer();
  };
}, []);

useEffect(() => {
  if (!roomState || !roomState.players) {
    clearTurnTimer();
    return;
  }

  const lastTurn = roomState.last_turn || {};
  const needDefend = !!lastTurn.attack && !lastTurn.defend;

  let computedOwner = null;
  if (needDefend) {
    computedOwner = (lastTurn.defend && lastTurn.defend.player) ? String(lastTurn.defend.player) :
                    (lastTurn.attack && lastTurn.attack.player) ? Object.keys(roomState.players).find(id => id !== String(lastTurn.attack.player)) :
                    null;
  } else {
    computedOwner = roomState.attacker ? String(roomState.attacker) : null;
  }

  if (computedOwner) {

    startTurnTimerFor(computedOwner, 60);
  } else {
    clearTurnTimer();
  }

}, [roomState?.attacker, JSON.stringify(roomState?.last_turn)]);




  useEffect(() => {
    if (!tgID) return;

    const fetchBalance = async () => {
      try {
        const res = await fetch(`/backend/users/get_current_user?tg_id=${tgID}`);
        if (!res.ok) throw new Error("Failed to fetch user");
        const data = await res.json();
        setBalance(data.balance || 0);
      } catch (err) {
        // console.error("Error fetching balance:", err);
        setBalance(0);
      }
    };

    fetchBalance();
  }, [tgID]);

const lastKnownHandRef = useRef([]); 
const [visibleHand, setVisibleHand] = useState(playerHand || []); 


  const [defendingCards, setDefendingCards] = useState([]);
  const [animatingDefense, setAnimatingDefense] = useState(false);
  const [lastDefendCardsCount, setLastDefendCardsCount] = useState(0);
  const lastTurnRef = useRef(null);
  const lastDefendCountRef = useRef(0);
  const prevAttackerRef = useRef(null);
  const suspendFieldUpdatesRef = useRef(false);
  const [defenseResultSummary, setDefenseResultSummary] = useState(null);
  const [showDefenseResult, setShowDefenseResult] = useState(false);
  const [drawingCards, setDrawingCards] = useState([]);
  const [animatingDraw, setAnimatingDraw] = useState(false);
  const [newlyDrawnCards, setNewlyDrawnCards] = useState([]);
  const [shuffleAnimationPhase, setShuffleAnimationPhase] = useState('shuffling');
  const [shuffleCards, setShuffleCards] = useState([]);

useEffect(() => {
  return () => {
    if (defendEndTimeoutRef.current) {
      clearTimeout(defendEndTimeoutRef.current);
      defendEndTimeoutRef.current = null;
    }
    slotHandledRef.current.clear();
  };
}, []);


  const fetchRoomData = async () => {
    const roomId = roomState.room_id;
  try {
    const response = await fetch(`${back}/burkozel/room/${roomId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Ошибка сервера: ${errText}`);
    }

    const room = await response.json();
    if (!room || !room.players) return;

    const playerData = room.players[String(playerId)];
    const opponentId = Object.keys(room.players).find(id => id !== String(playerId));
    const opponentData = room.players[opponentId];

  
    updateGameState(room);

  } catch (err) {

  }
};
useEffect(() => {
  if (roomState?.room_id) {
    fetchRoomData();
  }
}, [roomState]);




const fetchRoomStatus = async () => {
  if (!roomState?.room_id) return;

  try {
    const res = await fetch(`${back}/burkozel/room/${roomState.room_id}`);
    if (!res.ok) throw new Error('Ошибка запроса комнаты');
    const data = await res.json();

    const oppId = Object.keys(data.players || {}).find(id => id !== String(playerId));
    setOpponentReady(!!data.players?.[oppId]?.is_ready);

  } catch (err) {
    // console.error('Ошибка получения статуса комнаты:', err);
  }
};

useEffect(() => {
  fetchRoomStatus();

  const interval = setInterval(fetchRoomStatus, 5000);
  return () => clearInterval(interval);
}, [roomState?.room_id]);



useEffect(() => {
  if (!Array.isArray(playerHand)) return;

  const prev = lastKnownHandRef.current || [];
  const next = playerHand || [];

  if (next.length <= prev.length) {
    lastKnownHandRef.current = next;
    setVisibleHand(next);
    return;
  }

  if (ignoreNextPropDrawRef.current) {
    lastKnownHandRef.current = next.slice();
    setVisibleHand(next.slice());
    ignoreNextPropDrawRef.current = false;
    return;
  }

  const drawnCards = next.slice(prev.length);
  if (drawnCards.length > 0) {
    (async () => {
      try {
        await handleDrawCards(drawnCards, true, null, prev.length);
      } catch (e) {
        console.warn('draw animation failed, falling back to immediate setVisibleHand', e);
        lastKnownHandRef.current = next;
        setVisibleHand(next);
      }
    })();
  } else {
    lastKnownHandRef.current = next;
    setVisibleHand(next);
  }
}, [playerHand]);



function getCardId(card) {
  if (!card) return '';
  if (Array.isArray(card) && card.length >= 2) return `${card[0]}|${card[1]}`;
  if (typeof card === 'object') return card.id ?? JSON.stringify(card);
  return String(card);
}

function arraysEqual(a, b) {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

const uniquePlayerHand = React.useMemo(() => {
  const vh = Array.isArray(visibleHand) ? visibleHand : [];
  return vh.filter((card, index, self) =>
    index === self.findIndex(c => c && card && c[0] === card[0] && c[1] === card[1])
  );
}, [visibleHand]);

const uniqueIdsKey = React.useMemo(() => {
  return uniquePlayerHand.map(getCardId).join('|'); 
}, [uniquePlayerHand]);


useEffect(() => {
  const idsInHand = new Set(uniquePlayerHand.map(getCardId));
  setSelectedCards(prev => {
    const next = prev.filter(id => idsInHand.has(id));
    if (arraysEqual(prev, next)) return prev;
    return next;
  });
}, [uniqueIdsKey]); 

useEffect(() => {
  const container = playerCardsRef.current;
  if (!container) return;

  const CARD_W = 60, GAP = 15;
  const els = Array.from(container.querySelectorAll('.player-card'));
  const total = uniquePlayerHand.length;
  const containerWidth = container.offsetWidth || 0;
  const totalWidth = total * CARD_W + Math.max(0, total - 1) * GAP;
  const startX = (containerWidth - totalWidth) / 2 || 0;

  els.forEach((el, idx) => {
    const card = uniquePlayerHand[idx];
    if (!card) return;

    const id = getCardId(card);
    const isSelectedLocal = selectedCards.includes(id);
    const cardLeft = startX + idx * (CARD_W + GAP);
    const offsetFromCenter = Math.round(cardLeft - (containerWidth / 2));
    const lift = isSelectedLocal ? -12 : 0;
    const scale = isSelectedLocal ? 1.04 : 1;
    el.style.transition = 'transform 0.36s cubic-bezier(.22,.9,.28,1)';
    el.style.transform = `translateX(${offsetFromCenter}px) translateY(${lift}px) scale(${scale})`;
    if (isSelectedLocal) el.style.zIndex = 200;
    else el.style.zIndex = '';
  });
}, [selectedCards, uniquePlayerHand]);




  const setSavedTimeout = (fn, ms) => {
    const id = setTimeout(() => {
      timeoutsRef.current.delete(id);
      fn();
    }, ms);
    timeoutsRef.current.add(id);
    return id;
  };

  useEffect(() => {
    return () => {
      for (const id of timeoutsRef.current) clearTimeout(id);
      timeoutsRef.current.clear();
    };
  }, []);

  const handleRoundEnd = (roundWinner) => {
    console.log('🏆 Round ended, winner:', roundWinner);
    setRoundWinner(roundWinner);
    setGameOver(true);
    setShowRoundResult(true);
    
    setTimeout(() => {
      setShowRoundResult(false);
      setRoundWinner(null);
    }, 5000);
  };
const inFlightDrawsRef = useRef(new Set());
const handleDrawCards = async (drawnCards, isMyDraw = true, onCardLanded = null, oldVisibleCount = null) => {
  if (!drawnCards || !drawnCards.length) return;

  const key = `${isMyDraw ? 'me' : 'op'}::${drawnCards.map(c => (Array.isArray(c) ? c.join('') : String(c))).join('|')}::${(playerHand?.length || 0)}`;
  if (lastDrawKeyRef.current === key) {
    console.log('handleDrawCards: duplicate draw ignored', key);
    return;
  }
  lastDrawKeyRef.current = key;

  if (animLockRef.current.draw) {
    console.log('handleDrawCards: animation in progress, ignoring');
    return;
  }
  animLockRef.current.draw = true;
  setAnimatingDraw(true);

  const container = tableRef?.current;
  const playerContainer = playerCardsRef.current;

  if (!container || !playerContainer) {
    console.warn('handleDrawCards: missing refs, applying immediate update');
    if (typeof onCardLanded === 'function') {
      setVisibleHand(prev => {
        const base = Array.isArray(prev) ? prev : [];
        const newHand = [...base];
        const cardsToAdd = [];
        drawnCards.forEach(dc => {
          const exists = newHand.some(c => c && dc && c[0]===dc[0] && c[1]===dc[1]);
          if (!exists) {
            newHand.push(dc);
            cardsToAdd.push(dc);
          }
        });
        lastKnownHandRef.current = newHand;
        try { onCardLanded(cardsToAdd); } catch(e){console.warn(e);}
        return newHand;
      });
    }
    animLockRef.current.draw = false;
    setAnimatingDraw(false);
    lastDrawKeyRef.current = null;
    return;
  }

  const oldCount = (typeof oldVisibleCount === 'number') ? oldVisibleCount : (visibleHand?.length || 0);
  const addCount = drawnCards.length;

  const CARD_W = 60;
  const ABSOLUTE_POSITIONS = [40, 120, 200, 280]; 

  const oldCardsEls = playerContainer.querySelectorAll(".player-card");
oldCardsEls.forEach((el, idx) => {
  if (idx < oldCount && idx < ABSOLUTE_POSITIONS.length) {
    const targetLeft = ABSOLUTE_POSITIONS[idx]; 
    const containerWidth = playerContainer.getBoundingClientRect().width;
    const offsetFromCenter = Math.round(targetLeft - containerWidth / 2);
    el.style.transition = "transform 0.4s ease";

    el.style.transform = `translateX(${offsetFromCenter}px) translateY(0px) scale(1)`;
  }
});


  await new Promise(res => setTimeout(res, 300));

  const containerRect = container.getBoundingClientRect();
  const playerRect = playerContainer.getBoundingClientRect();



  const ABSOLUTE_POSITIONS_sec = [70, 150, 230, 310];
  const newCardsStartIndex = Math.max(0, 4 - addCount);
  
  const animCards = drawnCards.map((card, idx) => {
    const targetLeft = ABSOLUTE_POSITIONS_sec[newCardsStartIndex + idx] ?? (60 + (newCardsStartIndex + idx) * (CARD_W + 20));

    const deckEl = document.querySelector('.deck-count');
    const deckRect = deckEl?.getBoundingClientRect() || {
      left: containerRect.right - 80,
      top: containerRect.top + containerRect.height * 0.61 - 42,
      width: CARD_W,
      height: 84,
    };

    const deckCenterX = deckRect.left + deckRect.width / 2;
    const deckCenterY = deckRect.top + deckRect.height - 90;

    return {
      id: `draw-${Date.now()}-${idx}`,
      card,
      startX: deckCenterX - containerRect.left - CARD_W / 2,
      startY: deckCenterY,
      targetX: targetLeft,
      targetY: Math.round(playerRect.top),
      delay: idx * 140,
      targetIndex: oldCount + idx,
      isAnimating: false,
      hasLanded: false,
      zIndex: 2000 + idx
    };
  });

  setDrawingCards(animCards);
  await new Promise(res => requestAnimationFrame(() => setTimeout(res, 0)));

  await Promise.all(animCards.map(anim =>
    new Promise(resolve => {
      const start = () => {
        setDrawingCards(prev => prev.map(p => p.id === anim.id ? { ...p, isAnimating: true } : p));
        setSavedTimeout(() => {
          setDrawingCards(prev => prev.map(p => p.id === anim.id ? { ...p, isAnimating: false, hasLanded: true } : p));
          setSavedTimeout(resolve, 80);
        }, 600);
      };
      setSavedTimeout(start, anim.delay);
    })
  ));

  setVisibleHand(prev => {
    const base = Array.isArray(prev) ? prev : [];
    const newHand = [...base];
    drawnCards.forEach(dc => {
      const exists = newHand.some(c => c && dc && c[0] === dc[0] && c[1] === dc[1]);
      if (!exists) newHand.push(dc);
    });
    return newHand;
  });

  if (typeof onCardLanded === 'function') {
    ignoreNextPropDrawRef.current = true;
    lastKnownHandRef.current = visibleHand.slice();
  } else {
    setPlayerHand(prev => {
      const base = Array.isArray(prev) ? prev : [];
      const newHand = [...base];
      drawnCards.forEach(dc => {
        const exists = newHand.some(c => c[0] === dc[0] && c[1] === dc[1]);
        if (!exists) newHand.push(dc);
      });
      lastKnownHandRef.current = newHand;
      return newHand;
    });

    if (typeof onCardLanded === 'function') {
      try { onCardLanded(drawnCards); } catch (e) { console.warn('onCardLanded callback error:', e); }
    }
  }

  const newIndices = Array.from({ length: addCount }, (_, i) => oldCount + i);
  setNewlyDrawnCards(newIndices);

  setSavedTimeout(() => {
    setDrawingCards(prev => {
      const allLanded = prev.every(c => c.hasLanded);
      if (allLanded) {
        console.log('All cards landed, cleaning up animation');
        return [];
      }
      return prev;
    });
    setNewlyDrawnCards([]);
    setAnimatingDraw(false);
    animLockRef.current.draw = false;
    lastDrawKeyRef.current = null;
  }, 1000);
};
  useImperativeHandle(ref, () => ({
    handleRoundEnd,
    handleDrawCards,
    startDealingAnimation: () => {},
    startAttackerDefenseAnimation: (...args) => {
      // console.warn('startAttackerDefenseAnimation called from parent — prefer trigger via roomState');
      const [attackCardsArr, defendCardsArr] = args;
      const animKey = JSON.stringify({ a: attackCardsArr, d: defendCardsArr });
      if (lastAnimationKeyRef.current !== animKey) {
        lastAnimationKeyRef.current = animKey;
        startDefenseAnimation(attackCardsArr, defendCardsArr, 'attacker');
      } else {
        // console.log('Skipping parent-triggered duplicate animation');
      }
    }
  }));

  const roomId = gameData?.room_id || 'Not Set';
  const playerId = gameData?.tg_id || 'Not Set';

  useEffect(() => {

    if (roomState) {
      updateGameState(roomState);
    }
  }, [roomState]);

  const slots = React.useMemo(() => {
  const attacks = gameField.filter(c => c.type === 'attack');
  const maxSlots = attacks.length;
  return Array.from({ length: maxSlots }, (_, i) => {
    const attack = attacks[i] || null;
    const defend = gameField.find(c => c.type === 'defend' && c.attackSlotIndex === i) || null;
    return { attack, defend, slotIndex: i };
  });
}, [gameField]);

const firstSlotRenderRef = React.useRef(true);

useEffect(() => {
  slots.forEach(slot => {
    const idx = slot.slotIndex;
    const hasDefend = !!slot.defend;

    if (hasDefend && !landedSlots.has(idx) && !slotHandledRef.current.has(idx)) {
      if (!landingTimersRef.current.has(idx)) {
        const t = setTimeout(() => {
          setLandedSlots(prev => {
            const next = new Set(prev);
            next.add(idx);
            return next;
          });
          landingTimersRef.current.delete(idx);

          setTimeout(() => {
            setLandedSlots(prev => {
              const next = new Set(prev);
              next.delete(idx);
              return next;
            });
          }, 1500);

        }, 120);
        landingTimersRef.current.set(idx, t);
      }
    }
  });
}, [slots]);




  const updateGameState = (room) => {

    const stateKey = JSON.stringify({
    lastTurn: room.last_turn,
    attacker: room.attacker,
    status: room.status
  });
  
  if (updateGameState.lastStateKey === stateKey) {
    return; 
  }
  updateGameState.lastStateKey = stateKey;
  if (!room) return;

  const currentAttacker = room.attacker;
  const myRole = String(currentAttacker) === String(playerId) ? 'attacker' : 'defender';
  const isMyAttackTurn = String(currentAttacker) === String(playerId);

  setPlayerRole(myRole);
  setIsAttackerTurn(isMyAttackTurn);

  if (room.players) {
    const playerData = room.players[String(playerId)];
    const opponentId = Object.keys(room.players).find(id => id !== String(playerId));
    const opponentData = opponentId ? room.players[opponentId] : null;

    if (playerData && opponentData) {
      setScores({ player: playerData.round_score || 0, opponent: opponentData.round_score || 0 });
      if (opponentData.nickname) setOpponentNickname(opponentData.nickname);
    }
  }

  const lastTurn = room.last_turn;

  if (!lastTurn) {
    if (!suspendFieldUpdatesRef.current) {
      setGameField([]);
    }
    lastDefendCountRef.current = 0;
    setLastDefendCardsCount(0);
  } else {
    const attackCardsArr = lastTurn.attack?.cards || [];
    const defendCardsArr = lastTurn.defend?.cards || [];

    const fieldCards = attackCardsArr.map((card, attackIndex) => ({
      type: 'attack',
      card,
      player: lastTurn.attack?.player,
      attackSlotIndex: attackIndex
    }));

    defendCardsArr.forEach((card, i) => {
      fieldCards.push({
        type: 'defend',
        card,
        player: lastTurn.defend?.player,
        attackSlotIndex: i
      });
    });

    try {
      const players = room.players || {};
      const allHands = Object.values(players)
        .map(p => Array.isArray(p.hand) ? p.hand : [])
        .flat();


      const handSet = new Set(allHands.map(c => Array.isArray(c) ? String(c[0]) + String(c[1]) : String(c)));

      const allFieldCardsInHands = fieldCards.every(fc => {
        const c = fc.card;
        if (!Array.isArray(c) || c.length < 2) return false;
        const key = String(c[0]) + String(c[1]);
        return handSet.has(key);
      });



          if (allFieldCardsInHands) {
      if (!suspendFieldUpdatesRef.current) {
        setGameField([]);
      }
    } else {
      if (!suspendFieldUpdatesRef.current) {
        setGameField(fieldCards);
      }
    }

    } catch (err) {
      if (!suspendFieldUpdatesRef.current) {
        setGameField(fieldCards);
      }
      console.warn('updateGameState: error while reconciling field vs hands', err);
    }

    lastDefendCountRef.current = defendCardsArr.length;
    setLastDefendCardsCount(defendCardsArr.length);
    lastTurnRef.current = lastTurn;
  }

  if (room.status === 'waiting') setGamePhase('waiting');
  else if (lastTurn?.attack && !lastTurn?.defend) setGamePhase('defending');
  else if (lastTurn?.attack && lastTurn?.defend) setGamePhase('resolving');
  else setGamePhase('attacking');

  const needDefend = !!lastTurn?.attack && !lastTurn?.defend;
  const canPlay = myRole === 'attacker'
    ? isMyAttackTurn
    : needDefend && (!lastTurn.defend?.player || String(lastTurn.defend?.player) === String(playerId));

  setCanPlayerPlay(canPlay);
};




const startDefenseAnimation = async (attackCards, defendCards, viewerRole, animKey = null) => {

  const key = JSON.stringify({ a: attackCards, d: defendCards });
  if (lastAnimationKeyRef.current === key) {
    animLockRef.current.defense = false;
    return;
  }
  lastAnimationKeyRef.current = key;

  try {
  } finally {
    setSavedTimeout(() => {
      animLockRef.current.defense = false;
      lastAnimationKeyRef.current = null; 
    }, 100);
  }
};

const [deckCount, setDeckCount] = useState(() => Math.max(0, Number(roomState?.deck?.length) || 0));
function getCardId(card) {
  if (!card) return '';
  if (Array.isArray(card) && card.length >= 2) return `${card[0]}|${card[1]}`;
  if (typeof card === 'object') return card.id ?? JSON.stringify(card);
  return String(card);
}

const makeMove = async (selectedCardsArg) => {
  if (!Array.isArray(selectedCardsArg) || selectedCardsArg.length === 0 || isLoading) return;

  setIsLoading(true);

  try {
    // 1) Собираем cardsToSend — поддерживаем два формата selectedCards:
    //    - массив индексов (числа)
    //    - массив id-карт (строки, например "K|♠")
    let cardsToSend = [];

    if (typeof selectedCardsArg[0] === 'string') {
      const idsSet = new Set(selectedCardsArg);
      cardsToSend = (playerHand || []).filter(c => idsSet.has(getCardId(c)));
    } else {
      cardsToSend = selectedCardsArg
        .map(idx => (typeof idx === 'number' ? playerHand[idx] : null))
        .filter(Boolean);
    }

    if (cardsToSend.length === 0) {
      setToastMessage('Нечего отправлять');
      return;
    }

    console.log('🎯 Sending cards to server:', cardsToSend);

    const response = await fetch(`${back}/burkozel/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_id: roomId,
        tg_id: parseInt(playerId, 10),
        cards: cardsToSend
      }),
    });

    if (!response.ok) {
      let errorMessage = `Ошибка сервера ${response.status}`;
      const ct = response.headers.get('content-type') || '';
      try {
        if (ct.includes('application/json')) {
          const errJson = await response.json();
          errorMessage = errJson?.detail || errJson?.error || JSON.stringify(errJson);
        } else {
          const txt = await response.text();
          if (txt) errorMessage = txt;
        }
      } catch (parseErr) {
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('🎯 Move result:', result);

    if (result?.room) {
      const playedSet = new Set(cardsToSend.map(c => getCardId(c)));

      setPlayerHand(prev => {
        const next = (prev || []).filter(c => !playedSet.has(getCardId(c)));
        lastKnownHandRef.current = next.slice();
        return next;
      });


      ignoreNextPropDrawRef.current = true;


      updateGameState(result.room);


      const nextAttackerId = result.room.attacker;
      const lastTurn = result.room.last_turn || {};
      const needDefend = !!lastTurn.attack && !lastTurn.defend;

      const nextTurnOwner = needDefend
        ? String(lastTurn.defend?.player || nextAttackerId)
        : String(nextAttackerId);

      setTurnOwnerId(nextTurnOwner);
      startTurnTimerFor(nextTurnOwner, 60);
    } else {
      setToastMessage('Сервер вернул неожидаемый ответ');
    }

  } catch (error) {
    console.error('Error making move:', error);
    setToastMessage(String(error?.message || error));
  } finally {
    setIsLoading(false);
    setSelectedCards([]);
  }
};

const handleCardClick = (cardId) => {
  if (!canPlayerPlay || isLoading) return;

  setSelectedCards(prev => {

    const s = new Set(prev);
    if (s.has(cardId)) s.delete(cardId);
    else s.add(cardId);
    return Array.from(s);
  });
};



  const handlePlayCards = () => {
    if (!canPlayerPlay || isLoading || selectedCards.length === 0) {
      console.log('🚫 Cannot play cards');
      return;
    }
    
    console.log('🎯 Playing selected cards:', selectedCards);
    makeMove(selectedCards);
  };



  const renderCard = (card, isSmall = false, onClick = null) => {
    if (!card || !Array.isArray(card) || card.length < 2) {
      return (
        <div className={`card ${isSmall ? 'card-small' : ''}`} onClick={onClick}>
          <div className="card-content">
            <div>?</div>
            <div>?</div>
          </div>
        </div>
      );
    }

    const [rank, suit] = card;
    const isRed = suit === '♥' || suit === '♦';

    return (
      <div 
        className={`card ${isSmall ? 'card-small' : ''} ${isRed ? 'red' : 'black'}`} 
        onClick={onClick}
      >
        <div className="card-content">
          <div className="rank">{rank}</div>
          <div className="suit">{suit}</div>
        </div>
      </div>
    );
  };



useEffect(() => {
  console.log("roomState deck", roomState?.deck);
  const len = Math.max(0, Number(roomState?.deck?.length) || 0);

  if (len === 0) {
    const timeoutId = setTimeout(() => {
      setDeckCount(len);
    }, 1000);


    return () => clearTimeout(timeoutId);
  } else {
    setDeckCount(len);
  }
}, [roomState]);





  const renderTrumpCard = (trumpSuit, isSmall = false) => {
    if (!trumpSuit || 
        trumpSuit === 'Not Set' || 
        trumpSuit === '' || 
        trumpSuit === null || 
        trumpSuit === undefined) {
      return (
        <div className={`card ${isSmall ? 'card-small' : ''}`}>
          <div className="card-content">
            <div>?</div>
            <div>?</div>
          </div>
        </div>
      );
    }

    const isRed = trumpSuit === '♥' || trumpSuit === '♦';

    return (
      <div className={`card ${isSmall ? 'card-small' : ''} ${isRed ? 'red' : 'black'}`}>
        <div className="card-content">
          <div className="suit">{trumpSuit}</div>
        </div>
      </div>
    );
  };

if (gameOver) {
  console.log("game over resievd")
  return (
    <div className="game-container">
      <div className="game-over">
        {/* Кнопка закрытия */}
        <button 
          className="game-over-close"
          onClick={async () => {
            try {
              await fetch(`${back}/burkozel/clear_room/${roomState?.room_id}`, {
                method: "POST", 
              });
            } catch (err) {
              console.error("Ошибка очистки комнаты:", err);
            }

            setGameOver(false);
            setGameVisible(false);
          }}
        >
          ✕
        </button>

        {/* Блок с картинкой и оверлеем */}
        <div className="game-over-hero">
          <img src="../frontend/images/win.png" alt="Результат" />
          <div className="game-over-overlay">
            <p className="round-winner">
              {winner === "player" ? "Вы победили" : "Вы проиграли"}
            </p>
            <button 
              className="reset-button"
              onClick={async () => {
                try {
                  await fetch(`${back}/burkozel/clear_room/${roomState?.room_id}`, {
                    method: "POST",
                  });
                } catch (err) {
                  console.error("Ошибка очистки комнаты:", err);
                }

                setGameOver(false);
                // setWinner(null);
                setGameVisible(false);
              }}
            >
              Продолжить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}



  if (showRoundResult) {
    return (
      <div className="game-container">
        <div className="round-result">
          <h2>Раунд завершен!</h2>
          <p className="round-winner">
            {roundWinner === 'player' ? 'Вы выиграли раунд!' : 'Соперник выиграл раунд!'}
          </p>
          <div className="round-loading">
            <div className="loading-spinner"></div>
            <p>Подготовка к следующему раунду...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    
    <div className="game-container">
      {/* Счетчики */}
      <div className="scores">
         <div className="opponent-score">
<small>
  {(() => {
    if (!roomState?.players) return 0;
    const oppId = Object.keys(roomState.players).find(id => id !== String(gameData?.tg_id));
    const pen = roomState.players[oppId]?.penalty || 0;
    return pen > 0 ? `+${pen}` : pen;
  })()}
</small>


    <div className="score-circle">
      {scores.opponent}
    </div>
  </div>

        <div className="player-score">
 <small>
  {(() => {
    const pen = roomState?.players?.[String(gameData?.tg_id)]?.penalty || 0;
    return pen > 0 ? `+${pen}` : pen;
  })()}
</small>

  <div className="score-circle">{scores.player}</div>
</div>

      </div>
  <header>
        <div className="balance flex items-center gap-1 p-2">
          <img src="/frontend/icons/crystal.png" alt="Crystal" className="w-5 h-5"/>
          <span>{balance}</span>
        </div>
      </header>

     <div className="opponent-area">
  <div className="opponent-label">Соперник</div>
  <div className="opponent-avatar"></div>
{opponentReady && ['waiting', 'matched'].includes(roomState?.status) && (
  <div
    className="opponent-ready"
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '4px 10px',
      borderRadius: '20px', 
      backgroundColor: '#fff',
      color: 'rgba(20, 170, 90, 0.87)',
      fontWeight: 'bold',
      fontSize: '14px',
      gap: '6px',
      width: 'fit-content',
      fontFamily:"SF-PRO"
    }}
  >
    <img
      src="/frontend/icons/player-icon.png"
      alt="Игрок"
      style={{
        width: '20px',
        height: '20px',
        borderRadius: '50%',
      }}
    />
    <span>Готов</span>
  </div>
)}




  {/* Новые кнопки справа от аватара */}
  <div className="opponent-buttons">
 <button
  className="opponent-btn"
  onClick={async () => {
    clearTurnTimer(); 

    try {
      await fetch(`${back}/burkozel/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_id: roomState?.room_id,
          tg_id: parseInt(gameData?.tg_id),
        }),
      });
    } catch (err) {
      console.error("Ошибка при выходе:", err);
    }

    if (!['waiting', 'matched'].includes(gamePhase)) {
      setGameOver(true);
    } else {
      setGameVisible(false);
    }
  }}
>
  <img src="../frontend/icons/Vector-12.png" alt="Exit" />
</button>


  <button
    className="opponent-btn"
    onClick={() => setToastMessage("Правила игры")}
  >
    <img src="../frontend/icons/vr.png" alt="Rules" />
  </button>
</div>


  <div className="opponent-cards">
   {Array.from({ length: Math.max(0, opponentHandCount || 0) }, (_, index) => {
  const totalCards = Math.max(1, opponentHandCount || 1); 
  const spread = -50;
  const startAngle = -spread / 2;
  const angle = startAngle + (spread / (totalCards - 1 || 1)) * index;
  const offset = ((index - (totalCards - 1) / 2) * 10);

  return (
    <div
      key={`opp-${index}`}
      className="opponent-card"
      style={{
        left: `calc(50% + ${offset}px)`,
        transform: `rotate(${angle}deg)`,
      }}
    >
      <div className="card-back"></div>
    </div>
  );
})}

  </div>
</div>


<Toast 
  message={toastMessage} 
  onClose={() => setToastMessage('')} 
/>


       {/* Game field */}
      <div className="game-field" ref={tableRef}>

        <div className="field-cards">
         {slots.length === 0 ? null : (
  slots.map(slot => (
    <div
      key={`slot-${slot.slotIndex}`}
      className="field-slot"
      data-slot={slot.slotIndex}
    >
      <div className="slot-attack">
        {slot.attack ? renderCard(slot.attack.card) : <div className="empty-attack-slot" />}
      </div>

 <div
  className={`slot-defend 
    ${slot.defend ? (String(slot.defend.player) === String(playerId) ? 'from-bottom' : 'from-top') : ''} 
    ${slot.defend && landedSlots.has(slot.slotIndex) ? 'landed' : ''}`}
  onTransitionEnd={(e) => handleSlotDefendEnd(e, slot.slotIndex)}
>
  {slot.defend ? renderCard(slot.defend.card) : null}
</div>





    </div>
  ))
)}

        </div>
        </div>

  



 {drawingCards.map(card => {
  const left = (card.hasLanded || card.isAnimating) ? card.targetX : card.startX;
  const top  = (card.hasLanded || card.isAnimating) ? card.targetY : card.startY;

  const style = {
    position: 'absolute',
    left: `${left}px`,
    top: `${top}px`,
    width: '60px',
    height: '84px',
    zIndex: 10500,
    pointerEvents: 'none',
    transition: `
      left 0.52s cubic-bezier(.22,.9,.28,1), 
      top 0.52s cubic-bezier(.22,.9,.28,1),
      opacity 0.3s ease-in-out
    `,
    willChange: 'left, top, transform, opacity',
    opacity: card.hasLanded ? 0 : 1 
  };

  return (
    <div
      key={card.id}
      className={`card-draw ${card.isAnimating ? 'animating' : ''}`}
      data-target-index={card.targetIndex}
      style={style}
    >
      {renderCard(card.card, false)}
    </div>
  );
})}


      
{/* Козырь — всегда на столе */}
{!['waiting', 'matched'].includes(roomState?.status) && (
<div className="trump-card">
  <div className="trump-display">
    {renderTrumpCard(trump, true)}
  </div>
</div>
)}

{/* Колода — только если есть карты */}
{deckCount > 0 && (
  <div className="deck-info">
    <div className="deck-display">
      <div className="deck-card">
        <img
          src="/frontend/images/card.png"
          alt="Колода"
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      <div className="deck-count">
        <span className={`trump-suit ${trump === '♥' || trump === '♦' ? 'red-suit' : 'black-suit'}`}>
          {trump}
        </span>
        <span className="deck-number">{deckCount}</span>
      </div>
    </div>
  </div>
)}



      <div className="player-area">
<PlayerLabel
        roomState={roomState}
        turnOwnerId={turnOwnerId}
        playerId={playerId}
        turnTimeLeft={turnTimeLeft}
        canPlayerPlay={canPlayerPlay}
        setGameVisible={setGameVisible}
      />


<div
  className="player-cards"
  ref={playerCardsRef}
  style={{
    height: uniquePlayerHand.length > 0 ? "100px" : "0px",
    margin: uniquePlayerHand.length > 0 ? "15px 0" : "0",
    transition: "height 0.4s ease, margin 0.4s ease", 
  }}
>

{uniquePlayerHand?.map((card, index) => {
  const cardId = getCardId(card);
  const isNewlyDrawn = newlyDrawnCards.includes(index);
  const isSelected = selectedCards.includes(cardId);
  const isDefending = defendingCards.some(animCard => animCard.defendIndex === index);

  const CARD_W = 60, GAP = 15;
  const total = uniquePlayerHand.length;
  const totalWidth = total * CARD_W + (total - 1) * GAP;
  const containerWidth = playerCardsRef.current?.offsetWidth || 0;
  const startX = (containerWidth - totalWidth) / 2 || 0;
  const cardLeft = startX + index * (CARD_W + GAP);

  const offsetFromCenter = Math.round(cardLeft - (containerWidth / 2));

  const lift = isSelected ? -12 : 0;
  const scale = isSelected ? 1.04 : 1;

  const transform = `translateX(${offsetFromCenter}px) translateY(${lift}px) scale(${scale})`;

  const zIndex = isSelected ? 200 : (isNewlyDrawn ? 3000 : 1000);

  const style = {
    position: 'absolute',
    left: '50%',    
    top: 0,
    transform,
    transition: 'transform 0.36s cubic-bezier(.22,.9,.28,1)', 
    zIndex
  };

  return (
    <div
      key={`card-${cardId}`}
      className={`player-card ${isSelected ? 'selected' : ''} ${isDefending ? 'defending' : ''} ${isNewlyDrawn ? 'newly-drawn' : ''} ${(!canPlayerPlay || isLoading) ? 'disabled' : ''}`}
      style={style}
      onClick={() => handleCardClick(cardId)}
    >
      {renderCard(card)}
    </div>
  );
})}

</div>
    {!['waiting', 'matched'].includes(roomState?.status) && (
  <div className="action-buttons">
    <button
      className="play-button"
      onClick={handlePlayCards}
      disabled={selectedCards.length === 0 || !canPlayerPlay || isLoading || animatingDefense}
    >
      {animatingDefense ? 'Ожидаем...' : (isLoading ? 'Отправка...' : 'Походить')}
    </button>
  </div>
)}

{['waiting', 'matched'].includes(roomState?.status) && (
  <div className="ready-button-container">
    <button
      className={`ready-button ${playerReady ? 'active' : ''}`}
      onClick={async () => {
        setPlayerReady(true);
        try {
          await fetch(`${back}/burkozel/ready`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ room_id: roomState?.room_id, tg_id: parseInt(playerId) })
          });
        } catch (err) {
          console.error('Ошибка отправки готовности:', err);
        }
      }}
      disabled={playerReady}
    >
      {playerReady ? 'Ожидаем соперника..' : 'Готов'}
    </button>
  </div>
)}




      </div>
    </div>
  );
});

export default Gamescreen;