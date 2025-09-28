import { useState, useEffect } from 'react';

const PlayerLabel = ({
  roomState,
  turnOwnerId,
  playerId,
  turnTimeLeft,
  canPlayerPlay,
  setGameVisible
}) => {
  const [waitingTime, setWaitingTime] = useState(60); 

  useEffect(() => {
    if (!['waiting', 'matched'].includes(roomState?.status)) return;

    const interval = setInterval(() => {
      setWaitingTime(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setGameVisible(false); 
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [roomState?.status, setGameVisible]);

  return (
    <div className="player-label">
      {['waiting', 'matched'].includes(roomState?.status) ? (
        <>Готовы? {waitingTime > 0 && <span>(0:{String(waitingTime).padStart(2, "0")})</span>}</>
      ) : turnOwnerId === String(playerId) ? (
        <>Ваш ход {turnTimeLeft > 0 && <span>(0:{String(turnTimeLeft).padStart(2, "0")})</span>}</>
      ) : turnOwnerId ? (
        <>Ход противника {turnTimeLeft > 0 && <span>(0:{String(turnTimeLeft).padStart(2, "0")})</span>}</>
      ) : (
        canPlayerPlay ? 'Ваш ход' : 'Ход противника'
      )}
    </div>
  );
};

export default PlayerLabel;
