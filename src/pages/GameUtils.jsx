
export class BurkozelGame {
  constructor() {
    this.suits = ['♠', '♣', '♦', '♥'];
    this.ranks = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    this.cardPoints = {
      'A': 11,
      '10': 10, 
      'K': 4,
      'Q': 3,
      'J': 2,
      '9': 0,
      '8': 0,
      '7': 0,
      '6': 0
    };
    this.cardValues = {
      '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
      'J': 11, 'Q': 12, 'K': 13, 'A': 14
    };
  }


  getCardPoints(card) {
    if (!card || !card[0]) return 0;
    return this.cardPoints[card[0]] || 0;
  }


  getCardValue(card) {
    if (!card || !card[0]) return 0;
    return this.cardValues[card[0]] || 0;
  }


  canDefend(attackCard, defendCard, trump) {
    if (!attackCard || !defendCard) return false;
    
    const attackSuit = attackCard[1];
    const defendSuit = defendCard[1];
    const attackValue = this.getCardValue(attackCard);
    const defendValue = this.getCardValue(defendCard);
    

    if (attackSuit === defendSuit && defendValue > attackValue) {
      return true;
    }
    
    if (attackSuit !== trump && defendSuit === trump) {
      return true;
    }
 
    if (attackSuit === trump && defendSuit === trump && defendValue > attackValue) {
      return true;
    }
    
    return false;
  }


  isSameSuit(cards) {
    if (cards.length <= 1) return true;
    const firstSuit = cards[0][1];
    return cards.every(card => card[1] === firstSuit);
  }


  calculatePoints(cards) {
    return cards.reduce((sum, card) => sum + this.getCardPoints(card), 0);
  }


  createDeck() {
    const deck = [];
    for (const suit of this.suits) {
      for (const rank of this.ranks) {
        deck.push([rank, suit]);
      }
    }
    return deck;
  }


  shuffleDeck(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }


  dealCards(deck, playerCount = 2, cardsPerPlayer = 6) {
    const hands = Array(playerCount).fill().map(() => []);
    let cardIndex = 0;
    
    for (let round = 0; round < cardsPerPlayer; round++) {
      for (let player = 0; player < playerCount; player++) {
        if (cardIndex < deck.length) {
          hands[player].push(deck[cardIndex++]);
        }
      }
    }
    
    return {
      hands,
      remainingDeck: deck.slice(cardIndex),
      trump: deck[cardIndex] 
    };
  }

  findMinimumTrump(hand, trump) {
    const trumpCards = hand.filter(card => card[1] === trump);
    if (trumpCards.length === 0) return null;
    
    return trumpCards.reduce((min, card) => 
      this.getCardValue(card) < this.getCardValue(min) ? card : min
    );
  }

  getPossibleMoves(hand, tableCards = []) {
    if (tableCards.length === 0) {
      const moves = [];
      const groupedBySuit = {};
      
      hand.forEach((card, index) => {
        const suit = card[1];
        if (!groupedBySuit[suit]) {
          groupedBySuit[suit] = [];
        }
        groupedBySuit[suit].push({ card, index });
      });
      
      Object.values(groupedBySuit).forEach(suitCards => {
        for (let i = 1; i <= suitCards.length; i++) {
          const combinations = this.getCombinations(suitCards, i);
          moves.push(...combinations);
        }
      });
      
      return moves;
    } else {
      const tableRanks = new Set(tableCards.map(card => card[0]));
      return hand
        .map((card, index) => ({ card, index }))
        .filter(({ card }) => tableRanks.has(card[0]));
    }
  }

  getCombinations(array, size) {
    if (size === 1) return array.map(item => [item]);
    
    const combinations = [];
    for (let i = 0; i <= array.length - size; i++) {
      const head = array[i];
      const tailCombinations = this.getCombinations(array.slice(i + 1), size - 1);
      tailCombinations.forEach(combination => {
        combinations.push([head, ...combination]);
      });
    }
    return combinations;
  }

  checkGameEnd(playerScores, maxScore = 12) {
    for (const [player, score] of Object.entries(playerScores)) {
      if (score >= maxScore) {
        return {
          gameEnded: true,
          loser: player,
          scores: playerScores
        };
      }
    }
    return { gameEnded: false, scores: playerScores };
  }

  getFirstMoveCard(hand, trump) {

    const trumps = hand.filter(card => card[1] === trump);
    if (trumps.length > 0) {
      return trumps.reduce((min, card) => 
        this.getCardValue(card) < this.getCardValue(min) ? card : min
      );
    }
    
    return hand.reduce((min, card) => 
      this.getCardValue(card) < this.getCardValue(min) ? card : min
    );
  }
}


