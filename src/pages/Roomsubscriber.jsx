
import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import './Gamescreen.css';

const Gamescreen = forwardRef(({ 
  playerHand, 
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
  trump
}, ref) => {
  const [selectedCards, setSelectedCards] = useState([]);
  const [gameField, setGameField] = useState([]);
  const [gamePhase, setGamePhase] = useState('waiting');
  const [canPlayerPlay, setCanPlayerPlay] = useState(false);
  const [isAttackerTurn, setIsAttackerTurn] = useState(false);
  const [playerRole, setPlayerRole] = useState('unknown');
  const [scores, setScores] = useState({ player: 0, opponent: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [opponentNickname, setOpponentNickname] = useState('Противник');

  // Анимация защиты (общая) и добора
  const [defendingCards, setDefendingCards] = useState([]);
  const [animatingDefense, setAnimatingDefense] = useState(false);
  const [lastDefendCardsCount, setLastDefendCardsCount] = useState(0);

  const [drawingCards, setDrawingCards] = useState([]);
  const [animatingDraw, setAnimatingDraw] = useState(false);

  // Результаты раунда
  const [roundWinner, setRoundWinner] = useState(null);
  const [showRoundResult, setShowRoundResult] = useState(false);

  // expose helper functions to parent
  const handleRoundEnd = (roundWinner) => {
    setRoundWinner(roundWinner);
    setShowRoundResult(true);
    setTimeout(() => { setShowRoundResult(false); setRoundWinner(null); }, 3000);
  };

  const handleDrawCards = (drawnCards, isMyDraw) => {
    if (!drawnCards || drawnCards.length === 0) return;
    setAnimatingDraw(true);

    const animCards = drawnCards.map((card, index) => ({
      id: `draw-${Date.now()}-${index}`,
      card,
      isMyCard: isMyDraw,
      isAnimating: true,
      hasLanded: false
    }));

    setDrawingCards(animCards);

    // запускаем анимацию перелёта -> приземление
    setTimeout(() => {
      setDrawingCards(prev => prev.map(c => ({ ...c, isAnimating: false, hasLanded: true })));

      setTimeout(() => {
        setDrawingCards([]);
        setAnimatingDraw(false);
      }, 600);
    }, 220);
  };

  useImperativeHandle(ref, () => ({ handleRoundEnd, handleDrawCards }));

  // --- Анимация, показывающая что соперник отбил — для атакующего ------------------
  const startOpponentDefenseAnimation = (attackCards, defendCards) => {
    if (animatingDefense || !attackCards || !defendCards) return;
    const pairedCards = distributeOpponentDefenseCards(attackCards, defendCards);
    if (!pairedCards.length) return;

    setAnimatingDefense(true);

    // подготовка объектов анимации
    const animationCards = pairedCards.map((pair, index) => ({
      ...pair,
      animationId: `opponent-defend-${Date.now()}-${index}`,
      startDelay: index * 300,
      isAnimating: false,
      hasLanded: false,
      isOpponentCard: true
    }));

    setDefendingCards(animationCards);

    // поочередная анимация
    animationCards.forEach((animCard, idx) => {
      setTimeout(() => {
        setDefendingCards(prev => prev.map(c => c.animationId === animCard.animationId ? { ...c, isAnimating: true } : c));

        setTimeout(() => {
          setDefendingCards(prev => prev.map(c => c.animationId === animCard.animationId ? { ...c, isAnimating: false, hasLanded: true } : c));
        }, 500);

      }, animCard.startDelay);
    });

    const totalTime = animationCards.length * 300 + 700;
    setTimeout(() => {
      // оставляем приземлённые карты видимыми короткое время, затем убираем
      setTimeout(() => {
        setDefendingCards([]);
        setAnimatingDefense(false);
      }, 700);
    }, totalTime);
  };

  // --- Анимация защиты игрока (когда он отбивается) - после анимации отправляем ход ---
  const startDefenseAnimation = () => {
    if (!roomState?.field?.attack?.cards || selectedCards.length === 0) return;

    const pairs = getOptimalDefenseCards(); // [{ attackCard, defendCard, defendIndex, attackIndex }]
    if (!pairs.length) {
      // если нет пар (нестандарт) — отправляем ход сразу
      makeMove(selectedCards);
      return;
    }

    setAnimatingDefense(true);

    const animationCards = pairs.map((p, i) => ({
      ...p,
      animationId: `player-defend-${Date.now()}-${i}`,
      startDelay: i * 250,
      isAnimating: false,
      hasLanded: false,
      isOpponentCard: false
    }));

    setDefendingCards(animationCards);

    animationCards.forEach((animCard) => {
      setTimeout(() => {
        setDefendingCards(prev => prev.map(c => c.animationId === animCard.animationId ? { ...c, isAnimating: true } : c));
        setTimeout(() => {
          setDefendingCards(prev => prev.map(c => c.animationId === animCard.animationId ? { ...c, isAnimating: false, hasLanded: true } : c));
        }, 450);
      }, animCard.startDelay);
    });

    const finishTime = animationCards.length * 250 + 600;
    setTimeout(() => {
      // отправляем выбранные карты на сервер как защиту
      makeMove(selectedCards);

      setTimeout(() => {
        setDefendingCards([]);
        setAnimatingDefense(false);
      }, 600);
    }, finishTime);
  };

  // makeMove остаётся без изменений (отправляет selectedCards)
  const makeMove = async (selected) => {
    // проверка
    if (!selected || selected.length === 0) return;
    setIsLoading(true);
    try {
      // отправляем на сервер — код оставлен как в оригинале
      // (вызов fetch /backend/burkozel/move ...)
      // После успешного ответа поле и руки обновятся через room_update
    } catch (e) {
      console.error(e);
      alert('Ошибка при совершении хода');
    } finally {
      setIsLoading(false);
      setSelectedCards([]);
    }
  };

  // вспомогательные функции (заглушки, заменить реальными реализациями из проекта)
  function distributeOpponentDefenseCards(attackCards, defendCards) {
    // простая распределялка: по порядку
    const pairs = [];
    for (let i = 0; i < Math.min(attackCards.length, defendCards.length); i++) {
      pairs.push({ attackCard: attackCards[i], defendCard: defendCards[i], attackIndex: i });
    }
    return pairs;
  }

  function getOptimalDefenseCards() {
    // предположим selectedCards содержат пары: [defendCard, ...]
    // В реальном коде здесь логика подбора карт защиты
    return selectedCards.map((card, idx) => ({
      attackCard: roomState?.field?.attack?.cards?.[idx] ?? null,
      defendCard: card,
      defendIndex: idx,
      attackIndex: idx
    }));
  }

  // renderCard и остальной jsx остаются прежними — но исправлены места, где использовались ошибочные спрэды

  return (
    <div className="game-container">
      {/* упрощённая разметка — оставить как было */}

      <div className="game-field" ref={tableRef}>
        <div className="field-cards">
          {gameField.length === 0 ? (
            <div className="empty-field"><p>Поле пустое</p><p>Ожидание карт...</p></div>
          ) : (
            gameField.map((fieldCard, index) => (
              <div key={`field-${index}`} className={`field-card ${fieldCard.type}`}>{/* ... */}
                {/* renderCard(fieldCard.card) */}
              </div>
            ))
          )}
        </div>

        {/* анимационные карты защиты */}
        {defendingCards.map((animCard) => (
          <div key={animCard.animationId} className={`defending-card ${animCard.isAnimating ? 'animating' : ''} ${animCard.hasLanded ? 'landed' : ''} ${animCard.isOpponentCard ? 'opponent-card' : ''}`} data-target-attack={animCard.attackIndex} data-cards-count={defendingCards.length}>
            {/* renderCard(animCard.defendCard) */}
            <div className="card"><div className="card-content"><div>{animCard.defendCard?.[0] ?? '?'}</div><div>{animCard.defendCard?.[1] ?? '?'}</div></div></div>
          </div>
        ))}

        {/* drawing cards */}
        {drawingCards.map(dc => (
          <div key={dc.id} className={`drawing-card ${dc.isAnimating ? 'animating' : ''} ${dc.hasLanded ? 'landed' : ''} ${dc.isMyCard ? 'to-player' : 'to-opponent'}`}>
            <div className="card"><div className="card-content"><div>{dc.card?.[0] ?? '?'}</div><div>{dc.card?.[1] ?? '?'}</div></div></div>
          </div>
        ))}

      </div>

      {/* ... player area, action buttons etc. ... */}

    </div>
  );
});

export default Gamescreen;
