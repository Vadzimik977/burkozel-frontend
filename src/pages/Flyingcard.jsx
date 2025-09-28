
export default function FlyingCards({ cards = [] }) {
  return (
    <div className="flying-cards-layer" style={{ position: 'fixed', left:0, top:0, right:0, bottom:0, pointerEvents: 'none' }}>
      {cards.map(c => {
        const card = c.card;
        const left = c.x; const top = c.y;
        return (
          <div key={c.id} className="flying-card" style={{ position:'absolute', left, top, width:60, height:84 }}>
            {Array.isArray(card) && card.length >= 2 ? (
           
              <div className="card-face">{/* render rank/suit like in Gamescreen.renderCard */}</div>
            ) : (
            
              <img src="/frontend/images/card-back.png" alt="back" />
            )}
          </div>
        );
      })}
    </div>
  );
}