export class AnimationUtils {
  static async animateCardMove(fromElement, toElement, cardElement, duration = 500) {
    if (!fromElement || !toElement || !cardElement) return;
    
    const fromRect = fromElement.getBoundingClientRect();
    const toRect = toElement.getBoundingClientRect();
    
    const startX = fromRect.left + fromRect.width / 2;
    const startY = fromRect.top + fromRect.height / 2;
    const endX = toRect.left + toRect.width / 2;
    const endY = toRect.top + toRect.height / 2;
    
    cardElement.style.position = 'fixed';
    cardElement.style.left = startX + 'px';
    cardElement.style.top = startY + 'px';
    cardElement.style.zIndex = '9999';
    cardElement.style.transition = `all ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
    
    requestAnimationFrame(() => {
      cardElement.style.left = endX + 'px';
      cardElement.style.top = endY + 'px';
    });
    
    return new Promise(resolve => {
      setTimeout(resolve, duration);
    });
  }
  
  static createFloatingText(text, element, color = '#00ff00') {
    const floatingText = document.createElement('div');
    floatingText.textContent = text;
    floatingText.style.cssText = `
      position: fixed;
      color: ${color};
      font-weight: bold;
      font-size: 18px;
      pointer-events: none;
      z-index: 10000;
      transition: all 1s ease-out;
    `;
    
    const rect = element.getBoundingClientRect();
    floatingText.style.left = (rect.left + rect.width / 2) + 'px';
    floatingText.style.top = rect.top + 'px';
    
    document.body.appendChild(floatingText);
    
    // Анимация
    requestAnimationFrame(() => {
      floatingText.style.transform = 'translateY(-50px)';
      floatingText.style.opacity = '0';
    });
    
    setTimeout(() => {
      document.body.removeChild(floatingText);
    }, 1000);
  }
}


export class SoundEffects {
  constructor() {
    this.context = null;
    try {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }
  
  playCardFlip() {
    if (!this.context) return;
    
    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.context.destination);
    
    oscillator.frequency.setValueAtTime(800, this.context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, this.context.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.1, this.context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.1);
    
    oscillator.start(this.context.currentTime);
    oscillator.stop(this.context.currentTime + 0.1);
  }
  
  playCardPlace() {
    if (!this.context) return;
    
    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.context.destination);
    
    oscillator.frequency.setValueAtTime(300, this.context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, this.context.currentTime + 0.15);
    
    gainNode.gain.setValueAtTime(0.15, this.context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.15);
    
    oscillator.start(this.context.currentTime);
    oscillator.stop(this.context.currentTime + 0.15);
  }
  
  playWin() {
    if (!this.context) return;
    
    const frequencies = [523, 659, 784, 1047];
    frequencies.forEach((freq, index) => {
      setTimeout(() => {
        const oscillator = this.context.createOscillator();
        const gainNode = this.context.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.context.destination);
        
        oscillator.frequency.setValueAtTime(freq, this.context.currentTime);
        gainNode.gain.setValueAtTime(0.1, this.context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.3);
        
        oscillator.start(this.context.currentTime);
        oscillator.stop(this.context.currentTime + 0.3);
      }, index * 100);
    });
  }
  
  playLose() {
    if (!this.context) return;
    
    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.context.destination);
    
    oscillator.frequency.setValueAtTime(200, this.context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, this.context.currentTime + 0.5);
    
    gainNode.gain.setValueAtTime(0.2, this.context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.5);
    
    oscillator.start(this.context.currentTime);
    oscillator.stop(this.context.currentTime + 0.5);
  }
}


export const CARD_VALUES = {
  'A': 11,   
  '10': 10,  
  'K': 4,     
  'Q': 3,    
  'J': 2,    
  '9': 0, '8': 0, '7': 0, '6': 0  
};


export function calculateScore(cards) {
  if (!Array.isArray(cards)) return 0;
  return cards.reduce((sum, card) => {
    if (!card || !card[0]) return sum;
    return sum + (CARD_VALUES[card[0]] || 0);
  }, 0);
}


export function isSameSuit(cards) {
  if (!Array.isArray(cards) || cards.length <= 1) return true;
  const firstSuit = cards[0] && cards[0][1];
  if (!firstSuit) return false;
  return cards.every(card => card && card[1] === firstSuit);
}


export function getCardValue(card) {
  if (!card || !card[0]) return 0;
  const cardValues = {
    '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11, 'Q': 12, 'K': 13, 'A': 14
  };
  return cardValues[card[0]] || 0;
}


export function canDefend(attackCard, defendCard, trump) {
  if (!attackCard || !defendCard) return false;
  
  const attackSuit = attackCard[1];
  const defendSuit = defendCard[1];
  const attackValue = getCardValue(attackCard);
  const defendValue = getCardValue(defendCard);
  
  if (attackSuit === defendSuit && defendValue > attackValue) {
    return true;
  }
  
  if (attackSuit !== trump && defendSuit === trump) {
    return true;
  }
  

  if (attackSuit === trump && defendSuit === trump && defendValue > attackValue) {
    return true;
  }
  
  return false;
}

export default BurkozelGame;
