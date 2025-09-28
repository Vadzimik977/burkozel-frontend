import { useEffect, useRef } from "react";

export default function GameHandAnimator({ playerHand, opponentHandCount, handleDrawCards }) {
  const prevHandCountRef = useRef(null);
  const prevOppCountRef = useRef(null);

  useEffect(() => {
    const newCount = playerHand?.length || 0;
    const prevCount = prevHandCountRef.current;

    if (prevCount !== null && newCount > prevCount) {
      const diff = newCount - prevCount;
      const newCards = playerHand.slice(-diff);
      console.log("🎬 Анимация добора моих карт:", newCards);
      handleDrawCards(newCards, true);
    }

    prevHandCountRef.current = newCount;

    const newOppCount = opponentHandCount || 0;
    const prevOppCount = prevOppCountRef.current;

    if (prevOppCount !== null && newOppCount > prevOppCount) {
      const diff = newOppCount - prevOppCount;
      console.log("🎬 Анимация добора соперника:", diff);
      handleDrawCards(Array(diff).fill(["?", "?"]), false);
    }

    prevOppCountRef.current = newOppCount;
  }, [playerHand?.length, opponentHandCount, handleDrawCards]);

  return null; 
}
